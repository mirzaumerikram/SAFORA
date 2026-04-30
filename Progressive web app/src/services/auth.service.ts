import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from './api';
import { AUTH_ENDPOINTS, STORAGE_KEYS } from '../utils/constants';

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    name: string;
    email: string;
    phone: string;
    password: string;
}

export interface AuthResponse {
    success: boolean;
    token: string;
    isNewUser?: boolean;
    user: {
        id: string;
        name: string;
        email: string;
        phone: string;
        role: string;
    };
}

export interface OTPResponse {
    success: boolean;
    message: string;
    isNewUser?: boolean;
    otp?: string;
}

class AuthService {
    async sendOTP(phone: string): Promise<OTPResponse> {
        try {
            return await apiService.post<OTPResponse>(
                AUTH_ENDPOINTS.SEND_OTP,
                { phone }
            );
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async verifyOTP(phone: string, otp: string): Promise<AuthResponse> {
        try {
            const response = await apiService.post<AuthResponse>(
                AUTH_ENDPOINTS.VERIFY_OTP,
                { phone, otp }
            );

            if (response.success && response.token) {
                await this.saveAuthData(response.token, response.user);
            }

            return response;
        } catch (error) {
            throw this.handleError(error);
        }
    }
    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        try {
            const response = await apiService.post<AuthResponse>(
                AUTH_ENDPOINTS.LOGIN,
                credentials
            );

            if (response.success && response.token) {
                await this.saveAuthData(response.token, response.user);
            }

            return response;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async verifyFirebaseToken(idToken: string): Promise<AuthResponse> {
        try {
            const response = await apiService.post<AuthResponse>(
                '/auth/verify-firebase-token',
                { idToken }
            );
            if (response.success && response.token) {
                await this.saveAuthData(response.token, response.user);
            }
            return response;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async register(data: RegisterData): Promise<AuthResponse> {
        try {
            const response = await apiService.post<AuthResponse>(
                AUTH_ENDPOINTS.REGISTER,
                { ...data, role: 'passenger' }
            );

            if (response.success && response.token) {
                await this.saveAuthData(response.token, response.user);
            }

            return response;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async logout(): Promise<void> {
        try {
            await AsyncStorage.multiRemove([
                STORAGE_KEYS.AUTH_TOKEN,
                STORAGE_KEYS.USER_DATA,
            ]);
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    async getAuthToken(): Promise<string | null> {
        try {
            return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        } catch (error) {
            console.error('Get auth token error:', error);
            return null;
        }
    }

    async getUserData(): Promise<any | null> {
        try {
            const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Get user data error:', error);
            return null;
        }
    }

    async isAuthenticated(): Promise<boolean> {
        const token = await this.getAuthToken();
        return !!token;
    }

    private async saveAuthData(token: string, user: any): Promise<void> {
        try {
            await AsyncStorage.multiSet([
                [STORAGE_KEYS.AUTH_TOKEN, token],
                [STORAGE_KEYS.USER_DATA, JSON.stringify(user)],
            ]);
        } catch (error) {
            console.error('Save auth data error:', error);
            throw error;
        }
    }

    private handleError(error: any): Error {
        if (error.response) {
            // Server responded with error
            const message = error.response.data?.message || 'Authentication failed';
            return new Error(message);
        } else if (error.request) {
            // Request made but no response
            return new Error('Network error. Please check your connection.');
        } else {
            // Something else happened
            return new Error(error.message || 'An unexpected error occurred');
        }
    }
}

export default new AuthService();
