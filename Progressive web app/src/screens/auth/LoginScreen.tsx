import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    TextInput,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { signInWithPhoneNumber } from 'firebase/auth';
import { firebaseAuth, firebaseConfig } from '../../config/firebase';
import { setConfirmationResult } from '../../services/otpStore';
import theme from '../../utils/theme';
import authService from '../../services/auth.service';
import SaforaAlert from '../../utils/alert';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

type TabType = 'otp' | 'email';

const LoginScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { setAuthenticated } = useAuth();
    const { t, isUrdu } = useLanguage();

    const [activeTab, setActiveTab] = useState<TabType>('otp');

    // Phone OTP state
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);
    const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);

    // Email/Password state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);

    // --- Phone OTP Flow (Firebase) ---
    const handleGetOTP = async () => {
        const clean = phoneNumber.replace(/\s/g, '');
        if (!clean || clean.length < 9) {
            SaforaAlert('Error', 'Please enter a valid phone number');
            return;
        }
        setOtpLoading(true);
        try {
            const fullPhone = `+92${clean}`;
            const confirmationResult = await signInWithPhoneNumber(
                firebaseAuth,
                fullPhone,
                recaptchaVerifier.current!
            );
            setConfirmationResult(confirmationResult);
            navigation.navigate('OTP', { phone: fullPhone });
        } catch (error: any) {
            SaforaAlert('Error', error.message || 'Failed to send OTP. Try again.');
        } finally {
            setOtpLoading(false);
        }
    };

    // --- Email/Password Flow ---
    const handleEmailLogin = async () => {
        if (!email.trim()) {
            SaforaAlert('Error', 'Please enter your email address');
            return;
        }
        if (!password) {
            SaforaAlert('Error', 'Please enter your password');
            return;
        }
        setEmailLoading(true);
        try {
            const response = await authService.login({ email: email.trim(), password });
            if (response.success) {
                setAuthenticated(true);
            } else {
                SaforaAlert('Login Failed', 'Invalid email or password');
            }
        } catch (error: any) {
            SaforaAlert('Login Failed', error.message || 'Invalid email or password');
        } finally {
            setEmailLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

                {/* Firebase reCAPTCHA — invisible, required for phone auth */}
                <FirebaseRecaptchaVerifierModal
                    ref={recaptchaVerifier}
                    firebaseConfig={firebaseConfig}
                    attemptInvisibleVerification={true}
                />

                {/* Back Button */}
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtnText}>←</Text>
                </TouchableOpacity>

                {/* Badge */}
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{t.passengerLogin}</Text>
                </View>

                <Text style={[styles.title, isUrdu && styles.rtlTitle]}>{t.welcomeBack}</Text>
                <Text style={[styles.subtitle, isUrdu && styles.rtl]}>{t.signInSub}</Text>

                {/* Tab Switcher */}
                <View style={styles.tabSwitcher}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'otp' && styles.tabActive]}
                        onPress={() => setActiveTab('otp')}
                    >
                        <Text style={[styles.tabText, activeTab === 'otp' && styles.tabTextActive]}>
                            {t.phoneOtpTab}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'email' && styles.tabActive]}
                        onPress={() => setActiveTab('email')}
                    >
                        <Text style={[styles.tabText, activeTab === 'email' && styles.tabTextActive]}>
                            {t.emailTab}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* ── Phone OTP Tab ── */}
                {activeTab === 'otp' && (
                    <View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{t.phoneNumberLabel}</Text>
                            <View style={styles.inputRow}>
                                <View style={styles.countryCode}>
                                    <Text style={styles.countryFlag}>🇵🇰</Text>
                                    <Text style={styles.countryText}>+92</Text>
                                </View>
                                <TextInput
                                    style={styles.phoneInput}
                                    placeholder="3XX XXXXXXX"
                                    placeholderTextColor={theme.colors.placeholder}
                                    value={phoneNumber}
                                    onChangeText={setPhoneNumber}
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>

                        <View style={styles.termsRow}>
                            <View style={styles.checkbox}>
                                <Text style={styles.checkMark}>✓</Text>
                            </View>
                            <Text style={styles.termsText}>
                                {t.agreeTerms}{' '}
                                <Text style={styles.linkText}>{t.safetyTerms}</Text> {t.and}{' '}
                                <Text style={styles.linkText}>{t.privacyPolicy}</Text> {t.ofSafora}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.primaryBtn, otpLoading && styles.btnDisabled]}
                            onPress={handleGetOTP}
                            disabled={otpLoading}
                        >
                            {otpLoading
                                ? <ActivityIndicator color={theme.colors.black} />
                                : <Text style={styles.primaryBtnText}>{t.getOtp}</Text>
                            }
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Email / Password Tab ── */}
                {activeTab === 'email' && (
                    <View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{t.emailAddressLabel}</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="you@example.com"
                                placeholderTextColor={theme.colors.placeholder}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{t.passwordLabel}</Text>
                            <View style={styles.passwordRow}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Enter your password"
                                    placeholderTextColor={theme.colors.placeholder}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    style={styles.eyeBtn}
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.forgotRow}>
                            <Text style={styles.forgotText}>{t.forgotPassword}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.primaryBtn, emailLoading && styles.btnDisabled]}
                            onPress={handleEmailLogin}
                            disabled={emailLoading}
                        >
                            {emailLoading
                                ? <ActivityIndicator color={theme.colors.black} />
                                : <Text style={styles.primaryBtnText}>{t.loginBtn}</Text>
                            }
                        </TouchableOpacity>
                    </View>
                )}

                {/* Divider */}
                <View style={styles.socialDivider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>{t.orDivider}</Text>
                    <View style={styles.dividerLine} />
                </View>

                {/* Register Link */}
                <View style={styles.registerRow}>
                    <Text style={styles.registerText}>{t.noAccount} </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                        <Text style={styles.registerLink}>{t.registerLink}</Text>
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
        padding: 24,
        paddingTop: 60,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: theme.colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    backBtnText: {
        color: theme.colors.text,
        fontSize: 20,
    },
    badge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(245,197,24,0.12)',
        borderColor: 'rgba(245,197,24,0.3)',
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 4,
        marginBottom: 18,
    },
    badgeText: {
        fontSize: 11,
        color: theme.colors.primary,
        fontWeight: '700',
        letterSpacing: 1,
    },
    title: {
        fontSize: 42,
        color: theme.colors.text,
        fontWeight: '900',
        letterSpacing: 3,
        lineHeight: 44,
        marginBottom: 8,
    },
    subtitle: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 28,
    },
    // Tab Switcher
    tabSwitcher: {
        flexDirection: 'row',
        backgroundColor: theme.colors.card,
        borderRadius: 14,
        padding: 4,
        marginBottom: 28,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 11,
        alignItems: 'center',
    },
    tabActive: {
        backgroundColor: theme.colors.primary,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.textSecondary,
    },
    tabTextActive: {
        color: theme.colors.black,
    },
    // Phone OTP inputs
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 11,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: theme.colors.primary,
        fontWeight: '700',
        marginBottom: 8,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 10,
    },
    countryCode: {
        backgroundColor: theme.colors.card,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        borderRadius: 12,
        paddingHorizontal: 10,
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    countryFlag: { fontSize: 14 },
    countryText: {
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: '700',
    },
    phoneInput: {
        flex: 1,
        backgroundColor: theme.colors.card,
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 15,
        color: theme.colors.text,
        fontWeight: '600',
        letterSpacing: 1,
        height: 52,
    },
    // Email inputs
    textInput: {
        backgroundColor: theme.colors.card,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 14,
        color: theme.colors.text,
        height: 52,
    },
    passwordRow: {
        flexDirection: 'row',
        backgroundColor: theme.colors.card,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        borderRadius: 12,
        height: 52,
        alignItems: 'center',
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: 16,
        fontSize: 14,
        color: theme.colors.text,
        height: '100%',
    },
    eyeBtn: {
        paddingHorizontal: 14,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    eyeIcon: { fontSize: 16 },
    forgotRow: {
        alignItems: 'flex-end',
        marginBottom: 24,
        marginTop: -8,
    },
    forgotText: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: '600',
    },
    // Terms
    termsRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 28,
    },
    checkbox: {
        width: 18,
        height: 18,
        borderRadius: 5,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
    },
    checkMark: {
        fontSize: 10,
        color: theme.colors.black,
        fontWeight: '900',
    },
    termsText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        lineHeight: 18,
        flex: 1,
    },
    linkText: { color: theme.colors.primary },
    // Buttons
    primaryBtn: {
        backgroundColor: theme.colors.primary,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
    },
    btnDisabled: { opacity: 0.6 },
    primaryBtnText: {
        color: theme.colors.black,
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    // Divider
    socialDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
        gap: 12,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: theme.colors.divider,
    },
    dividerText: {
        color: theme.colors.textSecondary,
        fontSize: 11,
    },
    // Register
    registerRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    registerText: {
        color: theme.colors.textSecondary,
        fontSize: 13,
    },
    registerLink: {
        color: theme.colors.primary,
        fontSize: 13,
        fontWeight: '700',
    },
});

export default LoginScreen;
