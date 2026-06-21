import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/auth.service';
import { STORAGE_KEYS } from '../utils/constants';
import { registerForPushNotifications } from '../utils/pushNotifications';

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    userRole: string;
    setAuthenticated: (value: boolean) => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    isLoading: true,
    userRole: 'passenger',
    setAuthenticated: () => {},
    logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const resolveRole = async (): Promise<string> => {
    // @safora_selected_role = what user picked on LanguageRoleScreen (driver/passenger)
    // USER_DATA.role = what backend assigned (may not exist for OTP users)
    // Selected role takes priority so demo switching works correctly
    const selected = await AsyncStorage.getItem('@safora_selected_role');
    if (selected === 'driver' || selected === 'passenger') return selected;
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (raw) {
        const user = JSON.parse(raw);
        if (user?.role) return user.role;
    }
    return 'passenger';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState('passenger');
    // Holds the FCM foreground-message unsubscribe function (web only)
    const foregroundUnsubRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        checkAuth();
        return () => {
            if (foregroundUnsubRef.current) {
                foregroundUnsubRef.current();
                foregroundUnsubRef.current = null;
            }
        };
    }, []);

    const checkAuth = async () => {
        try {
            const authenticated = await authService.isAuthenticated();
            setIsAuthenticated(authenticated);
            if (authenticated) {
                const role = await resolveRole();
                setUserRole(role);
                
                // Also register for push on app start if already authenticated
                const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
                if (token) {
                    setTimeout(async () => {
                        try {
                            // On web: only re-register silently if permission was already granted.
                            // If it's 'default', the user hasn't been asked yet — let the explicit
                            // "Enable Notifications" flow handle it rather than auto-prompting.
                            if (Platform.OS === 'web' && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
                                return;
                            }
                            await registerForPushNotifications(token, role);
                            if (Platform.OS === 'web' && !foregroundUnsubRef.current) {
                                const { setupForegroundNotifications } = await import('../config/firebaseConfig');
                                foregroundUnsubRef.current = setupForegroundNotifications();
                            }
                        } catch { /* never crash on push registration failure */ }
                    }, 5000);
                }
            }
        } catch {
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    };

    const setAuthenticated = async (value: boolean) => {
        setIsAuthenticated(value);
        if (value) {
            try {
                const role = await resolveRole();
                setUserRole(role);

                // Register device for push notifications after a delay so it doesn't
                // compete with the location permission prompt
                const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
                if (token) {
                    setTimeout(async () => {
                        try {
                            // On web: only re-register silently if permission was already granted.
                            // If it's 'default', the user hasn't been asked yet — let the explicit
                            // "Enable Notifications" flow handle it rather than auto-prompting.
                            if (Platform.OS === 'web' && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
                                return;
                            }
                            await registerForPushNotifications(token, role);
                            if (Platform.OS === 'web' && !foregroundUnsubRef.current) {
                                const { setupForegroundNotifications } = await import('../config/firebaseConfig');
                                foregroundUnsubRef.current = setupForegroundNotifications();
                            }
                        } catch { /* never crash on push registration failure */ }
                    }, 5000);
                }
            } catch {
                setUserRole('passenger');
            }
        }
    };

    const logout = async () => {
        await authService.logout();
        foregroundUnsubRef.current?.();
        foregroundUnsubRef.current = null;
        setIsAuthenticated(false);
        setUserRole('passenger');
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, isLoading, userRole, setAuthenticated, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
