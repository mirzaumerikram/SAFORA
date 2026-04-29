import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import theme from '../../utils/theme';
import authService from '../../services/auth.service';
import SaforaAlert from '../../utils/alert';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getConfirmationResult, clearConfirmationResult } from '../../services/otpStore';

const { width } = Dimensions.get('window');

const OTPScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { phone } = route.params || { phone: '+92 300 123 4567' };
    const { setAuthenticated } = useAuth();
    const { t, isUrdu } = useLanguage();

    const [otp, setOtp] = useState<string>('');
    const [timer, setTimer] = useState(92);
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
        return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleNumPress = (num: string) => {
        if (otp.length < 6) {
            setOtp(otp + num);
        }
    };

    const handleDelete = () => {
        setOtp(otp.slice(0, -1));
    };

    const handleVerify = async () => {
        if (otp.length === 6) {
            setLoading(true);
            try {
                const confirmationResult = getConfirmationResult();
                if (!confirmationResult) {
                    SaforaAlert('Error', 'Session expired. Please go back and request a new OTP.');
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
                const msg = error.code === 'auth/invalid-verification-code'
                    ? 'Incorrect OTP. Please check and try again.'
                    : error.message || 'Verification failed';
                SaforaAlert('Error', msg);
                setOtp('');
            } finally {
                setLoading(false);
            }
        }
    };

    const otpBoxes = [0, 1, 2, 3, 4, 5];

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.backBtnText}>←</Text>
            </TouchableOpacity>

            <View style={styles.otpHeader}>
                <Text style={styles.otpEmoji}>💬</Text>
                <Text style={[styles.title, isUrdu && styles.titleUrdu]}>{t.verifyTitle}</Text>
                <Text style={styles.subtitle}>
                    {t.codeSentTo} <Text style={styles.phoneNumber}>{phone}</Text>
                </Text>
            </View>

            {/* Progress Bar Display */}
            <View style={styles.timerBar}>
                <View style={[styles.timerFill, { width: `${(timer / 92) * 100}%` }]} />
            </View>

            {/* OTP Boxes */}
            <View style={styles.otpContainer}>
                {otpBoxes.map((index) => {
                    const digit = otp[index] || '';
                    const isActive = otp.length === index;
                    return (
                        <View
                            key={index}
                            style={[
                                styles.otpBox,
                                digit !== '' && styles.otpBoxFilled,
                                isActive && styles.otpBoxActive
                            ]}
                        >
                            <Text style={[styles.otpDigit, digit !== '' && styles.otpDigitFilled]}>
                                {digit}
                            </Text>
                        </View>
                    );
                })}
            </View>

            <View style={styles.resendRow}>
                <Text style={styles.resendInfo}>
                    {t.codeExpires} <Text style={styles.expiryTime}>{formatTime(timer)}</Text>
                </Text>
                <TouchableOpacity>
                    <Text style={styles.resendBtn}>{t.resendOtp}</Text>
                </TouchableOpacity>
            </View>

            {/* Custom Numpad */}
            <View style={styles.numpad}>
                <View style={styles.numpadRow}>
                    {['1', '2', '3'].map((n) => (
                        <TouchableOpacity key={n} style={styles.numKey} onPress={() => handleNumPress(n)}>
                            <Text style={styles.numText}>{n}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={styles.numpadRow}>
                    {['4', '5', '6'].map((n) => (
                        <TouchableOpacity key={n} style={styles.numKey} onPress={() => handleNumPress(n)}>
                            <Text style={styles.numText}>{n}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={styles.numpadRow}>
                    {['7', '8', '9'].map((n) => (
                        <TouchableOpacity key={n} style={styles.numKey} onPress={() => handleNumPress(n)}>
                            <Text style={styles.numText}>{n}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={styles.numpadRow}>
                    <TouchableOpacity style={styles.numKey} onPress={() => handleNumPress('*')}>
                        <Text style={styles.numText}>*</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.numKey} onPress={() => handleNumPress('0')}>
                        <Text style={styles.numText}>0</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.numKey, styles.delKey]} onPress={handleDelete}>
                        <Text style={styles.delText}>⌫</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity
                style={[styles.verifyBtn, otp.length < 6 && styles.verifyBtnDisabled]}
                onPress={handleVerify}
                disabled={otp.length < 6 || loading}
            >
                <Text style={styles.verifyBtnText}>{t.verifyBtn}</Text>
            </TouchableOpacity>
        </ScrollView>
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
        paddingTop: 36,
        paddingBottom: 16,
    },
    backBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: theme.colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    backBtnText: {
        color: theme.colors.text,
        fontSize: 18,
    },
    otpHeader: {
        marginBottom: 10,
    },
    otpEmoji: {
        fontSize: 22,
        marginBottom: 6,
    },
    title: {
        fontSize: 26,
        color: theme.colors.text,
        fontWeight: '900',
        letterSpacing: 2,
        lineHeight: 28,
        marginBottom: 4,
    },
    titleUrdu: {
        letterSpacing: 0,
        lineHeight: 38,
    },
    subtitle: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    phoneNumber: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    timerBar: {
        height: 3,
        backgroundColor: theme.colors.divider,
        borderRadius: 2,
        marginVertical: 10,
    },
    timerFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
        borderRadius: 2,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    otpBox: {
        width: (width - 48 - 32) / 5,
        height: 52,
        backgroundColor: theme.colors.card,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    otpBoxFilled: {
        borderColor: theme.colors.primary,
        backgroundColor: 'rgba(245,197,24,0.08)',
    },
    otpBoxActive: {
        borderColor: theme.colors.primary,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    otpDigit: {
        fontSize: 20,
        fontWeight: '900',
        color: theme.colors.text,
    },
    otpDigitFilled: {
        color: theme.colors.primary,
    },
    resendRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    resendInfo: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    expiryTime: {
        color: theme.colors.text,
        fontWeight: '700',
    },
    resendBtn: {
        fontSize: 11,
        color: theme.colors.primary,
        fontWeight: '700',
    },
    numpad: {
        gap: 5,
        marginBottom: 10,
    },
    numpadRow: {
        flexDirection: 'row',
        gap: 5,
    },
    numKey: {
        flex: 1,
        height: 38,
        backgroundColor: theme.colors.card,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    numText: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
    },
    delKey: {
        backgroundColor: '#1f1f1f',
    },
    delText: {
        fontSize: 15,
        color: theme.colors.text,
    },
    verifyBtn: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
    },
    verifyBtnDisabled: {
        opacity: 0.5,
    },
    verifyBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.black,
    },
    devOtpBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,230,118,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(0,230,118,0.3)',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 10,
        flexWrap: 'wrap',
    },
    devOtpLabel: {
        fontSize: 10,
        color: theme.colors.success,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    devOtpCode: {
        fontSize: 16,
        fontWeight: '900',
        color: theme.colors.success,
        letterSpacing: 4,
    },
});

export default OTPScreen;
