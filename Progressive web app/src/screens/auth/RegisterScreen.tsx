import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    KeyboardAvoidingView, Platform, TextInput,
    ActivityIndicator, StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../utils/theme';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import authService from '../../services/auth.service';
import SaforaAlert from '../../utils/alert';

// ─── Types ────────────────────────────────────────────────────────────────────

type Gender = 'male' | 'female' | 'other';

// ─── Component ────────────────────────────────────────────────────────────────

const RegisterScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route      = useRoute<any>();
    const { theme }  = useAppTheme();
    const { setAuthenticated } = useAuth();
    const { t, isUrdu } = useLanguage();

    // Params passed from OTPScreen after successful Firebase verification
    const otpToken     : string                    = route.params?.token      || '';
    const otpPhone     : string                    = route.params?.phone      || '';
    const selectedRole : 'passenger' | 'driver'    = route.params?.selectedRole || 'passenger';
    const isDriver = selectedRole === 'driver';

    // Guard: must arrive here via OTP flow
    useEffect(() => {
        if (!otpToken) {
            SaforaAlert(
                'Verification Required',
                'Please verify your phone number with OTP before registering.'
            );
            navigation.replace('Login', { selectedRole });
        }
    }, []);

    // ── Form state ────────────────────────────────────────────────────────────
    const [name,   setName]   = useState('');
    const [email,  setEmail]  = useState('');
    const [cnic,   setCnic]   = useState('');
    const [cnicError, setCnicError] = useState('');
    const [gender, setGender] = useState<Gender>('male');
    const [agreed, setAgreed] = useState(false);
    const [loading, setLoading] = useState(false);

    // ── CNIC helpers ──────────────────────────────────────────────────────────
    // Pakistani CNIC format: XXXXX-XXXXXXX-X (13 digits, 15 chars with dashes)
    const CNIC_REGEX = /^\d{5}-\d{7}-\d{1}$/;

    const formatCnic = (raw: string) => {
        const digits = raw.replace(/\D/g, '').slice(0, 13);
        if (digits.length <= 5)  return digits;
        if (digits.length <= 12) return `${digits.slice(0,5)}-${digits.slice(5)}`;
        return `${digits.slice(0,5)}-${digits.slice(5,12)}-${digits.slice(12)}`;
    };

    const handleCnicChange = (text: string) => {
        const formatted = formatCnic(text);
        setCnic(formatted);
        if (formatted && !CNIC_REGEX.test(formatted)) {
            setCnicError('Format must be XXXXX-XXXXXXX-X');
        } else {
            setCnicError('');
        }
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleRegister = async () => {
        if (!name.trim()) {
            SaforaAlert('Required', 'Please enter your full name.'); return;
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            SaforaAlert('Invalid Email', 'Please enter a valid email address.'); return;
        }
        if (cnic && !CNIC_REGEX.test(cnic)) {
            SaforaAlert('Invalid CNIC', 'CNIC must be in format XXXXX-XXXXXXX-X (13 digits).'); return;
        }
        if (!agreed) {
            SaforaAlert('Terms Required', 'Please accept the Terms & Conditions to continue.'); return;
        }

        setLoading(true);
        try {
            // Call complete-profile — the user already exists as a placeholder
            // created by verify-firebase-token on the backend
            const response = await authService.completeProfile(
                {
                    name:   name.trim(),
                    email:  email.trim() || undefined,
                    gender,
                    cnic:   cnic.trim()  || undefined,
                    role:   selectedRole,
                },
                otpToken
            );

            if (response.success) {
                // Persist selected role so AuthContext resolves it correctly
                await AsyncStorage.setItem('@safora_selected_role', selectedRole);
                setAuthenticated(true);
            } else {
                SaforaAlert('Registration Failed', response.message || 'Something went wrong. Please try again.');
            }
        } catch (err: any) {
            SaforaAlert('Registration Failed', err.message || 'Server error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const s = useMemo(() => makeStyles(theme), [theme]);

    return (
        <KeyboardAvoidingView
            style={s.root}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar
                barStyle={theme.dark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.colors.background}
            />
            <ScrollView
                contentContainerStyle={s.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Back Button */}
                <TouchableOpacity 
                    style={s.backBtn} 
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <Text style={s.backIcon}>← Back</Text>
                </TouchableOpacity>

                {/* Badge */}
                <View style={[s.badge, isDriver && s.badgeDriver]}>
                    <Text style={s.badgeEmoji}>{isDriver ? '🚗' : '🧍'}</Text>
                    <Text style={[s.badgeText, isDriver && s.badgeTextDriver]}>
                        {isDriver ? 'BECOME A DRIVER' : 'CREATE ACCOUNT'}
                    </Text>
                </View>

                {/* Title */}
                <Text style={[s.title, isUrdu && s.rtl]}>
                    {isDriver ? 'Earn with SAFORA' : 'Join SAFORA'}
                </Text>
                <Text style={[s.subtitle, isUrdu && s.rtl]}>
                    {isDriver
                        ? 'Complete your profile to start earning safely on SAFORA.'
                        : 'Create your account to ride safely across Pakistan.'}
                </Text>

                {/* Phone (pre-filled, read-only) */}
                <Text style={s.label}>PHONE NUMBER (VERIFIED ✓)</Text>
                <View style={s.phoneDisplay}>
                    <Text style={s.flagText}>🇵🇰</Text>
                    <Text style={s.phoneText}>{otpPhone || '+92 — verified'}</Text>
                    <View style={s.verifiedBadge}>
                        <Text style={s.verifiedText}>✓ OTP</Text>
                    </View>
                </View>

                {/* Full Name */}
                <Text style={s.label}>FULL NAME</Text>
                <TextInput
                    style={s.input}
                    placeholder="Ayesha Khan"
                    placeholderTextColor={theme.colors.placeholder}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                />

                {/* Email */}
                <Text style={s.label}>EMAIL ADDRESS <Text style={s.optional}>(optional)</Text></Text>
                <TextInput
                    style={s.input}
                    placeholder="ayesha@example.com"
                    placeholderTextColor={theme.colors.placeholder}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />

                {/* Gender */}
                <Text style={s.label}>GENDER</Text>
                <View style={s.genderRow}>
                    {(['male', 'female', 'other'] as Gender[]).map(g => (
                        <TouchableOpacity
                            key={g}
                            style={[s.genderPill, gender === g && s.genderPillActive]}
                            activeOpacity={0.75}
                            onPress={() => setGender(g)}
                        >
                            <Text style={[s.genderText, gender === g && s.genderTextActive]}>
                                {g.charAt(0).toUpperCase() + g.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* CNIC */}
                <Text style={s.label}>CNIC NUMBER <Text style={s.optional}>(optional)</Text></Text>
                <TextInput
                    style={[s.input, cnicError ? s.inputError : null]}
                    placeholder="XXXXX-XXXXXXX-X"
                    placeholderTextColor={theme.colors.placeholder}
                    value={cnic}
                    onChangeText={handleCnicChange}
                    keyboardType="number-pad"
                    maxLength={15}
                />
                {cnicError ? <Text style={s.fieldError}>{cnicError}</Text> : null}

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
                        <Text style={s.termsLink}>Terms</Text>
                        {', '}
                        <Text style={s.termsLink}>Privacy Policy</Text>
                        {' and '}
                        <Text style={s.termsLink}>Safety Guidelines</Text>
                        {' of SAFORA'}
                    </Text>
                </TouchableOpacity>

                {/* Submit */}
                <TouchableOpacity
                    style={[s.submitBtn, loading && s.btnDisabled]}
                    activeOpacity={0.85}
                    onPress={handleRegister}
                    disabled={loading}
                >
                    {loading
                        ? <ActivityIndicator color="#000" />
                        : <Text style={s.submitText}>
                            {isDriver ? 'Create Driver Account →' : 'Create Account →'}
                          </Text>
                    }
                </TouchableOpacity>

                {/* Already have account */}
                <TouchableOpacity
                    style={s.loginRow}
                    onPress={() => navigation.replace('Login', { selectedRole })}
                >
                    <Text style={s.loginText}>
                        Already have an account?{' '}
                        <Text style={s.loginLink}>Sign In</Text>
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (t: AppTheme) =>
    StyleSheet.create({
        root:   { flex: 1, backgroundColor: t.colors.background },
        scroll: { 
            flexGrow: 1, 
            paddingHorizontal: 24, 
            paddingTop: 56, 
            paddingBottom: 80,
            maxWidth: 500,
            alignSelf: 'center',
            width: '100%',
        },

        backBtn: {
            width: 40, height: 40, borderRadius: 13,
            backgroundColor: t.colors.cardSecondary,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 28,
            borderWidth: 1, borderColor: t.colors.border,
        },
        backBtn: {
            width: 'auto',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: t.colors.card,
            borderWidth: 1,
            borderColor: t.colors.border,
            marginBottom: 16,
            alignSelf: 'flex-start',
        },
        backIcon: {
            fontSize: 14,
            fontWeight: '600',
            color: t.colors.text,
        },
        backText: { fontSize: 20, color: t.colors.text, fontWeight: '600' },

        badge: {
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            backgroundColor: 'rgba(245,197,24,0.1)',
            borderColor: 'rgba(245,197,24,0.35)',
            borderWidth: 1.5, borderRadius: 22,
            paddingHorizontal: 14, paddingVertical: 6,
            marginBottom: 18,
            gap: 6,
        },
        badgeEmoji: {
            fontSize: 14,
        },
        badgeDriver: {
            backgroundColor: 'rgba(34,197,94,0.1)',
            borderColor: 'rgba(34,197,94,0.35)',
        },
        badgeText: {
            fontSize: 11, fontWeight: '800',
            color: '#F5C518', letterSpacing: 1.5,
        },
        badgeTextDriver: { color: '#22C55E' },

        title: {
            fontSize: 38, fontWeight: '900',
            color: t.colors.text,
            letterSpacing: 2, lineHeight: 44,
            marginBottom: 8,
        },
        rtl: { textAlign: 'right' },
        subtitle: {
            fontSize: 14, color: t.colors.textSecondary,
            lineHeight: 22, marginBottom: 28,
        },

        label: {
            fontSize: 10, fontWeight: '800',
            color: t.colors.primary,
            letterSpacing: 2, marginBottom: 8, marginTop: 4,
        },
        optional: { color: t.colors.textSecondary, fontWeight: '400', fontSize: 9 },

        phoneDisplay: {
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: t.colors.cardSecondary,
            borderWidth: 1, borderColor: t.colors.border,
            borderRadius: 14, paddingHorizontal: 16, height: 52,
            marginBottom: 20, gap: 10,
        },
        flagText: { fontSize: 18 },
        phoneText: { flex: 1, fontSize: 15, fontWeight: '600', color: t.colors.text },
        verifiedBadge: {
            backgroundColor: 'rgba(34,197,94,0.15)',
            borderColor: 'rgba(34,197,94,0.4)',
            borderWidth: 1, borderRadius: 10,
            paddingHorizontal: 8, paddingVertical: 3,
        },
        verifiedText: { fontSize: 11, fontWeight: '700', color: '#22C55E' },

        input: {
            height: 52,
            backgroundColor: t.colors.cardSecondary,
            borderWidth: 1.5, borderColor: t.colors.border,
            borderRadius: 14, paddingHorizontal: 16,
            fontSize: 15, color: t.colors.text,
            marginBottom: 4,
        },
        inputError: {
            borderColor: '#EF4444',
            marginBottom: 0,
        },
        fieldError: {
            fontSize: 11, color: '#EF4444', fontWeight: '600',
            marginBottom: 16, marginTop: 4, paddingHorizontal: 4,
        },

        genderRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
        genderPill: {
            flex: 1, height: 44, borderRadius: 12,
            borderWidth: 1.5, borderColor: t.colors.border,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: t.colors.cardSecondary,
        },
        genderPillActive: {
            borderColor: t.colors.primary,
            backgroundColor: t.dark
                ? 'rgba(245,197,24,0.1)'
                : 'rgba(245,197,24,0.08)',
        },
        genderText: { fontSize: 14, fontWeight: '600', color: t.colors.textSecondary },
        genderTextActive: { color: t.colors.primary, fontWeight: '700' },

        termsRow: {
            flexDirection: 'row', alignItems: 'flex-start',
            gap: 10, marginBottom: 28,
        },
        checkbox: {
            width: 20, height: 20, borderRadius: 6,
            borderWidth: 2, borderColor: t.colors.border,
            alignItems: 'center', justifyContent: 'center',
            marginTop: 1,
        },
        checkboxOn: {
            backgroundColor: t.colors.primary,
            borderColor: t.colors.primary,
        },
        checkmark: { fontSize: 11, color: '#000', fontWeight: '900' },
        termsText: {
            flex: 1, fontSize: 13,
            color: t.colors.textSecondary, lineHeight: 20,
        },
        termsLink: { color: t.colors.primary, fontWeight: '600' },

        submitBtn: {
            backgroundColor: t.colors.primary,
            borderRadius: 16, height: 56,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
            shadowColor: t.colors.primary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
        },
        btnDisabled: { opacity: 0.6 },
        submitText: { fontSize: 16, fontWeight: '800', color: '#000' },

        loginRow: { alignItems: 'center' },
        loginText: { fontSize: 13, color: t.colors.textSecondary },
        loginLink: { color: t.colors.primary, fontWeight: '700' },
    });

export default RegisterScreen;
