import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { STORAGE_KEYS } from '../../utils/constants';
import SaforaAlert from '../../utils/alert';

// This screen is intentionally ALWAYS dark — it is a fullscreen dark experience
// regardless of the app's light/dark mode setting.
const DARK = {
    background: '#0A0A0A',
    text: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.5)',
    black: '#000000',
    success: '#27ae60',
};

const VerifyEmailScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { setAuthenticated } = useAuth();
    const { theme } = useAppTheme();

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

    const yellow = theme.colors.primary;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={DARK.background} />

            {/* Envelope icon in yellow circle */}
            <View style={[styles.iconCircle, { backgroundColor: yellow }]}>
                <Text style={styles.iconEmoji}>📧</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>CHECK YOUR EMAIL</Text>

            {/* Subtitle */}
            <Text style={styles.subtitle}>We sent a verification link to</Text>

            {/* Email address */}
            <Text style={[styles.emailText, { color: yellow }]}>
                {email || 'your email'}
            </Text>

            {/* Primary CTA — yellow bordered / filled button */}
            <TouchableOpacity
                style={[styles.primaryBtn, { borderColor: yellow }]}
                onPress={handleContinue}
                disabled={continueLoading}
                activeOpacity={0.8}
            >
                {continueLoading ? (
                    <ActivityIndicator color={DARK.black} />
                ) : (
                    <Text style={[styles.primaryBtnText, { color: DARK.black }]}>
                        {'✓  I\'ve Verified — Continue'}
                    </Text>
                )}
            </TouchableOpacity>

            {/* Secondary CTA — white/outlined button */}
            <TouchableOpacity
                style={[
                    styles.secondaryBtn,
                    resendDone
                        ? { borderColor: DARK.success }
                        : { borderColor: DARK.text },
                ]}
                onPress={handleResend}
                disabled={resendLoading || resendDone}
                activeOpacity={0.8}
            >
                {resendLoading ? (
                    <ActivityIndicator color={DARK.text} size="small" />
                ) : (
                    <Text
                        style={[
                            styles.secondaryBtnText,
                            { color: resendDone ? DARK.success : DARK.text },
                        ]}
                    >
                        {resendDone ? '✓  Email Sent!' : 'Resend Verification Email'}
                    </Text>
                )}
            </TouchableOpacity>

            {/* Spam hint link */}
            <TouchableOpacity style={styles.hintBtn} onPress={() => navigation.goBack()}>
                <Text style={[styles.hintText, { color: DARK.textSecondary }]}>
                    Check your spam folder if you don't see it in your inbox.
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: DARK.background,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingVertical: 40,
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    iconEmoji: {
        fontSize: 46,
    },
    title: {
        fontSize: 26,
        fontWeight: '900',
        color: DARK.text,
        letterSpacing: 2,
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 14,
        color: DARK.textSecondary,
        textAlign: 'center',
        marginBottom: 6,
    },
    emailText: {
        fontSize: 15,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 40,
    },
    primaryBtn: {
        backgroundColor: '#F5C518',
        borderWidth: 2,
        borderRadius: 12,
        paddingVertical: 15,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
        marginBottom: 14,
    },
    primaryBtnText: {
        fontWeight: '700',
        fontSize: 15,
        letterSpacing: 0.3,
    },
    secondaryBtn: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderRadius: 12,
        paddingVertical: 14,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
        marginBottom: 32,
    },
    secondaryBtnText: {
        fontWeight: '600',
        fontSize: 14,
        letterSpacing: 0.2,
    },
    hintBtn: {
        paddingHorizontal: 16,
        paddingVertical: 6,
    },
    hintText: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
        textDecorationLine: 'underline',
    },
});

export default VerifyEmailScreen;
