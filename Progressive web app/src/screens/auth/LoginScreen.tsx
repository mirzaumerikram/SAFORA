import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    KeyboardAvoidingView, Platform, TextInput,
    ScrollView, ActivityIndicator, StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../utils/theme';
import { useLanguage } from '../../context/LanguageContext';
import SaforaAlert from '../../utils/alert';
import { signInWithPhoneNumber } from 'firebase/auth';
import { firebaseAuth, firebaseConfig } from '../../config/firebase';
import { setConfirmationResult } from '../../services/otpStore';

// Native reCAPTCHA (modal, native only)
const FirebaseRecaptchaVerifierModal: any =
    Platform.OS !== 'web'
        ? require('expo-firebase-recaptcha').FirebaseRecaptchaVerifierModal
        : () => null;

// ─── Web reCAPTCHA helpers ─────────────────────────────────────────────────────
// Creates a brand-new invisible RecaptchaVerifier each time.
// Clears the container first so Firebase never sees a "already rendered" error.
const buildWebVerifier = () => {
    if (Platform.OS !== 'web') return null;
    try {
        const { RecaptchaVerifier } = require('firebase/auth');

        // Ensure container div exists in DOM
        let el = document.getElementById('safora-recaptcha');
        if (!el) {
            el = document.createElement('div');
            el.id = 'safora-recaptcha';
            document.body.appendChild(el);
        }
        // Wipe any previously rendered widget so Firebase can start fresh
        el.innerHTML = '';

        return new RecaptchaVerifier(firebaseAuth, el, {
            size: 'invisible',
            callback: () => {},          // reCAPTCHA solved
            'expired-callback': () => {},// reCAPTCHA expired
        });
    } catch (e) {
        console.warn('[reCAPTCHA] build failed:', e);
        return null;
    }
};

// ─── Component ────────────────────────────────────────────────────────────────

const LoginScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route      = useRoute<any>();
    const { theme }  = useAppTheme();
    const { t, isUrdu } = useLanguage();

    const selectedRole: 'passenger' | 'driver' =
        route.params?.selectedRole || 'passenger';
    const isDriver = selectedRole === 'driver';

    const [phone, setPhone]     = useState('');
    const [loading, setLoading] = useState(false);
    const [agreed, setAgreed]   = useState(true);

    // Native reCAPTCHA ref (only used on native)
    const recaptchaRef = useRef<any>(null);

    const s = useMemo(() => makeStyles(theme), [theme]);

    const handleSendOTP = async () => {
        const digits = phone.replace(/\D/g, '');
        if (digits.length < 9 || digits.length > 11) {
            SaforaAlert('Invalid Number', 'Enter a valid Pakistani mobile number.\nExample: 300 1234567');
            return;
        }
        if (!agreed) {
            SaforaAlert('Terms Required', 'Please accept the Safety Terms & Privacy Policy.');
            return;
        }

        setLoading(true);
        // Remove leading zero, prefix +92
        const fullPhone = `+92${digits.replace(/^0/, '')}`;

        try {
            let verifier: any;

            if (Platform.OS === 'web') {
                // Build a fresh verifier each attempt — no "already rendered" errors
                verifier = buildWebVerifier();
                if (!verifier) {
                    SaforaAlert('Error', 'reCAPTCHA failed to initialize. Please refresh and try again.');
                    setLoading(false);
                    return;
                }
            } else {
                verifier = recaptchaRef.current;
            }

            const confirmation = await signInWithPhoneNumber(firebaseAuth, fullPhone, verifier);
            setConfirmationResult(confirmation);

            // Clean up web verifier after successful submission
            if (Platform.OS === 'web') {
                try { verifier.clear(); } catch {}
            }

            navigation.navigate('OTP', { phone: fullPhone, selectedRole });
        } catch (err: any) {
            // Always clean up on error too
            if (Platform.OS === 'web') {
                try {
                    const el = document.getElementById('safora-recaptcha');
                    if (el) el.innerHTML = '';
                } catch {}
            }

            const code = err?.code || '';
            const msg =
                code === 'auth/too-many-requests'
                    ? 'Too many attempts. Wait a few minutes then try again.'
                    : code === 'auth/invalid-phone-number'
                    ? 'Invalid phone number. Check and try again.'
                    : code === 'auth/captcha-check-failed'
                    ? 'reCAPTCHA failed. Refresh the page and try again.'
                    : err?.message || 'Could not send OTP. Please try again.';

            SaforaAlert('OTP Failed', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={s.root}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar
                barStyle={theme.dark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.colors.background}
            />

            {/* Native invisible reCAPTCHA (native builds only) */}
            {Platform.OS !== 'web' && (
                <FirebaseRecaptchaVerifierModal
                    ref={recaptchaRef}
                    firebaseConfig={firebaseConfig}
                    attemptInvisibleVerification
                />
            )}

            <ScrollView
                contentContainerStyle={s.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* ── Center content on wide screens ── */}
                <View style={s.inner}>

                    {/* Back */}
                    <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
                        <Text style={s.backText}>←</Text>
                    </TouchableOpacity>

                    {/* Role badge */}
                    <View style={[s.badge, isDriver && s.badgeDriver]}>
                        <Text style={[s.badgeText, isDriver && s.badgeDriverText]}>
                            {isDriver ? '🚗  DRIVER' : '🧍  PASSENGER'}
                        </Text>
                    </View>

                    {/* Title */}
                    <Text style={[s.title, isUrdu && s.rtl]}>
                        {'WELCOME\nBACK'}
                    </Text>
                    <Text style={[s.subtitle, isUrdu && s.rtl]}>
                        Enter your phone number to receive a one-time verification code.
                    </Text>

                    {/* Phone input */}
                    <Text style={s.label}>PHONE NUMBER</Text>
                    <View style={s.phoneRow}>
                        <View style={s.countryBox}>
                            <Text style={s.flag}>🇵🇰</Text>
                            <Text style={s.cc}>+92</Text>
                        </View>
                        <TextInput
                            style={s.phoneInput}
                            placeholder="300 1234567"
                            placeholderTextColor={theme.colors.placeholder}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            maxLength={11}
                            returnKeyType="done"
                            onSubmitEditing={handleSendOTP}
                            autoFocus={false}
                        />
                    </View>

                    {/* Terms */}
                    <TouchableOpacity
                        style={s.termsRow}
                        activeOpacity={0.7}
                        onPress={() => setAgreed(a => !a)}
                    >
                        <View style={[s.checkbox, agreed && s.checkboxOn]}>
                            {agreed && <Text style={s.checkmark}>✓</Text>}
                        </View>
                        <Text style={s.termsText}>
                            I agree to the{' '}
                            <Text style={s.link}>Safety Terms</Text>
                            {' '}and{' '}
                            <Text style={s.link}>Privacy Policy</Text>
                            {' '}of SAFORA
                        </Text>
                    </TouchableOpacity>

                    {/* Send OTP */}
                    <TouchableOpacity
                        style={[s.btn, loading && s.btnDisabled]}
                        activeOpacity={0.85}
                        onPress={handleSendOTP}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color="#000" />
                            : <Text style={s.btnText}>Get OTP →</Text>
                        }
                    </TouchableOpacity>

                    {/* New user hint */}
                    <View style={s.hintBox}>
                        <Text style={s.hintText}>
                            New to SAFORA?{' '}
                            <Text style={s.link}>Don't worry</Text>
                            {' '}— we'll create your account automatically.
                        </Text>
                    </View>

                    <Text style={s.version}>Build v1.0.8</Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (t: AppTheme) => StyleSheet.create({
    root:  { flex: 1, backgroundColor: t.colors.background },
    scroll: {
        flexGrow: 1,
        alignItems: 'center',          // centre on wide screens
        paddingVertical: 0,
    },
        inner: {
            width: '100%',
            maxWidth: 480,                 // cap width on desktop browsers
            paddingHorizontal: 24,
            paddingTop: 56,
            paddingBottom: 80,
        },

    backBtn: {
        width: 40, height: 40, borderRadius: 13,
        backgroundColor: t.colors.cardSecondary,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 32,
        borderWidth: 1, borderColor: t.colors.border,
    },
    backText: { fontSize: 20, color: t.colors.text, fontWeight: '600' },

    badge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(245,197,24,0.1)',
        borderColor: 'rgba(245,197,24,0.35)',
        borderWidth: 1.5, borderRadius: 22,
        paddingHorizontal: 14, paddingVertical: 6,
        marginBottom: 20,
    },
    badgeDriver: {
        backgroundColor: 'rgba(34,197,94,0.1)',
        borderColor: 'rgba(34,197,94,0.35)',
    },
    badgeText: { fontSize: 11, fontWeight: '800', color: '#F5C518', letterSpacing: 1.5 },
    badgeDriverText: { color: '#22C55E' },

    title: {
        fontSize: 42, fontWeight: '900',
        color: t.colors.text,
        letterSpacing: 2, lineHeight: 50,
        marginBottom: 10,
    },
    rtl: { textAlign: 'right' },
    subtitle: {
        fontSize: 14, color: t.colors.textSecondary,
        lineHeight: 22, marginBottom: 36,
    },

    label: {
        fontSize: 10, fontWeight: '800',
        color: t.colors.primary,
        letterSpacing: 2, marginBottom: 10,
    },
    phoneRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    countryBox: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: t.colors.cardSecondary,
        borderWidth: 1.5, borderColor: t.colors.border,
        borderRadius: 14, paddingHorizontal: 14, height: 56,
    },
    flag: { fontSize: 18 },
    cc: { fontSize: 15, fontWeight: '700', color: t.colors.text },
    phoneInput: {
        flex: 1, height: 56,
        backgroundColor: t.colors.cardSecondary,
        borderWidth: 2, borderColor: t.colors.primary,
        borderRadius: 14, paddingHorizontal: 16,
        fontSize: 17, fontWeight: '600',
        color: t.colors.text, letterSpacing: 0.5,
    },

    termsRow: {
        flexDirection: 'row', alignItems: 'flex-start',
        gap: 10, marginBottom: 32,
    },
    checkbox: {
        width: 20, height: 20, borderRadius: 6,
        borderWidth: 2, borderColor: t.colors.border,
        alignItems: 'center', justifyContent: 'center', marginTop: 1,
    },
    checkboxOn: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
    checkmark: { fontSize: 11, color: '#000', fontWeight: '900' },
    termsText: { flex: 1, fontSize: 13, color: t.colors.textSecondary, lineHeight: 20 },
    link: { color: t.colors.primary, fontWeight: '600' },

    btn: {
        backgroundColor: t.colors.primary,
        borderRadius: 16, height: 58,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 28,
        shadowColor: t.colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
    },
    btnDisabled: { opacity: 0.6 },
    btnText: { fontSize: 17, fontWeight: '800', color: '#000', letterSpacing: 0.5 },

    hintBox: { alignItems: 'center', paddingHorizontal: 8 },
    hintText: { fontSize: 13, color: t.colors.textSecondary, textAlign: 'center', lineHeight: 20 },
    version: { fontSize: 10, color: t.colors.textSecondary, textAlign: 'center', marginTop: 40, opacity: 0.5 },
});

export default LoginScreen;
