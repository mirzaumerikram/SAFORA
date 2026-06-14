/**
 * SAFORA — Firebase Cloud Messaging (FCM) Notification Service
 * Sends push notifications to passengers and drivers via Firebase Admin SDK.
 * Falls back gracefully if FCM is not configured (so it never crashes the server).
 *
 * Credentials: Read from FIREBASE_SERVICE_ACCOUNT env var on Railway (JSON string),
 * or from local config/serviceAccountKey.json for local development.
 */

let admin = null;

// Initialise Firebase Admin — try env var first (Railway), then local JSON file
try {
    admin = require('firebase-admin');

    if (!admin.apps.length) {
        let credential;

        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            // Production (Railway): credentials stored as JSON string in env var
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            credential = admin.credential.cert(serviceAccount);
            console.log('[FCM] ✅ Firebase Admin initialised from FIREBASE_SERVICE_ACCOUNT env var');
        } else {
            // Local development: credentials from JSON file
            const serviceAccount = require('../config/serviceAccountKey.json');
            credential = admin.credential.cert(serviceAccount);
            console.log('[FCM] ✅ Firebase Admin initialised from serviceAccountKey.json');
        }

        admin.initializeApp({ credential });
    }
} catch (err) {
    console.warn('[FCM] ⚠️  Firebase Admin not configured — push notifications disabled:', err.message);
}

/**
 * Send a push notification to a single FCM token.
 * @param {string} fcmToken  — The device token stored in User/Driver document
 * @param {string} title     — Notification title
 * @param {string} body      — Notification body text
 * @param {object} data      — Optional key-value payload for the app to handle
 */
async function sendPushNotification(fcmToken, title, body, data = {}) {
    if (!admin || !fcmToken) return;   // Graceful no-op if not configured

    const message = {
        token: fcmToken,
        notification: { title, body },
        data: Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v)])  // FCM data must be strings
        ),
        android: {
            priority: 'high',
            notification: {
                sound: 'default',
                channelId: 'safora_default',
            },
        },
        apns: {
            payload: {
                aps: { sound: 'default', badge: 1 },
            },
        },
        webpush: {
            headers: { Urgency: 'high' },
            notification: {
                icon: '/logo192.png',
                badge: '/badge.png',
                requireInteraction: false,
            },
        },
    };

    try {
        const response = await admin.messaging().send(message);
        console.log(`[FCM] ✅ Notification sent: "${title}" → token ...${fcmToken.slice(-8)} | msgId: ${response}`);
        return response;
    } catch (err) {
        // Log but never throw — a failed notification should not break the ride flow
        console.error(`[FCM] ❌ Failed to send "${title}":`, err.code, err.message);
    }
}

// ─── Pre-built notification helpers for key SAFORA events ────────────────────

/**
 * Notify passenger: driver has accepted their ride request.
 * @param {string} fcmToken  — Passenger's FCM token
 * @param {string} driverName
 * @param {string} rideId
 */
async function notifyRideAccepted(fcmToken, driverName, rideId) {
    return sendPushNotification(
        fcmToken,
        '🚗 Driver is on the way!',
        `${driverName} has accepted your ride. Track them live in the app.`,
        { rideId, event: 'ride_accepted' }
    );
}

/**
 * Notify passenger: driver has arrived at pickup location.
 * @param {string} fcmToken  — Passenger's FCM token
 * @param {string} driverName
 * @param {string} rideId
 */
async function notifyDriverArrived(fcmToken, driverName, rideId) {
    return sendPushNotification(
        fcmToken,
        '📍 Your driver has arrived!',
        `${driverName} is waiting at your pickup location.`,
        { rideId, event: 'driver_arrived' }
    );
}

/**
 * Notify passenger: ride is now complete.
 * @param {string} fcmToken  — Passenger's FCM token
 * @param {number} fare      — Final ride fare in PKR
 * @param {string} rideId
 */
async function notifyRideCompleted(fcmToken, fare, rideId) {
    return sendPushNotification(
        fcmToken,
        '✅ Ride Complete!',
        `Your ride is finished. Fare: Rs. ${fare}. Please rate your driver.`,
        { rideId, event: 'ride_completed', fare: String(fare) }
    );
}

/**
 * Notify driver: a new ride request is available.
 * @param {string} fcmToken     — Driver's FCM token
 * @param {string} pickup       — Pickup address/area
 * @param {string} rideId
 */
async function notifyNewRideRequest(fcmToken, pickup, rideId) {
    return sendPushNotification(
        fcmToken,
        '🔔 New Ride Request!',
        `Pickup: ${pickup}. Open SAFORA to accept.`,
        { rideId, event: 'new_ride_request' }
    );
}

/**
 * Notify passenger: SafetySentinel detected a route deviation (SOS).
 * @param {string} fcmToken  — Passenger's FCM token
 * @param {string} rideId
 */
async function notifySOSAlert(fcmToken, rideId) {
    return sendPushNotification(
        fcmToken,
        '🚨 SAFETY ALERT!',
        'SafetySentinel detected a route deviation. Open the app immediately.',
        { rideId, event: 'sos_alert' }
    );
}

/**
 * Notify recipient: new chat message received.
 * @param {string} fcmToken  — Recipient's FCM token
 * @param {string} senderName
 * @param {string} messageText
 * @param {string} rideId
 */
async function notifyNewMessage(fcmToken, senderName, messageText, rideId) {
    return sendPushNotification(
        fcmToken,
        `💬 New message from ${senderName}`,
        messageText,
        { rideId, event: 'new_message' }
    );
}

module.exports = {
    sendPushNotification,
    notifyRideAccepted,
    notifyDriverArrived,
    notifyRideCompleted,
    notifyNewRideRequest,
    notifySOSAlert,
    notifyNewMessage,
};
