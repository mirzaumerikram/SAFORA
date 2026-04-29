import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../../services/api';
import theme from '../../utils/theme';
import { useAuth } from '../../context/AuthContext';
import { STORAGE_KEYS } from '../../utils/constants';
import SaforaAlert from '../../utils/alert';

const VerifyEmailScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { setAuthenticated } = useAuth();
    const { email, token, user } = route.params || {};

    const [resendLoading, setResendLoading] = useState(false);
    const [resendDone, setResendDone] = useState(false);
    const [continueLoading, setContinueLoading] = useState(false);

    const handleResend = async () => {
        setResendLoading(true);
        try {
            await apiService.post('/auth/resend-verification', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setResendDone(true);
            setTimeout(() => setResendDone(false), 5000);
        } catch (e: any) {
            SaforaAlert('Error', e.message || 'Failed to resend. Try again.');
        } finally {
            setResendLoading(false);
        }
    };

    const handleContinue = async () => {
        setContinueLoading(true);
        try {
            // Check latest verification status
            const res = await apiService.get('/auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res?.user?.emailVerified) {
                await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
                await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(res.user));
                setAuthenticated(true);
            } else {
                SaforaAlert(
                    'Not Verified Yet',
                    'Please check your inbox and click the verification link, then try again.'
                );
            }
        } catch {
            // If check fails, let them in anyway with existing token
            if (token && user) {
                await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
                await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
                setAuthenticated(true);
            }
        } finally {
            setContinueLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.emoji}>📧</Text>
                <Text style={styles.title}>Check Your Email</Text>
                <Text style={styles.subtitle}>
                    We sent a verification link to
                </Text>
                <Text style={styles.email}>{email || 'your email'}</Text>
                <Text style={styles.body}>
                    Click the link in the email to verify your account. Check your spam folder if you don't see it.
                </Text>

                <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={handleContinue}
                    disabled={continueLoading}
                >
                    {continueLoading
                        ? <ActivityIndicator color={theme.colors.black} />
                        : <Text style={styles.primaryBtnText}>I've Verified — Continue</Text>
                    }
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.secondaryBtn, resendDone && styles.secondaryBtnDone]}
                    onPress={handleResend}
                    disabled={resendLoading || resendDone}
                >
                    {resendLoading
                        ? <ActivityIndicator color={theme.colors.primary} size="small" />
                        : <Text style={[styles.secondaryBtnText, resendDone && styles.secondaryBtnTextDone]}>
                            {resendDone ? '✓ Email Sent!' : 'Resend Verification Email'}
                          </Text>
                    }
                </TouchableOpacity>

                <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.skipText}>Back to Login</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    card: {
        backgroundColor: theme.colors.card,
        borderRadius: 20,
        padding: 32,
        width: '100%',
        alignItems: 'center',
    },
    emoji: { fontSize: 52, marginBottom: 16 },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: theme.colors.text,
        letterSpacing: 1,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    email: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.primary,
        marginBottom: 16,
        textAlign: 'center',
    },
    body: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 28,
    },
    primaryBtn: {
        backgroundColor: theme.colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        width: '100%',
        alignItems: 'center',
        marginBottom: 12,
        minHeight: 48,
        justifyContent: 'center',
    },
    primaryBtnText: {
        color: theme.colors.black,
        fontWeight: '700',
        fontSize: 14,
    },
    secondaryBtn: {
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
        borderRadius: 12,
        paddingVertical: 12,
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
        minHeight: 44,
        justifyContent: 'center',
    },
    secondaryBtnDone: {
        borderColor: theme.colors.success || '#27ae60',
    },
    secondaryBtnText: {
        color: theme.colors.primary,
        fontWeight: '600',
        fontSize: 13,
    },
    secondaryBtnTextDone: {
        color: theme.colors.success || '#27ae60',
    },
    skipBtn: { paddingVertical: 8 },
    skipText: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
});

export default VerifyEmailScreen;
