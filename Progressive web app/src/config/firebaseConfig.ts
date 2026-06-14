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
        
        // Ensure service worker is registered
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        
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
        alert(`[Diagnostic] Firebase Push Error: ${err.message || err}`);
        return null;
    }
};
