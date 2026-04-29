import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AuthNavigator from '../navigation/AuthNavigator';
import MainNavigator from '../navigation/MainNavigator';
import DriverDashboard from '../screens/driver/DriverDashboard';
import AdminDashboard from '../screens/admin/AdminDashboard';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LanguageProvider } from '../context/LanguageContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import theme from '../utils/theme';

const RootStack = createStackNavigator();

const RootNavigator: React.FC = () => {
    const { isAuthenticated, isLoading, userRole } = useAuth();

    if (isLoading) {
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

    // Admin role — dedicated admin panel
    if (userRole === 'admin') {
        return (
            <NavigationContainer>
                <RootStack.Navigator screenOptions={{ headerShown: false }}>
                    <RootStack.Screen name="AdminHome" component={AdminDashboard} />
                </RootStack.Navigator>
            </NavigationContainer>
        );
    }

    // Driver role
    if (userRole === 'driver') {
        return (
            <NavigationContainer>
                <RootStack.Navigator screenOptions={{ headerShown: false }}>
                    <RootStack.Screen name="DriverHome" component={DriverDashboard} />
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
