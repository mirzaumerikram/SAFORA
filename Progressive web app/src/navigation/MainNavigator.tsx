import React, { Suspense } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppTheme } from '../context/ThemeContext';

// Home is the landing screen after login — keep it eager
import HomeScreen from '../screens/main/HomeScreen';

// All other screens are lazy — each becomes its own chunk downloaded on first visit
const BookingLocationScreen = React.lazy(() => import('../screens/main/BookingLocationScreen'));
const RideSelectionScreen   = React.lazy(() => import('../screens/main/RideSelectionScreen'));
const SearchingScreen       = React.lazy(() => import('../screens/main/SearchingScreen'));
const TrackingScreen        = React.lazy(() => import('../screens/main/TrackingScreen'));
const DriverDashboard       = React.lazy(() => import('../screens/driver/DriverDashboard'));
const FeedbackScreen        = React.lazy(() => import('../screens/main/FeedbackScreen'));
const FareBreakdownScreen   = React.lazy(() => import('../screens/main/FareBreakdownScreen'));
const SafetyScreen          = React.lazy(() => import('../screens/main/SafetyScreen'));
const ProfileScreen         = React.lazy(() => import('../screens/main/ProfileScreen'));
const RideHistoryScreen     = React.lazy(() => import('../screens/main/RideHistoryScreen'));
const PinkPassScreen        = React.lazy(() => import('../screens/main/PinkPassScreen'));
const PinkPassCnicScreen    = React.lazy(() => import('../screens/main/PinkPassCnicScreen'));
const PinkPassCameraScreen  = React.lazy(() => import('../screens/main/PinkPassCameraScreen'));
const PaymentScreen         = React.lazy(() => import('../screens/main/PaymentScreen'));
const ChatScreen            = React.lazy(() => import('../screens/main/ChatScreen'));

const Stack = createStackNavigator();

const MainNavigator: React.FC = () => {
    const { theme } = useAppTheme();
    return (
        <Suspense fallback={<View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#F5C518" /></View>}>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    cardStyle: { backgroundColor: theme.colors.background },
                }}>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="BookingLocation" component={BookingLocationScreen} />
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
                <Stack.Screen name="PinkPassCnic" component={PinkPassCnicScreen} />
                <Stack.Screen name="PinkPassCamera" component={PinkPassCameraScreen} />
                <Stack.Screen name="Payment" component={PaymentScreen} />
                <Stack.Screen name="Chat" component={ChatScreen} />
            </Stack.Navigator>
        </Suspense>
    );
};

export default MainNavigator;
