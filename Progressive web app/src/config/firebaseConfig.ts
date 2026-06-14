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

export const requestWebPushPermission = async (vapidKey: string) => {
    try {
        const supported = await isSupported();
        if (!supported) {
            alert('[Diagnostic] Firebase Web Push is NOT supported by this browser. Are you on HTTPS?');
            return null;
        }
        
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('[Firebase] Permission not granted for Notification');
            alert('To receive push notifications, please click the padlock icon in your browser URL bar, go to Site Settings, and Allow Notifications.');
            return null;
        }

        const messaging = getMessaging(app);
        
        // Ensure service worker is registered and ACTIVE before getting token
        // Use ?v=3 to bypass browser cache so the user does NOT need to clear data!
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js?v=3');
        await navigator.serviceWorker.ready;
        
        const currentToken = await getToken(messaging, { 
            vapidKey,
            serviceWorkerRegistration: registration 
        });

        if (currentToken) {
            console.log('[Firebase] Web Push Token:', currentToken);
            return currentToken;
        } else {
            alert('[Diagnostic] Web Push Token was empty after requesting.');
            return null;
        }
    } catch (err: any) {
        console.error(`[Firebase Push Error]:`, err);
        // We log instead of alert to prevent blocking the UI/map loading
        return null;
    }
};
