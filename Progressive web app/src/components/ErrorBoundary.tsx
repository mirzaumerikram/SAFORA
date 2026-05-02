import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({
            error,
            errorInfo
        });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <Text style={styles.header}>Something went wrong.</Text>
                    <ScrollView style={styles.scroll}>
                        <Text style={styles.errorText}>
                            {this.state.error && this.state.error.toString()}
                        </Text>
                        <Text style={styles.stackText}>
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </Text>
                    </ScrollView>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'red',
        marginBottom: 10,
        marginTop: 50,
    },
    scroll: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        padding: 10,
        borderRadius: 8,
    },
    errorText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '600',
        marginBottom: 10,
    },
    stackText: {
        fontSize: 12,
        color: '#666',
        fontFamily: 'monospace',
    }
});

export default ErrorBoundary;
