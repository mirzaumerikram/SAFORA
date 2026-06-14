/**
 * SAFORA — Push Notification Registration Utility (Frontend)
 * Registers the device for push notifications and sends the FCM token to backend.
 *
 * Works on:
 *  - Android (native Expo build)
 *  - Chrome on Android (PWA — Web Push)
 *
 * Falls back silently on web browsers that do not support push notifications.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { requestWebPushPermission } from '../config/firebaseConfig';

const VAPID_KEY = 'BHbleD9619CObtUCgP3t6i7eVTMdT2JasW_ElepKn9YIsWww9psRFFTGlbKsTyK9R_AfozPBw6n4n-i1YjwlJjk';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

/**
 * Request notification permissions and get the Expo/FCM push token.
 * Then save it to the SAFORA backend so the server can push to this device.
 *
 * @param {string} authToken  — JWT token for the authenticated user
 * @param {string} role       — 'passenger' | 'driver'
 */
export async function registerForPushNotifications(authToken, role = 'passenger') {
    try {
        // 1. Check & request permission
        let token;

        if (Platform.OS === 'web') {
            // Use standard Firebase JS SDK for Web Push
            token = await requestWebPushPermission(VAPID_KEY);
            if (!token) return null;
        } else {
            // Use Expo Notifications for Native (Android/iOS)
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('[FCM] Push notification permission denied by user');
                return null;
            }

            try {
                const tokenData = await Notifications.getExpoPushTokenAsync({
                    projectId: 'safora-6b118',
                });
                token = tokenData.data;
            } catch (tokenErr) {
                console.log('[FCM] Expo push token unavailable, trying device token:', tokenErr.message);
                try {
                    const deviceToken = await Notifications.getDevicePushTokenAsync();
                    token = deviceToken.data;
                } catch (err) {
                    console.log('[FCM] Device push token also unavailable:', err.message);
                    return null;
                }
            }
        }

        if (!token) {
            console.log('[FCM] No push token available on this device');
            return null;
        }

        console.log('[FCM] Push token obtained:', token.slice(0, 30) + '...');

        // 3. Check if token already saved (avoid unnecessary API calls)
        const savedToken = await AsyncStorage.getItem('@safora_fcm_token');
        if (savedToken === token) {
            console.log('[FCM] Token already up-to-date, skipping save');
            return token;
        }

        // 4. Send token to SAFORA backend
        const response = await fetch(`${API_BASE_URL}/api/auth/fcm-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ fcmToken: token, role }),
        });

        if (response.ok) {
            await AsyncStorage.setItem('@safora_fcm_token', token);
            console.log('[FCM] ✅ Push token saved to backend successfully');
        } else {
            console.error('[FCM] ❌ Failed to save token to backend:', response.status);
        }

        // 5. Android-specific: create notification channel
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('safora_default', {
                name: 'SAFORA Notifications',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FFD700',
                sound: 'default',
            });
        }

        return token;
    } catch (error) {
        // Never crash the app if notifications fail
        console.error('[FCM] registerForPushNotifications error:', error.message);
        return null;
    }
}

/**
 * Add a listener that fires when a notification is received while the app is open.
 * Returns an unsubscribe function — call it on component unmount.
 */
export function addNotificationReceivedListener(handler) {
    const subscription = Notifications.addNotificationReceivedListener(handler);
    return () => subscription.remove();
}

/**
 * Add a listener that fires when the user taps a notification.
 * Returns an unsubscribe function — call it on component unmount.
 */
export function addNotificationResponseListener(handler) {
    const subscription = Notifications.addNotificationResponseReceivedListener(handler);
    return () => subscription.remove();
}
