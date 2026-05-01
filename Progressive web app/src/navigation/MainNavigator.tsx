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
import PinkPassCameraScreen from '../screens/main/PinkPassCameraScreen';
import PaymentScreen from '../screens/main/PaymentScreen';
import ChatScreen from '../screens/main/ChatScreen';
import SearchingScreen from '../screens/main/SearchingScreen';
import { useAppTheme } from '../context/ThemeContext';

const Stack = createStackNavigator();

const MainNavigator: React.FC = () => {
    const { theme } = useAppTheme();
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                cardStyle: { backgroundColor: theme.colors.background },
            }}>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="RideSelection" component={RideSelectionScreen} />
            <Stack.Screen name="Searching" component={SearchingScreen} />
            <Stack.Screen name="Tracking" component={TrackingScreen} />
            <Stack.Screen name="DriverDashboard" component={DriverDashboard} />
            <Stack.Screen name="Feedback" component={FeedbackScreen} />
            <Stack.Screen name="FareBreakdown" component={FareBreakdownScreen} />
            <Stack.Screen name="Safety" component={SafetyScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="RideHistory" component={RideHistoryScreen} />
            <Stack.Screen name="PinkPass" component={PinkPassScreen} />
            <Stack.Screen name="PinkPassCamera" component={PinkPassCameraScreen} />
            <Stack.Screen name="Payment" component={PaymentScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
        </Stack.Navigator>
    );
};

export default MainNavigator;
