import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

export const firebaseConfig = {
    apiKey: 'AIzaSyBW6kr9HflJP9K0zND-iizcg7-WrKYpQX4',
    authDomain: 'safora-6b118.firebaseapp.com',
    projectId: 'safora-6b118',
    storageBucket: 'safora-6b118.firebasestorage.app',
    messagingSenderId: '336709982394',
    appId: '1:336709982394:web:489e4a73880e75b60aca83',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
// Use standard getAuth — we handle our own session via JWT + AsyncStorage
export const firebaseAuth = getAuth(app);
export default app;
