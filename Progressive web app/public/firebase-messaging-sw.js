importScripts('https://www.gstatic.com/firebasejs/12.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.14.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBW6kr9HflJP9K0zND-iizcg7-WrKYpQX4",
  authDomain: "safora-6b118.firebaseapp.com",
  projectId: "safora-6b118",
  storageBucket: "safora-6b118.firebasestorage.app",
  messagingSenderId: "336709982394",
  appId: "1:336709982394:web:489e4a73880e75b60aca83",
  measurementId: "G-VP8Y5BNESX"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Force the service worker to activate immediately instead of waiting for all tabs to close
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.png'
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});
