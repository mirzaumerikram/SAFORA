import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBW6kr9HflJP9K0zND-iizcg7-WrKYpQX4",
  authDomain: "safora-6b118.firebaseapp.com",
  projectId: "safora-6b118",
  storageBucket: "safora-6b118.firebasestorage.app",
  messagingSenderId: "336709982394",
  appId: "1:336709982394:web:489e4a73880e75b60aca83",
  measurementId: "G-VP8Y5BNESX"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

/**
 * Wait for a specific SW registration's active worker — NOT navigator.serviceWorker.ready,
 * which resolves to whatever SW controls the page (possibly Expo's, not Firebase's).
 */
function waitForActive(reg: ServiceWorkerRegistration, timeoutMs = 6000): Promise<void> {
    return new Promise((resolve, reject) => {
        if (reg.active) { resolve(); return; }
        const timer = setTimeout(() => reject(new Error('Service worker activation timed out')), timeoutMs);
        const sw = reg.installing ?? reg.waiting;
        if (!sw) { clearTimeout(timer); resolve(); return; }
        const handler = () => {
            if (sw.state === 'activated') {
                clearTimeout(timer);
                sw.removeEventListener('statechange', handler);
                resolve();
            } else if (sw.state === 'redundant') {
                clearTimeout(timer);
                sw.removeEventListener('statechange', handler);
                reject(new Error('Service worker became redundant'));
            }
        };
        sw.addEventListener('statechange', handler);
    });
}

/**
 * Request Web Push permission and return an FCM token.
 * Throws a descriptive Error for every failure so callers can surface the real reason.
 */
export const requestWebPushPermission = async (vapidKey: string): Promise<string> => {
    // ── 1. Browser support ────────────────────────────────────────────────────
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Web Push is not supported in this browser. Try Chrome or Edge on HTTPS.');
    }

    const supported = await isSupported();
    if (!supported) {
        throw new Error('Firebase Messaging is not supported in this browser (requires HTTPS + modern browser).');
    }

    // ── 2. Permission ─────────────────────────────────────────────────────────
    if (Notification.permission === 'denied') {
        throw new Error(
            'Notifications are blocked in your browser settings.\n' +
            'Click the 🔒 icon in the address bar → Site settings → Notifications → Allow, then retry.'
        );
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        throw new Error('Notification permission was not granted. Please allow notifications when prompted.');
    }

    // ── 3. Service Worker ─────────────────────────────────────────────────────
    const messaging = getMessaging(app);

    // Register the firebase SW with a stable URL (no version suffix) so we always
    // get the same registration and FCM can match it to the stored token.
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    // Wait for THIS registration's worker to activate — not navigator.serviceWorker.ready,
    // which could resolve to Expo's SW and cause getToken to use the wrong registration.
    await waitForActive(registration);

    // ── 4. FCM Token ──────────────────────────────────────────────────────────
    const currentToken = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
    });

    if (!currentToken) {
        throw new Error(
            'FCM returned an empty token. Possible causes:\n' +
            '• VAPID key mismatch (check Firebase Console → Project Settings → Cloud Messaging → Web Push certificates)\n' +
            '• Service worker scope or URL mismatch\n' +
            '• Firebase project not properly configured for Web Push'
        );
    }

    console.log('[FCM] Web push token:', currentToken.slice(0, 20) + '...');
    return currentToken;
};

/**
 * Start listening for FCM messages while the app is in the foreground.
 * The service worker handles background messages; this handles foreground ones.
 * Call once after the user is authenticated. Returns a cleanup / unsubscribe fn.
 */
export const setupForegroundNotifications = (): (() => void) => {
    try {
        const messaging = getMessaging(app);
        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('[FCM] Foreground message received:', payload);
            if (Notification.permission !== 'granted') return;

            const title = payload.notification?.title ?? 'SAFORA';
            const body  = payload.notification?.body  ?? '';
            const icon  = payload.notification?.icon  ?? '/favicon.png';

            // Show a system notification even while the app tab is active
            new Notification(title, { body, icon });
        });
        return unsubscribe;
    } catch {
        return () => {};
    }
};
