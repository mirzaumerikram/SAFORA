import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, STORAGE_KEYS } from '../utils/constants';

interface RequestConfig {
    headers?: Record<string, string>;
    timeout?: number;
}

class ApiService {
    private baseURL: string;
    private timeout: number;

    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.timeout = API_CONFIG.TIMEOUT;
    }

    private async getHeaders(customHeaders?: Record<string, string>): Promise<Record<string, string>> {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };

        const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        // Custom headers override defaults (including Authorization)
        if (customHeaders) {
            Object.assign(headers, customHeaders);
        }

        return headers;
    }

    private async handleResponse<T>(response: Response): Promise<T> {
        if (response.status === 401) {
            // Token expired or invalid - clear storage
            await AsyncStorage.multiRemove([
                STORAGE_KEYS.AUTH_TOKEN,
                STORAGE_KEYS.USER_DATA,
            ]);
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        return response.json();
    }

    private async request<T>(
        method: string,
        url: string,
        data?: any,
        config?: RequestConfig
    ): Promise<T> {
        const headers = await this.getHeaders(config?.headers);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config?.timeout || this.timeout);

        try {
            const response = await fetch(`${this.baseURL}${url}`, {
                method,
                headers,
                body: data ? JSON.stringify(data) : undefined,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            return this.handleResponse<T>(response);
        } catch (error: any) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }

    async get<T = any>(url: string, config?: RequestConfig): Promise<T> {
        return this.request<T>('GET', url, undefined, config);
    }

    async post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
        return this.request<T>('POST', url, data, config);
    }

    async put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
        return this.request<T>('PUT', url, data, config);
    }

    async patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
        return this.request<T>('PATCH', url, data, config);
    }

    async delete<T = any>(url: string, config?: RequestConfig): Promise<T> {
        return this.request<T>('DELETE', url, undefined, config);
    }
}

export default new ApiService();
