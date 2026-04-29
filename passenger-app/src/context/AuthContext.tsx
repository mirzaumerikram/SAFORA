import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/auth.service';
import { STORAGE_KEYS } from '../utils/constants';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState('passenger');

    useEffect(() => {
        checkAuth();
    }, []);

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

    const checkAuth = async () => {
        try {
            const authenticated = await authService.isAuthenticated();
            setIsAuthenticated(authenticated);
            if (authenticated) {
                setUserRole(await resolveRole());
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
                setUserRole(await resolveRole());
            } catch {
                setUserRole('passenger');
            }
        }
    };

    const logout = async () => {
        await authService.logout();
        setIsAuthenticated(false);
        setUserRole('passenger');
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, isLoading, userRole, setAuthenticated, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
