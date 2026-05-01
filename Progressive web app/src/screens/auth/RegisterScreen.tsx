import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    TextInput,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import authService from '../../services/auth.service';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import SaforaAlert from '../../utils/alert';
import { APP_CONSTANTS } from '../../utils/constants';

type Gender = 'male' | 'female' | 'other';

const RegisterScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { theme } = useAppTheme();
    const { setAuthenticated } = useAuth();
    const { t, isUrdu } = useLanguage();

    const fromOtp   = !!route.params?.token;
    const otpPhone  = route.params?.phone || '';

    // Guard: registration requires phone OTP verification first
    useEffect(() => {
        if (!fromOtp) {
            SaforaAlert(
                'Phone Verification Required',
                'Please verify your phone number with OTP before registering.'
            );
            navigation.replace('Login', { selectedRole: route.params?.selectedRole || 'passenger' });
        }
    }, []);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: otpPhone,
        password: '',
        confirmPassword: '',
    });
    const [gender, setGender] = useState<Gender>('male');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!formData.name.trim() || !formData.email.trim() || !formData.password) {
            SaforaAlert('Error', 'Please fill in all required fields');
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            SaforaAlert('Error', 'Passwords do not match');
            return;
        }
        if (formData.password.length < 6) {
            SaforaAlert('Error', 'Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const response = await authService.register({
                ...formData,
                gender,
                role: 'passenger'
            });
            if (response.success) {
                setAuthenticated(true);
            } else {
                SaforaAlert('Registration Failed', response.message || 'Something went wrong');
            }
        } catch (error: any) {
            SaforaAlert('Registration Failed', error.message || 'Server error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <TouchableOpacity 
                    style={[styles.backBtn, { backgroundColor: theme.colors.card }]} 
                    onPress={() => navigation.goBack()}
                >
                    <Text style={[styles.backBtnText, { color: theme.colors.text }]}>←</Text>
                </TouchableOpacity>

                <View style={[styles.badge, { backgroundColor: theme.dark ? 'rgba(245,197,24,0.15)' : 'rgba(245,197,24,0.1)' }]}>
                    <Text style={[styles.badgeText, { color: theme.colors.primary }]}>{t.createAccount}</Text>
                </View>

                <Text style={[styles.title, { color: theme.colors.text }, isUrdu && styles.rtlTitle]}>
                    {t.registerTitle}
                </Text>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }, isUrdu && styles.rtl]}>
                    {t.registerSub}
                </Text>

                {/* Form Fields */}
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: theme.colors.primary }]}>{t.fullNameLabel}</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                            placeholder="John Doe"
                            placeholderTextColor={theme.colors.placeholder}
                            value={formData.name}
                            onChangeText={(val) => setFormData({...formData, name: val})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: theme.colors.primary }]}>{t.emailAddressLabel}</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                            placeholder="john@example.com"
                            placeholderTextColor={theme.colors.placeholder}
                            value={formData.email}
                            onChangeText={(val) => setFormData({...formData, email: val})}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    {!fromOtp && (
                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: theme.colors.primary }]}>{t.phoneNumberLabel}</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                                placeholder="+92 3XX XXXXXXX"
                                placeholderTextColor={theme.colors.placeholder}
                                value={formData.phone}
                                onChangeText={(val) => setFormData({...formData, phone: val})}
                                keyboardType="phone-pad"
                            />
                        </View>
                    )}

                    {/* Gender Selection */}
                    <Text style={[styles.inputLabel, { color: theme.colors.primary, marginBottom: 12 }]}>{t.selectGender}</Text>
                    <View style={styles.genderRow}>
                        {(['male', 'female'] as const).map((g) => (
                            <TouchableOpacity
                                key={g}
                                style={[
                                    styles.genderCard, 
                                    { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                                    gender === g && { borderColor: theme.colors.primary, backgroundColor: theme.dark ? 'rgba(245,197,24,0.1)' : 'rgba(245,197,24,0.05)' }
                                ]}
                                onPress={() => setGender(g)}
                            >
                                <Text style={styles.genderEmoji}>{g === 'male' ? '👨' : '👩'}</Text>
                                <Text style={[styles.genderLabel, { color: theme.colors.text }]}>{g === 'male' ? t.male : t.female}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: theme.colors.primary }]}>{t.passwordLabel}</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                            placeholder="••••••••"
                            placeholderTextColor={theme.colors.placeholder}
                            value={formData.password}
                            onChangeText={(val) => setFormData({...formData, password: val})}
                            secureTextEntry
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: theme.colors.primary }]}>{t.confirmPasswordLabel}</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                            placeholder="••••••••"
                            placeholderTextColor={theme.colors.placeholder}
                            value={formData.confirmPassword}
                            onChangeText={(val) => setFormData({...formData, confirmPassword: val})}
                            secureTextEntry
                        />
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }, loading && styles.btnDisabled]}
                    onPress={handleRegister}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.primaryBtnText}>{t.registerBtn}</Text>}
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>{t.alreadyAccount} </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                        <Text style={[styles.footerLink, { color: theme.colors.primary }]}>{t.loginLink}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { flexGrow: 1, padding: 24, paddingTop: 60, paddingBottom: 40 },
    backBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    backBtnText: { fontSize: 22 },
    badge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 16 },
    badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    title: { fontSize: 36, fontWeight: '900', letterSpacing: 1, lineHeight: 40, marginBottom: 8 },
    rtlTitle: { textAlign: 'right' },
    subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 32 },
    rtl: { textAlign: 'right' },
    form: { marginBottom: 32 },
    inputGroup: { marginBottom: 20 },
    inputLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' },
    input: { borderWidth: 2, borderRadius: 16, paddingHorizontal: 18, fontSize: 15, height: 56 },
    genderRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    genderCard: { flex: 1, borderWidth: 2, borderRadius: 20, padding: 16, alignItems: 'center', gap: 8 },
    genderEmoji: { fontSize: 24 },
    genderLabel: { fontSize: 14, fontWeight: '700' },
    primaryBtn: { borderRadius: 18, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
    btnDisabled: { opacity: 0.6 },
    primaryBtnText: { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
    footerText: { fontSize: 14 },
    footerLink: { fontSize: 14, fontWeight: '800' },
});

export default RegisterScreen;
