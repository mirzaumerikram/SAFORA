import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';

const App: React.FC = () => {
    // Force global scroll styles on web
    if (Platform.OS === 'web') {
        const style = document.createElement('style');
        style.textContent = `
            html, body, #root {
                height: 100% !important;
                overflow-y: auto !important;
                -webkit-overflow-scrolling: touch;
            }
            * {
                scrollbar-width: none;
                -ms-overflow-style: none;
            }
            *::-webkit-scrollbar {
                display: none;
            }
        `;
        document.head.appendChild(style);
    }

    return (
        <ErrorBoundary>
            <SafeAreaProvider>
                <AppNavigator />
            </SafeAreaProvider>
        </ErrorBoundary>
    );
};

export default App;
