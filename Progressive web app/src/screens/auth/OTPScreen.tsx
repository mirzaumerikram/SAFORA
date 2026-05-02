import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, ScrollView, StatusBar, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../utils/theme';
import authService from '../../services/auth.service';
import SaforaAlert from '../../utils/alert';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getConfirmationResult, clearConfirmationResult } from '../../services/otpStore';

// ─── Component ────────────────────────────────────────────────────────────────

const NUMPAD = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', '⌫'],
];

const OTPScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route      = useRoute<any>();
    const { theme }  = useAppTheme();
    const { phone, selectedRole } = route.params || { phone: '+92 3XX XXXXXXX', selectedRole: 'passenger' };
    const { setAuthenticated } = useAuth();
    const { t } = useLanguage();

    const s = useMemo(() => makeStyles(theme), [theme]);

    const [otp, setOtp]         = useState('');
    const [timer, setTimer]     = useState(90);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const id = setInterval(() => setTimer(p => p > 0 ? p - 1 : 0), 1000);
        return () => clearInterval(id);
    }, []);

    const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    const press = (key: string) => {
        if (key === '⌫') { setOtp(p => p.slice(0, -1)); return; }
        if (key === '')   return;
        if (otp.length < 6) setOtp(p => p + key);
    };

    const handleVerify = async () => {
        if (otp.length < 6 || loading) return;
        setLoading(true);
        try {
            const cr = getConfirmationResult();
            if (!cr) {
                SaforaAlert('Session Expired', 'Please go back and request a new OTP.');
                return;
            }
            const credential = await cr.confirm(otp);
            const idToken    = await credential.user.getIdToken();
            clearConfirmationResult();

            const res = await authService.verifyFirebaseToken(idToken);
            if (res.success) {
                if (res.isNewUser) {
                    navigation.navigate('Register', {
                        phone,
                        token: res.token,
                        selectedRole,
                    });
                } else {
                    setAuthenticated(true);
                }
            } else {
                SaforaAlert('Verification Failed', res.message || 'Please try again.');
            }
        } catch (err: any) {
            const msg =
                err?.code === 'auth/invalid-verification-code'
                    ? 'Incorrect OTP. Please check and try again.'
                    : err?.code === 'auth/code-expired'
                    ? 'OTP has expired. Please request a new one.'
                    : 'Verification failed. Please try again.';
            SaforaAlert('Error', msg);
            setOtp('');
        } finally {
            setLoading(false);
        }
    };

    const pct = `${Math.round((timer / 90) * 100)}%` as any;

    return (
        <View style={s.root}>
            <StatusBar
                barStyle={theme.dark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.colors.background}
            />
            <ScrollView
                contentContainerStyle={s.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Centred inner — caps width on desktop */}
                <View style={s.inner}>

                    {/* Back */}
                    <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
                        <Text style={s.backText}>←</Text>
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={s.header}>
                        <View style={s.iconCircle}>
                            <Text style={s.icon}>💬</Text>
                        </View>
                        <Text style={s.badge}>VERIFICATION</Text>
                        <Text style={s.title}>VERIFY{'\n'}NUMBER</Text>
                        <Text style={s.subtitle}>
                            {t.codeSentTo || 'Code sent to'}{' '}
                            <Text style={s.phone}>{phone}</Text>
                        </Text>
                    </View>

                    {/* Timer bar */}
                    <View style={s.barTrack}>
                        <View style={[s.barFill, { width: pct }]} />
                    </View>

                    {/* OTP boxes */}
                    <View style={s.boxes}>
                        {Array.from({ length: 6 }, (_, i) => (
                            <View
                                key={i}
                                style={[
                                    s.box,
                                    otp.length === i && s.boxActive,
                                    otp[i] !== undefined && s.boxFilled,
                                ]}
                            >
                                <Text style={[s.boxDigit, otp[i] && s.boxDigitFilled]}>
                                    {otp[i] || ''}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Resend row */}
                    <View style={s.resendRow}>
                        <Text style={s.expiryText}>
                            {t.codeExpires || 'Expires in'}{' '}
                            <Text style={s.expiryTime}>{fmt(timer)}</Text>
                        </Text>
                        <TouchableOpacity disabled={timer > 0}>
                            <Text style={[s.resendBtn, timer === 0 && s.resendBtnActive]}>
                                {t.resendOtp || 'Resend OTP'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Custom numpad */}
                    <View style={s.numpad}>
                        {NUMPAD.map((row, ri) => (
                            <View key={ri} style={s.row}>
                                {row.map((key, ki) => (
                                    <TouchableOpacity
                                        key={ki}
                                        style={[
                                            s.key,
                                            key === '⌫' && s.keyDel,
                                            key === ''  && s.keyEmpty,
                                        ]}
                                        activeOpacity={key === '' ? 1 : 0.7}
                                        onPress={() => press(key)}
                                        disabled={key === ''}
                                    >
                                        <Text style={[s.keyText, key === '⌫' && s.keyDelText]}>
                                            {key}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ))}
                    </View>

                    {/* Verify button */}
                    <TouchableOpacity
                        style={[s.verifyBtn, (otp.length < 6 || loading) && s.verifyBtnDisabled]}
                        activeOpacity={0.85}
                        onPress={handleVerify}
                        disabled={otp.length < 6 || loading}
                    >
                        {loading
                            ? <ActivityIndicator color="#000" />
                            : <Text style={s.verifyBtnText}>
                                {t.verifyBtn || 'Verify →'}
                              </Text>
                        }
                    </TouchableOpacity>

                </View>
            </ScrollView>
        </View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (t: AppTheme) => {
    // On web desktop, numpad keys should NOT be based on screen width
    const isWeb = Platform.OS === 'web';
    // Key width: on web use a fixed 100px, on native use flex
    return StyleSheet.create({
        root:  { flex: 1, backgroundColor: t.colors.background },
        scroll: { flexGrow: 1, alignItems: 'center' },
        inner: {
            width: '100%',
            maxWidth: 460,
            paddingHorizontal: 24,
            paddingTop: 52,
            paddingBottom: 80,
        },

        backBtn: {
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: t.colors.cardSecondary,
            borderWidth: 1, borderColor: t.colors.border,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 24,
        },
        backText: { fontSize: 20, color: t.colors.text, fontWeight: '600' },

        header: { marginBottom: 8 },
        iconCircle: {
            width: 52, height: 52, borderRadius: 26,
            backgroundColor: 'rgba(245,197,24,0.15)',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
        },
        icon: { fontSize: 24 },
        badge: {
            fontSize: 10, fontWeight: '800',
            color: t.colors.primary,
            letterSpacing: 2.5, marginBottom: 8,
        },
        title: {
            fontSize: 36, fontWeight: '900',
            color: t.colors.text,
            letterSpacing: 1.5, lineHeight: 42,
            marginBottom: 8,
        },
        subtitle: { fontSize: 13, color: t.colors.textSecondary, lineHeight: 20, marginBottom: 0 },
        phone: { color: t.colors.primary, fontWeight: '800' },

        barTrack: {
            height: 4, backgroundColor: t.colors.divider,
            borderRadius: 2, marginVertical: 22, overflow: 'hidden',
        },
        barFill: {
            height: '100%',
            backgroundColor: t.colors.primary,
            borderRadius: 2,
        },

        /* OTP boxes */
        boxes: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 20,
        },
        box: {
            flex: 1,
            height: 58,
            maxWidth: 58,
            borderWidth: 2,
            borderColor: t.colors.border,
            borderRadius: 16,
            backgroundColor: t.colors.cardSecondary,
            alignItems: 'center',
            justifyContent: 'center',
        },
        boxActive: {
            borderColor: t.colors.primary,
            shadowColor: t.colors.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            elevation: 4,
        },
        boxFilled: {
            borderColor: t.colors.primary,
            backgroundColor: t.dark
                ? 'rgba(245,197,24,0.1)'
                : 'rgba(245,197,24,0.06)',
        },
        boxDigit: { fontSize: 22, fontWeight: '900', color: t.colors.text },
        boxDigitFilled: { color: t.colors.primary },

        /* Resend */
        resendRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 28,
        },
        expiryText: { fontSize: 12, color: t.colors.textSecondary },
        expiryTime: { fontWeight: '800', color: t.colors.text },
        resendBtn: { fontSize: 12, fontWeight: '800', color: t.colors.textSecondary },
        resendBtnActive: { color: t.colors.primary },

        /* Numpad */
        numpad: { gap: 10, marginBottom: 28 },
        row: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
        key: {
            // On web: fixed 120px wide; on native: flex (3 columns)
            width: isWeb ? 120 : undefined,
            flex: isWeb ? undefined : 1,
            height: 54,
            maxWidth: 140,
            borderRadius: 14,
            backgroundColor: t.colors.cardSecondary,
            borderWidth: 1,
            borderColor: t.colors.border,
            alignItems: 'center',
            justifyContent: 'center',
        },
        keyDel: {
            backgroundColor: t.dark ? '#2A1A1A' : '#FFF0F0',
            borderColor: t.dark ? '#3A2020' : '#FECDCD',
        },
        keyEmpty: {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
        },
        keyText: { fontSize: 20, fontWeight: '800', color: t.colors.text },
        keyDelText: { color: t.colors.danger },

        /* Verify button */
        verifyBtn: {
            backgroundColor: t.colors.primary,
            borderRadius: 16, height: 58,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: t.colors.primary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
        },
        verifyBtnDisabled: { opacity: 0.5 },
        verifyBtnText: { fontSize: 16, fontWeight: '900', color: '#000', letterSpacing: 0.5 },
    });
};

export default OTPScreen;
