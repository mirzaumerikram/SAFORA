import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import DriverNavigator from './DriverNavigator';
import AdminDashboard from '../screens/admin/AdminDashboard';
import DriverOnboardingScreen from '../screens/driver/DriverOnboardingScreen';
import PinkPassDriverScreen from '../screens/driver/PinkPassDriverScreen';
import PinkPassLivenessScreen from '../screens/driver/PinkPassLivenessScreen';
import RideRequestScreen from '../screens/driver/RideRequestScreen';
import TripNavScreen from '../screens/driver/TripNavScreen';
import RatePassengerScreen from '../screens/driver/RatePassengerScreen';
import ChatScreen from '../screens/main/ChatScreen';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { LanguageProvider } from '../context/LanguageContext';
import { ThemeProvider, useAppTheme } from '../context/ThemeContext';
import { STORAGE_KEYS } from '../utils/constants';

const RootStack = createStackNavigator();

const RootNavigator: React.FC = () => {
    const { isAuthenticated, isLoading, userRole } = useAuth();
    const { theme } = useAppTheme();
    const [driverRegistered, setDriverRegistered]  = useState<boolean | null>(null);
    const [checkingDriver, setCheckingDriver]       = useState(false);

    useEffect(() => {
        if (isAuthenticated && userRole === 'driver') {
            setCheckingDriver(true);
            AsyncStorage.getItem(STORAGE_KEYS.USER_DATA)
                .then(raw => {
                    const user = raw ? JSON.parse(raw) : {};
                    setDriverRegistered(!!user.driverRegistered);
                })
                .catch(() => setDriverRegistered(false))
                .finally(() => setCheckingDriver(false));
        }
    }, [isAuthenticated, userRole]);

    if (isLoading || checkingDriver) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!isAuthenticated) {
        return <AuthNavigator />;
    }

    if (userRole === 'admin') {
        return (
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
                <RootStack.Screen name="AdminHome" component={AdminDashboard} />
            </RootStack.Navigator>
        );
    }

    if (userRole === 'driver') {
        // Driver has not completed vehicle registration yet
        if (driverRegistered === false) {
            return (
                <RootStack.Navigator screenOptions={{ headerShown: false }}>
                    <RootStack.Screen name="DriverOnboarding" component={DriverOnboardingScreen} />
                    {/* Allow navigation back to driver app after onboarding */}
                    <RootStack.Screen name="DriverApp" component={DriverAppNavigator} />
                </RootStack.Navigator>
            );
        }

        return (
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
                <RootStack.Screen name="DriverApp" component={DriverAppNavigator} />
            </RootStack.Navigator>
        );
    }

    // Default: passenger
    return <MainNavigator />;
};

// Full driver stack: tabs + Pink Pass screens
const DriverStack = createStackNavigator();

const DriverAppNavigator: React.FC = () => (
    <DriverStack.Navigator screenOptions={{ headerShown: false }}>
        <DriverStack.Screen name="DriverTabs"       component={DriverNavigator} />
        <DriverStack.Screen name="RideRequest"      component={RideRequestScreen} />
        <DriverStack.Screen name="TripNav"          component={TripNavScreen} />
        <DriverStack.Screen name="RatePassenger"    component={RatePassengerScreen} />
        <DriverStack.Screen name="PinkPassDriver"   component={PinkPassDriverScreen} />
        <DriverStack.Screen name="PinkPassLiveness" component={PinkPassLivenessScreen} />
        <DriverStack.Screen name="Chat"             component={ChatScreen} />
    </DriverStack.Navigator>
);

const linking = {
    prefixes: ['/'],
    config: {
        screens: {
            // Auth Flow
            Welcome:      'welcome',
            Login:        'login',
            Register:     'register',
            VerifyOtp:    'verify-otp',
            LanguageRole: 'setup',

            // Passenger Flow (MainNavigator)
            Home:            '',
            Profile:         'profile',
            PinkPass:        'pink-pass',
            PinkPassCnic:    'pink-pass/cnic',
            PinkPassCamera:  'pink-pass/test',
            RideHistory:     'history',
            Safety:          'safety',
            Payment:         'payment',
            Chat:            'chat',
            BookingLocation: 'book',
            RideSelection:   'select-ride',
            Searching:       'searching',
            Tracking:        'tracking',

            // Driver Flow
            DriverOnboarding: 'driver/onboarding',
            DriverApp: {
                screens: {
                    DriverTabs:     'driver',
                    RideRequest:    'driver/request',
                    TripNav:        'driver/navigation',
                    PinkPassDriver: 'driver/pink-pass',
                    PinkPassLiveness: 'driver/pink-pass/test',
                    RatePassenger: 'driver/rate',
                }
            },

            // Admin Flow
            AdminHome: 'admin',
        },
    },
};

const AppNavigator: React.FC = () => {
    return (
        <ThemeProvider>
            <LanguageProvider>
                <AuthProvider>
                    <NavigationContainer linking={linking}>
                        <RootNavigator />
                        {/* Global Version Marker for Debugging */}
                        <View style={{ 
                            position: 'absolute', top: 0, left: 0, right: 0, 
                            backgroundColor: '#FFD700', padding: 2, 
                            alignItems: 'center', zIndex: 9999,
                            opacity: 0.8
                        }}>
                            <Text style={{ fontSize: 9, fontWeight: '900', color: '#000' }}>SAFORA LIVE v2.1-FIX</Text>
                        </View>
                    </NavigationContainer>
                </AuthProvider>
            </LanguageProvider>
        </ThemeProvider>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default AppNavigator;
