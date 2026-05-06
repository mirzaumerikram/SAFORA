import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { AlertProvider, useSaforaAlert, setGlobalAlert } from './src/context/AlertContext';

const GlobalAlertSetter = () => {
    const showAlert = useSaforaAlert();
    React.useEffect(() => {
        setGlobalAlert(showAlert);
    }, [showAlert]);
    return null;
};

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
            <AlertProvider>
                <SafeAreaProvider>
                    <GlobalAlertSetter />
                    <AppNavigator />
                </SafeAreaProvider>
            </AlertProvider>
        </ErrorBoundary>
    );
};

export default App;
