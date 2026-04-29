// API Configuration — auto-detects PC vs mobile browser
// PC browser (localhost) → uses localhost:5000
// Phone browser (192.168.x.x) → uses the same host's port 5000
const WIFI_IP = '192.168.43.47';

const getApiHost = (): string => {
    if (typeof window !== 'undefined') {
        const h = window.location.hostname;
        if (h === 'localhost' || h === '127.0.0.1') return 'localhost';
        return WIFI_IP;
    }
    return WIFI_IP; // native mobile
};

const API_HOST = getApiHost();

export const API_CONFIG = {
    BASE_URL: `http://${API_HOST}:5000/api`,
    AI_SERVICE_URL: `http://${API_HOST}:5001/api`,
    TIMEOUT: 10000,
};

// Auth endpoints
export const AUTH_ENDPOINTS = {
    REGISTER: '/auth/register',
    COMPLETE_PROFILE: '/auth/complete-profile',
    LOGIN: '/auth/login',
    PROFILE: '/auth/me',
    SEND_OTP: '/auth/send-otp',
    VERIFY_OTP: '/auth/verify-otp',
};

// Ride endpoints
export const RIDE_ENDPOINTS = {
    REQUEST: '/rides/request',
    HISTORY: '/rides/history',
    CURRENT: '/rides/current',
    CANCEL: '/rides/cancel',
};

// Pink Pass endpoints
export const PINK_PASS_ENDPOINTS = {
    ENROLL: '/pink-pass/enroll',
    VERIFY: '/pink-pass/verify',
    STATUS: '/pink-pass/status',
};

// Safety endpoints
export const SAFETY_ENDPOINTS = {
    ALERT: '/safety/alert',
    SOS: '/safety/sos',
    ALERTS: '/safety/alerts',
    RESOLVE: '/safety/alerts',
};

// Payment endpoints
export const PAYMENT_ENDPOINTS = {
    CASH:          '/payment/cash',
    CREATE_INTENT: '/payment/create-intent',
    CONFIRM:       '/payment/confirm',
    STATUS:        '/payment/status',
};

// Driver endpoints
export const DRIVER_ENDPOINTS = {
    REGISTER: '/drivers/register',
    STATUS:   '/drivers/status',
    LOCATION: '/drivers/location',
    NEARBY:   '/drivers/nearby',
};

// Storage keys
export const STORAGE_KEYS = {
    AUTH_TOKEN: '@safora_auth_token',
    USER_DATA: '@safora_user_data',
    ONBOARDING_COMPLETED: '@safora_onboarding_completed',
};

// App constants
export const APP_CONSTANTS = {
    APP_NAME: 'SAFORA',
    APP_VERSION: '1.0.0',
    MIN_PASSWORD_LENGTH: 8,
    PHONE_REGEX: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};
