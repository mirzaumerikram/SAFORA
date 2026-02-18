// API Configuration
export const API_CONFIG = {
    BASE_URL: 'http://192.168.1.3:5000/api',
    AI_SERVICE_URL: 'http://192.168.1.3:5001/api',
    TIMEOUT: 10000,
};

// Auth endpoints
export const AUTH_ENDPOINTS = {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    PROFILE: '/auth/profile',
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
