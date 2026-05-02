import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';

const App: React.FC = () => {
    return (
        <ErrorBoundary>
            <SafeAreaProvider>
                <AppNavigator />
            </SafeAreaProvider>
        </ErrorBoundary>
    );
};

export default App;
