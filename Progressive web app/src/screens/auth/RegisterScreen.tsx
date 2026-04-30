import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import authService from '../../services/auth.service';
import apiService from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../../utils/theme';
import { APP_CONSTANTS, AUTH_ENDPOINTS, STORAGE_KEYS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import SaforaAlert from '../../utils/alert';

type Gender = 'male' | 'female' | 'other';

const RegisterScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { setAuthenticated } = useAuth();
    const { t, isUrdu } = useLanguage();

    // If coming from OTP verification, phone + token are pre-filled
    const fromOtp   = !!route.params?.token;
    const otpPhone  = route.params?.phone || '';
    const otpToken  = route.params?.token || '';

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: otpPhone,
        password: '',
        confirmPassword: '',
    });
    const [gender, setGender] = useState<Gender>('male');
    const [errors, setErrors] = useState({
        name: '', email: '', phone: '', password: '', confirmPassword: '',
    });
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [loading, setLoading] = useState(false);

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const validate = (): boolean => {
        const newErrors = { name: '', email: '', phone: '', password: '', confirmPassword: '' };
        let isValid = true;

        if (!formData.name.trim()) { newErrors.name = 'Name is required'; isValid = false; }
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required'; isValid = false;
        } else if (!APP_CONSTANTS.EMAIL_REGEX.test(formData.email)) {
            newErrors.email = 'Please enter a valid email'; isValid = false;
        }
        if (!fromOtp && !formData.phone.trim()) {
            newErrors.phone = 'Phone number is required'; isValid = false;
        }
        if (!formData.password) {
            newErrors.password = 'Password is required'; isValid = false;
        } else if (formData.password.length < APP_CONSTANTS.MIN_PASSWORD_LENGTH) {
            newErrors.password = `Minimum ${APP_CONSTANTS.MIN_PASSWORD_LENGTH} characters`; isValid = false;
        }
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match'; isValid = false;
        }
        if (!acceptedTerms) {
            SaforaAlert('Terms Required', 'Please accept the Terms & Conditions to continue');
            isValid = false;
        }
        setErrors(newErrors);
        return isValid;
    };

    const handleRegister = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            let response: any;

            if (fromOtp) {
                // Complete profile using the OTP-issued token (not yet in AsyncStorage)
                response = await apiService.post(
                    AUTH_ENDPOINTS.COMPLETE_PROFILE,
                    { name: formData.name, email: formData.email, gender, password: formData.password },
                    { headers: { Authorization: `Bearer ${otpToken}` } }
                );
            } else {
                // Fresh registration with phone number
                response = await authService.register({
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    password: formData.password,
                    // @ts-ignore
                    gender,
                });
            }

            if (response.success) {
                if (response.emailVerificationSent && response.user?.email) {
                    // Email registered — go to verification screen first
                    navigation.navigate('VerifyEmail', {
                        email: response.user.email,
                        token: response.token,
                        user: response.user,
                    });
                } else {
                    // Phone-only registration (no email) — go straight in
                    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.token);
                    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response.user));
                    setAuthenticated(true);
                }
            } else {
                SaforaAlert('Error', response.message || 'Registration failed');
            }
        } catch (error: any) {
            SaforaAlert('Error', error.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const genderOptions: { key: Gender; label: string; emoji: string }[] = [
        { key: 'male', label: t.male, emoji: '👨' },
        { key: 'female', label: t.female, emoji: '👩' },
        { key: 'other', label: t.other, emoji: '🧑' },
    ];

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled">

                {/* Header */}
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>

                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{t.createAccountBadge}</Text>
                </View>

                <Text style={[styles.title, isUrdu && styles.titleUrdu]}>{t.joinTitle}</Text>
                <Text style={[styles.subtitle, isUrdu && styles.rtl]}>{t.joinSub}</Text>

                {/* Form Fields */}
                <Input
                    label={t.fullNameLabel}
                    placeholder={t.fullNamePlaceholder}
                    value={formData.name}
                    onChangeText={text => updateField('name', text)}
                    error={errors.name}
                    icon="person-outline"
                    autoCapitalize="words"
                />

                <Input
                    label={t.emailAddressLabel}
                    placeholder={t.emailPlaceholder}
                    value={formData.email}
                    onChangeText={text => updateField('email', text)}
                    error={errors.email}
                    icon="mail-outline"
                    keyboardType="email-address"
                    autoCapitalize="none"
                />

                {fromOtp ? (
                    <View style={styles.lockedField}>
                        <Text style={styles.lockedLabel}>{t.phoneNumberLabel}</Text>
                        <View style={styles.lockedInput}>
                            <Text style={styles.lockedIcon}>📞</Text>
                            <Text style={styles.lockedValue}>{otpPhone}</Text>
                            <Text style={styles.lockedBadge}>✓ Verified</Text>
                        </View>
                    </View>
                ) : (
                    <Input
                        label={t.phoneNumberLabel}
                        placeholder={t.phonePlaceholder}
                        value={formData.phone}
                        onChangeText={text => updateField('phone', text)}
                        error={errors.phone}
                        icon="call-outline"
                        keyboardType="phone-pad"
                    />
                )}

                {/* Gender Selector */}
                <View style={styles.genderSection}>
                    <Text style={styles.genderLabel}>{t.genderLabel}</Text>
                    <View style={styles.genderRow}>
                        {genderOptions.map(opt => (
                            <TouchableOpacity
                                key={opt.key}
                                style={[styles.genderBtn, gender === opt.key && styles.genderBtnActive]}
                                onPress={() => setGender(opt.key)}
                            >
                                <Text style={styles.genderEmoji}>{opt.emoji}</Text>
                                <Text style={[styles.genderText, gender === opt.key && styles.genderTextActive]}>
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <Input
                    label={t.passwordLabel}
                    placeholder={t.passwordPlaceholder}
                    value={formData.password}
                    onChangeText={text => updateField('password', text)}
                    error={errors.password}
                    icon="lock-closed-outline"
                    secureTextEntry
                    autoCapitalize="none"
                />

                <Input
                    label={t.confirmPasswordLabel}
                    placeholder={t.confirmPasswordPlaceholder}
                    value={formData.confirmPassword}
                    onChangeText={text => updateField('confirmPassword', text)}
                    error={errors.confirmPassword}
                    icon="lock-closed-outline"
                    secureTextEntry
                    autoCapitalize="none"
                />

                {/* Terms */}
                <TouchableOpacity
                    style={styles.termsContainer}
                    onPress={() => setAcceptedTerms(!acceptedTerms)}>
                    <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                        {acceptedTerms && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.termsText}>
                        {t.acceptTerms}{' '}
                        <Text style={styles.termsLink}>{t.termsAndConditions}</Text>
                    </Text>
                </TouchableOpacity>

                <Button
                    title={t.createAccountBtn}
                    onPress={handleRegister}
                    loading={loading}
                    style={styles.registerButton}
                />

                <View style={styles.footer}>
                    <Text style={styles.footerText}>{t.alreadyHaveAccount} </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.loginText}>{t.loginLink}</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 40,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: theme.colors.card,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 28,
    },
    backText: { color: theme.colors.text, fontSize: 20 },
    badge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(245,197,24,0.12)',
        borderColor: 'rgba(245,197,24,0.3)',
        borderWidth: 1, borderRadius: 20,
        paddingHorizontal: 12, paddingVertical: 4,
        marginBottom: 16,
    },
    badgeText: { fontSize: 11, color: theme.colors.primary, fontWeight: '700', letterSpacing: 1 },
    title: {
        fontSize: 42, color: theme.colors.text,
        fontWeight: '900', letterSpacing: 3, lineHeight: 44, marginBottom: 8,
    },
    titleUrdu: { letterSpacing: 0, lineHeight: 56, textAlign: 'right' },
    rtl: { textAlign: 'right' },
    subtitle: {
        color: theme.colors.textSecondary, fontSize: 13,
        lineHeight: 20, marginBottom: 28,
    },
    // Gender
    genderSection: { marginBottom: 16 },
    genderLabel: {
        fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
        color: theme.colors.textSecondary, fontWeight: '700', marginBottom: 10,
    },
    genderRow: { flexDirection: 'row', gap: 10 },
    genderBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 12, borderRadius: 12,
        backgroundColor: theme.colors.card,
        borderWidth: 1.5, borderColor: theme.colors.border,
    },
    genderBtnActive: {
        borderColor: theme.colors.primary,
        backgroundColor: 'rgba(245,197,24,0.08)',
    },
    genderEmoji: { fontSize: 14 },
    genderText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
    genderTextActive: { color: theme.colors.primary },
    // Terms
    termsContainer: {
        flexDirection: 'row', alignItems: 'center',
        marginBottom: 24, gap: 10,
    },
    checkbox: {
        width: 22, height: 22, borderRadius: 6,
        borderWidth: 2, borderColor: theme.colors.primary,
        alignItems: 'center', justifyContent: 'center',
    },
    checkboxChecked: { backgroundColor: theme.colors.primary },
    checkmark: { color: theme.colors.black, fontSize: 13, fontWeight: '900' },
    termsText: {
        fontSize: 13, color: theme.colors.textSecondary, flex: 1,
    },
    termsLink: { color: theme.colors.primary, fontWeight: '600' },
    lockedField: { marginBottom: 16 },
    lockedLabel: {
        fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
        color: theme.colors.textSecondary, fontWeight: '700', marginBottom: 8,
    },
    lockedInput: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: theme.colors.card,
        borderWidth: 1.5, borderColor: 'rgba(0,230,118,0.4)',
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, gap: 10,
    },
    lockedIcon: { fontSize: 16 },
    lockedValue: { flex: 1, fontSize: 15, color: theme.colors.text, fontWeight: '600' },
    lockedBadge: { fontSize: 11, color: '#00E676', fontWeight: '700' },
    registerButton: { marginBottom: 16 },
    footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    footerText: { fontSize: 13, color: theme.colors.textSecondary },
    loginText: { fontSize: 13, color: theme.colors.primary, fontWeight: '700' },
});

export default RegisterScreen;
