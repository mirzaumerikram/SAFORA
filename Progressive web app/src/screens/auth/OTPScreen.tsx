import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
    ScrollView,
    StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import authService from '../../services/auth.service';
import SaforaAlert from '../../utils/alert';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getConfirmationResult, clearConfirmationResult } from '../../services/otpStore';

const { width } = Dimensions.get('window');

const OTPScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { theme } = useAppTheme();
    const { phone } = route.params || { phone: '+92 3XX XXXXXXX' };
    const { setAuthenticated } = useAuth();
    const { t, isUrdu } = useLanguage();

    const [otp, setOtp] = useState<string>('');
    const [timer, setTimer] = useState(90);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleNumPress = (num: string) => {
        if (otp.length < 6) setOtp(otp + num);
    };

    const handleDelete = () => setOtp(otp.slice(0, -1));

    const handleVerify = async () => {
        if (otp.length < 6) return;
        setLoading(true);
        try {
            const confirmationResult = getConfirmationResult();
            if (!confirmationResult) {
                SaforaAlert('Error', 'Session expired. Please request a new OTP.');
                return;
            }
            const credential = await confirmationResult.confirm(otp);
            const idToken = await credential.user.getIdToken();
            clearConfirmationResult();

            const response = await authService.verifyFirebaseToken(idToken);
            if (response.success) {
                if (response.isNewUser) {
                    navigation.navigate('Register', { phone, token: response.token });
                } else {
                    setAuthenticated(true);
                }
            } else {
                SaforaAlert('Error', response.message || 'Verification failed');
            }
        } catch (error: any) {
            SaforaAlert('Error', 'Incorrect OTP. Please check and try again.');
            setOtp('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <TouchableOpacity 
                    style={[styles.backBtn, { backgroundColor: theme.colors.card }]} 
                    onPress={() => navigation.goBack()}
                >
                    <Text style={[styles.backBtnText, { color: theme.colors.text }]}>←</Text>
                </TouchableOpacity>

                <View style={styles.header}>
                    <Text style={styles.emoji}>💬</Text>
                    <Text style={[styles.title, { color: theme.colors.text }, isUrdu && styles.titleUrdu]}>
                        {t.verifyTitle}
                    </Text>
                    <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                        {t.codeSentTo} <Text style={[styles.phoneText, { color: theme.colors.primary }]}>{phone}</Text>
                    </Text>
                </View>

                {/* Custom Timer Bar */}
                <View style={[styles.timerBar, { backgroundColor: theme.colors.divider }]}>
                    <View style={[styles.timerFill, { backgroundColor: theme.colors.primary, width: `${(timer / 90) * 100}%` }]} />
                </View>

                <View style={styles.otpContainer}>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <View 
                            key={i} 
                            style={[
                                styles.otpBox, 
                                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                                otp[i] !== undefined && { borderColor: theme.colors.primary, backgroundColor: theme.dark ? 'rgba(245,197,24,0.1)' : 'rgba(245,197,24,0.05)' },
                                otp.length === i && { borderColor: theme.colors.primary }
                            ]}
                        >
                            <Text style={[styles.otpDigit, { color: theme.colors.text }, otp[i] !== undefined && { color: theme.colors.primary }]}>
                                {otp[i] || ''}
                            </Text>
                        </View>
                    ))}
                </View>

                <View style={styles.resendRow}>
                    <Text style={[styles.codeExpires, { color: theme.colors.textSecondary }]}>
                        {t.codeExpires} <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{formatTime(timer)}</Text>
                    </Text>
                    <TouchableOpacity disabled={timer > 0}>
                        <Text style={[styles.resendBtn, { color: timer > 0 ? theme.colors.textSecondary : theme.colors.primary }]}>
                            {t.resendOtp}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Custom Numpad */}
                <View style={styles.numpad}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <TouchableOpacity key={n} style={[styles.numKey, { backgroundColor: theme.colors.card }]} onPress={() => handleNumPress(n.toString())}>
                            <Text style={[styles.numText, { color: theme.colors.text }]}>{n}</Text>
                        </TouchableOpacity>
                    ))}
                    <View style={styles.numKeyEmpty} />
                    <TouchableOpacity style={[styles.numKey, { backgroundColor: theme.colors.card }]} onPress={() => handleNumPress('0')}>
                        <Text style={[styles.numText, { color: theme.colors.text }]}>0</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.numKey, { backgroundColor: theme.colors.cardSecondary }]} onPress={handleDelete}>
                        <Text style={[styles.numText, { color: theme.colors.text }]}>⌫</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.verifyBtn, { backgroundColor: theme.colors.primary }, (otp.length < 6 || loading) && styles.btnDisabled]}
                    onPress={handleVerify}
                    disabled={otp.length < 6 || loading}
                >
                    {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.verifyBtnText}>{t.verifyBtn}</Text>}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
    backBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    backBtnText: { fontSize: 22 },
    header: { marginBottom: 20 },
    emoji: { fontSize: 28, marginBottom: 8 },
    title: { fontSize: 32, fontWeight: '900', letterSpacing: 1, marginBottom: 6 },
    titleUrdu: { letterSpacing: 0, lineHeight: 42 },
    subtitle: { fontSize: 13, lineHeight: 18 },
    phoneText: { fontWeight: '800' },
    timerBar: { height: 4, borderRadius: 2, marginVertical: 24, overflow: 'hidden' },
    timerFill: { height: '100%' },
    otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
    otpBox: { width: (width - 48 - 40) / 6, height: 56, borderWidth: 2, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    otpDigit: { fontSize: 22, fontWeight: '900' },
    resendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
    codeExpires: { fontSize: 12 },
    resendBtn: { fontSize: 12, fontWeight: '800' },
    numpad: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 32 },
    numKey: { width: (width - 48 - 20) / 3, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    numKeyEmpty: { width: (width - 48 - 20) / 3 },
    numText: { fontSize: 20, fontWeight: '800' },
    verifyBtn: { borderRadius: 18, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
    btnDisabled: { opacity: 0.6 },
    verifyBtnText: { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
});

export default OTPScreen;
