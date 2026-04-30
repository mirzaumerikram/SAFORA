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
import ChatScreen from '../screens/main/ChatScreen';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { LanguageProvider } from '../context/LanguageContext';
import theme from '../utils/theme';
import { STORAGE_KEYS } from '../utils/constants';

const RootStack = createStackNavigator();

const RootNavigator: React.FC = () => {
    const { isAuthenticated, isLoading, userRole } = useAuth();
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
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!isAuthenticated) {
        return (
            <NavigationContainer>
                <AuthNavigator />
            </NavigationContainer>
        );
    }

    if (userRole === 'admin') {
        return (
            <NavigationContainer>
                <RootStack.Navigator screenOptions={{ headerShown: false }}>
                    <RootStack.Screen name="AdminHome" component={AdminDashboard} />
                </RootStack.Navigator>
            </NavigationContainer>
        );
    }

    if (userRole === 'driver') {
        // Driver has not completed vehicle registration yet
        if (driverRegistered === false) {
            return (
                <NavigationContainer>
                    <RootStack.Navigator screenOptions={{ headerShown: false }}>
                        <RootStack.Screen name="DriverOnboarding" component={DriverOnboardingScreen} />
                        {/* Allow navigation back to driver app after onboarding */}
                        <RootStack.Screen name="DriverApp" component={DriverAppNavigator} />
                    </RootStack.Navigator>
                </NavigationContainer>
            );
        }

        return (
            <NavigationContainer>
                <RootStack.Navigator screenOptions={{ headerShown: false }}>
                    <RootStack.Screen name="DriverApp" component={DriverAppNavigator} />
                </RootStack.Navigator>
            </NavigationContainer>
        );
    }

    // Default: passenger
    return (
        <NavigationContainer>
            <MainNavigator />
        </NavigationContainer>
    );
};

// Full driver stack: tabs + Pink Pass screens
const DriverStack = createStackNavigator();

const DriverAppNavigator: React.FC = () => (
    <DriverStack.Navigator screenOptions={{ headerShown: false }}>
        <DriverStack.Screen name="DriverTabs"       component={DriverNavigator} />
        <DriverStack.Screen name="PinkPassDriver"   component={PinkPassDriverScreen} />
        <DriverStack.Screen name="PinkPassLiveness" component={PinkPassLivenessScreen} />
        <DriverStack.Screen name="Chat"             component={ChatScreen} />
    </DriverStack.Navigator>
);

const AppNavigator: React.FC = () => {
    return (
        <LanguageProvider>
            <AuthProvider>
                <RootNavigator />
            </AuthProvider>
        </LanguageProvider>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
});

export default AppNavigator;
