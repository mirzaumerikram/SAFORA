import React, { useState, useRef, useEffect } from 'react';
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
    StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';
import { firebaseAuth, firebaseConfig } from '../../config/firebase';
import { setConfirmationResult } from '../../services/otpStore';
import { useAppTheme } from '../../context/ThemeContext';
import authService from '../../services/auth.service';
import SaforaAlert from '../../utils/alert';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

// Native-only reCAPTCHA modal (not used on web)
const FirebaseRecaptchaVerifierModal: any = Platform.OS !== 'web'
    ? require('expo-firebase-recaptcha').FirebaseRecaptchaVerifierModal
    : () => null;

type TabType = 'otp' | 'email';

const LoginScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { theme } = useAppTheme();
    const { setAuthenticated } = useAuth();
    const { t, isUrdu } = useLanguage();

    // Read the role passed from LanguageRoleScreen
    const selectedRole: 'passenger' | 'driver' = route.params?.selectedRole || 'passenger';
    const isDriver = selectedRole === 'driver';

    const [activeTab, setActiveTab] = useState<TabType>('otp');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);
    const recaptchaVerifier = useRef<any>(null);        // native
    const webRecaptcha = useRef<RecaptchaVerifier | null>(null); // web

    // Initialise invisible reCAPTCHA for web
    useEffect(() => {
        if (Platform.OS === 'web') {
            try {
                if (!document.getElementById('recaptcha-container')) {
                    const recaptchaDiv = document.createElement('div');
                    recaptchaDiv.id = 'recaptcha-container';
                    recaptchaDiv.style.display = 'none';
                    document.body.appendChild(recaptchaDiv);
                }
                if (!webRecaptcha.current) {
                    webRecaptcha.current = new RecaptchaVerifier(
                        firebaseAuth,
                        'recaptcha-container',
                        { size: 'invisible' }
                    );
                }
            } catch (e) {
                console.warn('[reCAPTCHA] init error', e);
            }
        }
    }, []);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);

    const handleGetOTP = async () => {
        const clean = phoneNumber.replace(/\s/g, '');
        if (!clean || clean.length < 9) {
            SaforaAlert('Error', 'Please enter a valid phone number');
            return;
        }
        setOtpLoading(true);
        try {
            const fullPhone = `+92${clean}`;
            // Use the correct verifier depending on platform
            const verifier = Platform.OS === 'web'
                ? webRecaptcha.current!
                : recaptchaVerifier.current!;
            const confirmationResult = await signInWithPhoneNumber(
                firebaseAuth,
                fullPhone,
                verifier
            );
            setConfirmationResult(confirmationResult);
            navigation.navigate('OTP', { phone: fullPhone, selectedRole });
        } catch (error: any) {
            SaforaAlert('Error', error.message || 'Failed to send OTP. Try again.');
        } finally {
            setOtpLoading(false);
        }
    };

    const handleEmailLogin = async () => {
        if (!email.trim() || !password) {
            SaforaAlert('Error', 'Please fill in all fields');
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
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
            {/* Native reCAPTCHA modal (iOS/Android only) */}
            {Platform.OS !== 'web' && (
                <FirebaseRecaptchaVerifierModal
                    ref={recaptchaVerifier}
                    firebaseConfig={firebaseConfig}
                    attemptInvisibleVerification={true}
                />
            )}

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <TouchableOpacity 
                    style={[styles.backBtn, { backgroundColor: theme.colors.card }]} 
                    onPress={() => navigation.goBack()}
                >
                    <Text style={[styles.backBtnText, { color: theme.colors.text }]}>←</Text>
                </TouchableOpacity>

                <View style={[styles.badge, { backgroundColor: theme.dark ? 'rgba(245,197,24,0.15)' : 'rgba(245,197,24,0.1)' }]}>
                    <Text style={[styles.badgeText, { color: theme.colors.primary }]}>
                        {isDriver ? (t.driverLogin || '🚗 DRIVER LOGIN') : (t.passengerLogin || '🛡️ PASSENGER LOGIN')}
                    </Text>
                </View>

                <Text style={[styles.title, { color: theme.colors.text }, isUrdu && styles.rtlTitle]}>
                    {t.welcomeBack}
                </Text>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }, isUrdu && styles.rtl]}>
                    {t.signInSub}
                </Text>

                <View style={[styles.tabSwitcher, { backgroundColor: theme.colors.card }]}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'otp' && { backgroundColor: theme.colors.primary }]}
                        onPress={() => setActiveTab('otp')}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'otp' ? '#000' : theme.colors.textSecondary }]}>
                            {t.phoneOtpTab}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'email' && { backgroundColor: theme.colors.primary }]}
                        onPress={() => setActiveTab('email')}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'email' ? '#000' : theme.colors.textSecondary }]}>
                            {t.emailTab}
                        </Text>
                    </TouchableOpacity>
                </View>

                {activeTab === 'otp' ? (
                    <View>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: theme.colors.primary }]}>{t.phoneNumberLabel}</Text>
                            <View style={styles.inputRow}>
                                <View style={[styles.countryCode, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                                    <Text style={styles.countryFlag}>🇵🇰</Text>
                                    <Text style={[styles.countryText, { color: theme.colors.text }]}>+92</Text>
                                </View>
                                <TextInput
                                    style={[styles.phoneInput, { backgroundColor: theme.colors.card, borderColor: theme.colors.primary, color: theme.colors.text }]}
                                    placeholder="3XX XXXXXXX"
                                    placeholderTextColor={theme.colors.placeholder}
                                    value={phoneNumber}
                                    onChangeText={setPhoneNumber}
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }, otpLoading && styles.btnDisabled]}
                            onPress={handleGetOTP}
                            disabled={otpLoading}
                        >
                            {otpLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.primaryBtnText}>{t.getOtp}</Text>}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: theme.colors.primary }]}>{t.emailAddressLabel}</Text>
                            <TextInput
                                style={[styles.textInput, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                                placeholder="you@example.com"
                                placeholderTextColor={theme.colors.placeholder}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: theme.colors.primary }]}>{t.passwordLabel}</Text>
                            <View style={[styles.passwordRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                                <TextInput
                                    style={[styles.passwordInput, { color: theme.colors.text }]}
                                    placeholder="••••••••"
                                    placeholderTextColor={theme.colors.placeholder}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                                    <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }, emailLoading && styles.btnDisabled]}
                            onPress={handleEmailLogin}
                            disabled={emailLoading}
                        >
                            {emailLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.primaryBtnText}>{t.loginBtn}</Text>}
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.footer}>
                    <View style={styles.socialDivider}>
                        <View style={[styles.dividerLine, { backgroundColor: theme.colors.divider }]} />
                        <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>{t.orDivider}</Text>
                        <View style={[styles.dividerLine, { backgroundColor: theme.colors.divider }]} />
                    </View>
                    <View style={styles.registerRow}>
                        <Text style={[styles.registerText, { color: theme.colors.textSecondary }]}>
                            {t.noAccount || 'New user?'}{' '}
                        </Text>
                        <TouchableOpacity onPress={() => {
                            // New users must verify phone first — switch to OTP tab
                            setActiveTab('otp');
                        }}>
                            <Text style={[styles.registerLink, { color: theme.colors.primary }]}>
                                {t.registerLink || 'Verify phone to register'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.registerHint, { color: theme.colors.placeholder }]}>
                        Enter your phone number above and tap Get OTP to create a new account.
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { flexGrow: 1, padding: 24, paddingTop: 60 },
    backBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    backBtnText: { fontSize: 22 },
    badge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 16 },
    badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    title: { fontSize: 40, fontWeight: '900', letterSpacing: 1, lineHeight: 44, marginBottom: 8 },
    rtlTitle: { textAlign: 'right' },
    subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 32 },
    rtl: { textAlign: 'right' },
    tabSwitcher: { flexDirection: 'row', borderRadius: 16, padding: 5, marginBottom: 32 },
    tab: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    tabText: { fontSize: 14, fontWeight: '700' },
    inputGroup: { marginBottom: 24 },
    inputLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' },
    inputRow: { flexDirection: 'row', gap: 12 },
    countryCode: { borderWidth: 2, borderRadius: 16, paddingHorizontal: 14, height: 56, flexDirection: 'row', alignItems: 'center', gap: 8 },
    countryFlag: { fontSize: 16 },
    countryText: { fontSize: 15, fontWeight: '700' },
    phoneInput: { flex: 1, borderWidth: 2, borderRadius: 16, paddingHorizontal: 18, fontSize: 16, fontWeight: '700', letterSpacing: 1.5, height: 56 },
    textInput: { borderWidth: 2, borderRadius: 16, paddingHorizontal: 18, fontSize: 15, height: 56 },
    passwordRow: { flexDirection: 'row', borderWidth: 2, borderRadius: 16, height: 56, alignItems: 'center' },
    passwordInput: { flex: 1, paddingHorizontal: 18, fontSize: 15, height: '100%' },
    eyeBtn: { paddingHorizontal: 16 },
    eyeIcon: { fontSize: 18 },
    primaryBtn: { borderRadius: 18, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
    btnDisabled: { opacity: 0.6 },
    primaryBtnText: { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
    footer: { marginTop: 40 },
    socialDivider: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 16 },
    dividerLine: { flex: 1, height: 1 },
    dividerText: { fontSize: 12, fontWeight: '600' },
    registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    registerText: { fontSize: 14 },
    registerLink: { fontSize: 14, fontWeight: '800' },
    registerHint: { fontSize: 11, textAlign: 'center', marginTop: 8, lineHeight: 16, paddingHorizontal: 16 },
});

export default LoginScreen;
