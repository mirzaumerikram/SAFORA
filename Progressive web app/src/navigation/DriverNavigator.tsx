import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform } from 'react-native';
import DriverDashboard from '../screens/driver/DriverDashboard';
import EarningsScreen from '../screens/driver/EarningsScreen';
import DriverProfileScreen from '../screens/driver/DriverProfileScreen';
import { useAppTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();

interface TabIconProps {
    focused: boolean;
    label: string;
    icon: string;
    activeColor: string;
    subColor: string;
}

const TabIcon: React.FC<TabIconProps> = ({ focused, label, icon, activeColor, subColor }) => (
    <View style={[styles.tabItem, focused && { backgroundColor: 'rgba(245,197,24,0.1)' }]}>
        <Text style={[styles.tabIcon, { opacity: focused ? 1 : 0.45 }]}>{icon}</Text>
        <Text style={[styles.tabLabel, { color: focused ? activeColor : subColor }]}>{label}</Text>
    </View>
);

const DriverNavigator: React.FC = () => {
    const { theme } = useAppTheme();

    const tabBarStyle = {
        backgroundColor: theme.colors.navBg ?? theme.colors.card,
        borderTopColor:  theme.colors.border,
        borderTopWidth:  1,
        height:          Platform.OS === 'ios' ? 84 : 64,
        paddingBottom:   Platform.OS === 'ios' ? 20 : 8,
        paddingTop:      8,
        elevation:       20,
        shadowColor:     '#000',
        shadowOffset:    { width: 0, height: -4 },
        shadowOpacity:   theme.dark ? 0.4 : 0.08,
        shadowRadius:    8,
    };

    const makeIcon = (label: string, icon: string) =>
        ({ focused }: { focused: boolean }) => (
            <TabIcon
                focused={focused}
                label={label}
                icon={icon}
                activeColor={theme.colors.primary}
                subColor={theme.colors.textSecondary}
            />
        );

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle,
                tabBarShowLabel: false,
            }}
        >
            <Tab.Screen
                name="DriverHome"
                component={DriverDashboard}
                options={{ tabBarIcon: makeIcon('Drive', '🚗') }}
            />
            <Tab.Screen
                name="Earnings"
                component={EarningsScreen}
                options={{ tabBarIcon: makeIcon('Earnings', '💰') }}
            />
            <Tab.Screen
                name="DriverProfile"
                component={DriverProfileScreen}
                options={{ tabBarIcon: makeIcon('Profile', '👤') }}
            />
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 4,
        borderRadius: 12,
        minWidth: 72,
    },
    tabIcon:  { fontSize: 22, marginBottom: 3 },
    tabLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
});

export default DriverNavigator;
