import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform } from 'react-native';
import DriverDashboard from '../screens/driver/DriverDashboard';
import EarningsScreen from '../screens/driver/EarningsScreen';
import DriverProfileScreen from '../screens/driver/DriverProfileScreen';
import theme from '../utils/theme';

const Tab = createBottomTabNavigator();

interface TabIconProps {
    focused: boolean;
    label: string;
    icon: string;
}

const TabIcon: React.FC<TabIconProps> = ({ focused, label, icon }) => (
    <View style={[styles.tabItem, focused && styles.tabItemActive]}>
        <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{icon}</Text>
        <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
);

const DriverNavigator: React.FC = () => {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarShowLabel: false,
            }}
        >
            <Tab.Screen
                name="DriverHome"
                component={DriverDashboard}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon focused={focused} label="Drive" icon="🚗" />
                    ),
                }}
            />
            <Tab.Screen
                name="Earnings"
                component={EarningsScreen}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon focused={focused} label="Earnings" icon="💰" />
                    ),
                }}
            />
            <Tab.Screen
                name="DriverProfile"
                component={DriverProfileScreen}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon focused={focused} label="Profile" icon="👤" />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: theme.colors.card,
        borderTopColor: '#222',
        borderTopWidth: 1,
        height: Platform.OS === 'ios' ? 84 : 64,
        paddingBottom: Platform.OS === 'ios' ? 20 : 8,
        paddingTop: 8,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 4,
        borderRadius: 12,
        minWidth: 72,
    },
    tabItemActive: {
        backgroundColor: 'rgba(245,197,24,0.1)',
    },
    tabIcon: {
        fontSize: 22,
        marginBottom: 3,
        opacity: 0.5,
    },
    tabIconActive: {
        opacity: 1,
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        letterSpacing: 0.5,
    },
    tabLabelActive: {
        color: theme.colors.primary,
    },
});

export default DriverNavigator;
