import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/main/HomeScreen';
import RideSelectionScreen from '../screens/main/RideSelectionScreen';
import TrackingScreen from '../screens/main/TrackingScreen';
import DriverDashboard from '../screens/driver/DriverDashboard';
import FeedbackScreen from '../screens/main/FeedbackScreen';
import FareBreakdownScreen from '../screens/main/FareBreakdownScreen';
import SafetyScreen from '../screens/main/SafetyScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import RideHistoryScreen from '../screens/main/RideHistoryScreen';
import PinkPassScreen from '../screens/main/PinkPassScreen';
import PaymentScreen from '../screens/main/PaymentScreen';
import theme from '../utils/theme';

const Stack = createStackNavigator();

const MainNavigator: React.FC = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                cardStyle: { backgroundColor: theme.colors.background },
            }}>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="RideSelection" component={RideSelectionScreen} />
            <Stack.Screen name="Tracking" component={TrackingScreen} />
            <Stack.Screen name="DriverDashboard" component={DriverDashboard} />
            <Stack.Screen name="Feedback" component={FeedbackScreen} />
            <Stack.Screen name="FareBreakdown" component={FareBreakdownScreen} />
            <Stack.Screen name="Safety" component={SafetyScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="RideHistory" component={RideHistoryScreen} />
            <Stack.Screen name="PinkPass" component={PinkPassScreen} />
            <Stack.Screen name="Payment" component={PaymentScreen} />
        </Stack.Navigator>
    );
};

export default MainNavigator;
