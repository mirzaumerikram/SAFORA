import React, { useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, ActivityIndicator, Platform, Alert, Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../utils/theme';
import apiService from '../../services/api';
import { STORAGE_KEYS } from '../../utils/constants';

type Step = 1 | 2;

interface FormData {
    licenseNumber: string;
    cnic: string;
    fullName: string;
    vehicleType: 'car' | 'bike' | 'rickshaw';
    vehicleMake: string;
    vehicleModel: string;
    vehicleYear: string;
    vehicleColor: string;
    vehiclePlate: string;
}

const VEHICLE_TYPES = [
    { key: 'car',      label: 'Car',      icon: '🚗' },
    { key: 'bike',     label: 'Bike',     icon: '🏍️' },
    { key: 'rickshaw', label: 'Rickshaw', icon: '🛺' },
] as const;

const DriverOnboardingScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { theme } = useAppTheme();
    const s = useMemo(() => makeStyles(theme), [theme]);

    const [step, setStep] = useState<Step>(1);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<FormData>({
        licenseNumber: '',
        cnic: '',
        fullName: '',
        vehicleType: 'car',
        vehicleMake: '',
        vehicleModel: '',
        vehicleYear: '',
        vehicleColor: '',
        vehiclePlate: '',
    });
    const [errors, setErrors] = useState<Partial<Record<keyof FormData, boolean>>>({});
    const [errorModal, setErrorModal] = useState<{ visible: boolean; msg: string }>({ visible: false, msg: '' });

    const set = (key: keyof FormData, val: string) => {
        setForm(prev => ({ ...prev, [key]: val }));
        if (errors[key]) setErrors(prev => ({ ...prev, [key]: false }));
    };

    const validateStep1 = () => {
        const newErrors: Partial<Record<keyof FormData, boolean>> = {};
        let msg = '';

        if (form.licenseNumber.trim().length < 5) {
            newErrors.licenseNumber = true;
            msg = 'Please enter a valid Driving License number (e.g. DL-1234-5678).';
        } else if (!/^\d{13}$/.test(form.cnic.replace(/-/g, ''))) {
            newErrors.cnic = true;
            msg = 'CNIC must be 13 digits (e.g. 35201-1234567-1).';
        } else if (!form.fullName.trim()) {
            newErrors.fullName = true;
            msg = 'Full name as per CNIC is required.';
        }

        setErrors(newErrors);
        
        if (Object.keys(newErrors).length > 0) {
            setErrorModal({ visible: true, msg });
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        const newErrors: Partial<Record<keyof FormData, boolean>> = {};
        let msg = '';

        if (!form.vehicleMake.trim() || !form.vehicleModel.trim()) {
            newErrors.vehicleMake = true;
            newErrors.vehicleModel = true;
            msg = 'Vehicle make and model are required.';
        } else if (!form.vehiclePlate.trim()) {
            newErrors.vehiclePlate = true;
            msg = 'Vehicle registration plate is required.';
        } else {
            const year = parseInt(form.vehicleYear);
            if (!year || year < 1990 || year > new Date().getFullYear() + 1) {
                newErrors.vehicleYear = true;
                msg = 'Please enter a valid vehicle year (1990 - 2026).';
            }
        }

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            setErrorModal({ visible: true, msg });
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateStep2()) return;
        setLoading(true);
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
            const user = raw ? JSON.parse(raw) : {};

            await apiService.post('/drivers/register', {
                licenseNumber: form.licenseNumber,
                cnic: form.cnic.replace(/-/g, ''),
                fullName: form.fullName,
                vehicleType: form.vehicleType,
                vehicleInfo: {
                    make:        form.vehicleMake,
                    model:       form.vehicleModel,
                    year:        parseInt(form.vehicleYear),
                    color:       form.vehicleColor,
                    plateNumber: form.vehiclePlate.toUpperCase(),
                },
            });

            await AsyncStorage.setItem(
                STORAGE_KEYS.USER_DATA,
                JSON.stringify({ ...user, driverRegistered: true, role: 'driver' })
            );

            navigation.reset({ index: 0, routes: [{ name: 'DriverApp' }] });
        } catch (e: any) {
            Alert.alert('Registration Failed', e.message || 'Could not register. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={s.container}>
            {/* ── Custom Error Modal ── */}
            <Modal
                visible={errorModal.visible}
                transparent
                animationType="fade"
                onRequestClose={() => setErrorModal({ ...errorModal, visible: false })}
            >
                <View style={s.modalOverlay}>
                    <TouchableOpacity 
                        style={s.modalBackdrop} 
                        activeOpacity={1} 
                        onPress={() => setErrorModal({ ...errorModal, visible: false })} 
                    />
                    <View style={s.errorBox}>
                        <View style={s.errorIconCircle}>
                            <Text style={s.errorIcon}>⚠️</Text>
                        </View>
                        <Text style={styles.errorTitle}>Validation Error</Text>
                        <Text style={styles.errorText}>{errorModal.msg}</Text>
                        <TouchableOpacity 
                            style={s.errorBtn}
                            onPress={() => setErrorModal({ ...errorModal, visible: false })}
                        >
                            <Text style={s.errorBtnText}>Got it</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity
                    onPress={() => (step === 2 ? setStep(1) : navigation.goBack())}
                    style={s.backBtn}
                >
                    <Text style={s.backText}>←</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <View style={s.stepBadge}>
                    <Text style={s.stepBadgeText}>STEP {step} OF 2</Text>
                </View>
            </View>

            {/* Progress track */}
            <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: step === 1 ? '50%' : '100%' }]} />
            </View>

            <ScrollView
                contentContainerStyle={s.scroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {step === 1 ? (
                    <>
                        {/* Step 1 heading */}
                        <Text style={s.screenTitle}>LICENSE &{'\n'}IDENTITY</Text>
                        <Text style={s.screenSub}>
                            We verify all drivers to keep SAFORA safe for everyone.
                        </Text>

                        {/* Driving License Number */}
                        <Text style={s.sectionLabel}>DRIVING LICENSE NUMBER</Text>
                        <TextInput
                            style={[s.input, errors.licenseNumber && s.inputError]}
                            placeholder="DL-XXXX-XXXXXX"
                            placeholderTextColor={theme.colors.placeholder}
                            value={form.licenseNumber}
                            onChangeText={v => set('licenseNumber', v)}
                            autoCapitalize="characters"
                        />

                        {/* CNIC Number */}
                        <Text style={s.sectionLabel}>CNIC NUMBER</Text>
                        <TextInput
                            style={[s.input, errors.cnic && s.inputError]}
                            placeholder="XXXXX-XXXXXXX-X"
                            placeholderTextColor={theme.colors.placeholder}
                            value={form.cnic}
                            onChangeText={v => set('cnic', v)}
                            keyboardType="numeric"
                            maxLength={15}
                        />

                        {/* Full Name */}
                        <Text style={s.sectionLabel}>FULL NAME (AS ON CNIC)</Text>
                        <TextInput
                            style={[s.input, errors.fullName && s.inputError]}
                            placeholder="Your Full Name"
                            placeholderTextColor={theme.colors.placeholder}
                            value={form.fullName}
                            onChangeText={v => set('fullName', v)}
                            autoCapitalize="words"
                        />

                        {/* Info notice */}
                        <View style={s.infoCard}>
                            <Text style={s.infoCardText}>
                                🔒  Your information is encrypted and only used for verification purposes.
                            </Text>
                        </View>

                        {/* Continue */}
                        <TouchableOpacity
                            style={s.primaryBtn}
                            onPress={() => validateStep1() && setStep(2)}
                        >
                            <Text style={s.primaryBtnText}>Continue →</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        {/* Step 2 heading */}
                        <Text style={s.screenTitle}>VEHICLE{'\n'}INFORMATION</Text>
                        <Text style={s.screenSub}>
                            Enter your registered vehicle details. Registration plate must match your vehicle.
                        </Text>

                        {/* Vehicle type selector */}
                        <Text style={s.sectionLabel}>VEHICLE TYPE</Text>
                        <View style={s.typeRow}>
                            {VEHICLE_TYPES.map(t => (
                                <TouchableOpacity
                                    key={t.key}
                                    style={[
                                        s.typeBtn,
                                        form.vehicleType === t.key && s.typeBtnActive,
                                    ]}
                                    onPress={() => set('vehicleType', t.key)}
                                >
                                    <Text style={s.typeIcon}>{t.icon}</Text>
                                    <Text style={[
                                        s.typeLabel,
                                        form.vehicleType === t.key && s.typeLabelActive,
                                    ]}>
                                        {t.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Make + Model */}
                        <View style={s.row}>
                            <View style={s.halfField}>
                                <Text style={s.sectionLabel}>MAKE</Text>
                                <TextInput
                                    style={[s.input, errors.vehicleMake && s.inputError]}
                                    placeholder="e.g. Toyota"
                                    placeholderTextColor={theme.colors.placeholder}
                                    value={form.vehicleMake}
                                    onChangeText={v => set('vehicleMake', v)}
                                />
                            </View>
                            <View style={s.halfField}>
                                <Text style={s.sectionLabel}>MODEL</Text>
                                <TextInput
                                    style={[s.input, errors.vehicleModel && s.inputError]}
                                    placeholder="e.g. Corolla"
                                    placeholderTextColor={theme.colors.placeholder}
                                    value={form.vehicleModel}
                                    onChangeText={v => set('vehicleModel', v)}
                                />
                            </View>
                        </View>

                        {/* Year + Color */}
                        <View style={s.row}>
                            <View style={s.halfField}>
                                <Text style={s.sectionLabel}>YEAR</Text>
                                <TextInput
                                    style={[s.input, errors.vehicleYear && s.inputError]}
                                    placeholder="YYYY"
                                    placeholderTextColor={theme.colors.placeholder}
                                    value={form.vehicleYear}
                                    onChangeText={v => set('vehicleYear', v)}
                                    keyboardType="numeric"
                                    maxLength={4}
                                />
                            </View>
                            <View style={s.halfField}>
                                <Text style={s.sectionLabel}>COLOR</Text>
                                <TextInput
                                    style={[s.input, errors.vehicleColor && s.inputError]}
                                    placeholder="e.g. White"
                                    placeholderTextColor={theme.colors.placeholder}
                                    value={form.vehicleColor}
                                    onChangeText={v => set('vehicleColor', v)}
                                />
                            </View>
                        </View>

                        {/* Plate */}
                        <Text style={s.sectionLabel}>REGISTRATION PLATE</Text>
                        <TextInput
                            style={[s.input, errors.vehiclePlate && s.inputError]}
                            placeholder="ABC-1234"
                            placeholderTextColor={theme.colors.placeholder}
                            value={form.vehiclePlate}
                            onChangeText={v => set('vehiclePlate', v)}
                            autoCapitalize="characters"
                        />

                        {/* Info notice */}
                        <View style={s.infoCard}>
                            <Text style={s.infoCardText}>
                                🔒  Your registration will be reviewed by SAFORA within 24 hours. You will be notified once approved.
                            </Text>
                        </View>

                        {/* Submit */}
                        <TouchableOpacity
                            style={[s.primaryBtn, loading && { opacity: 0.6 }]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading
                                ? <ActivityIndicator color={theme.colors.black} />
                                : <Text style={s.primaryBtnText}>Submit Registration →</Text>
                            }
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </View>
    );
};

const makeStyles = (t: AppTheme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: t.colors.background,
    },

    /* ── Header ── */
    header: {
        paddingTop: Platform.OS === 'ios' ? 56 : 46,
        paddingHorizontal: 20,
        paddingBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: t.colors.card,
        borderWidth: 1,
        borderColor: t.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backText: {
        color: t.colors.text,
        fontSize: 20,
    },
    stepBadge: {
        backgroundColor: t.colors.primary,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 5,
    },
    stepBadgeText: {
        color: t.colors.black,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.5,
    },

    /* ── Progress ── */
    progressTrack: {
        height: 3,
        backgroundColor: t.colors.border,
        marginHorizontal: 20,
        borderRadius: 2,
    },
    progressFill: {
        height: 3,
        backgroundColor: t.colors.primary,
        borderRadius: 2,
    },

    /* ── Scroll content ── */
    scroll: {
        paddingHorizontal: 20,
        paddingTop: 28,
        paddingBottom: 60,
    },

    /* ── Titles ── */
    screenTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: t.colors.text,
        letterSpacing: 1,
        lineHeight: 38,
        marginBottom: 10,
    },
    screenSub: {
        fontSize: 13,
        color: t.colors.textSecondary,
        lineHeight: 20,
        marginBottom: 32,
    },

    /* ── Section labels (yellow) ── */
    sectionLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: t.colors.primary,
        letterSpacing: 1.5,
        marginBottom: 8,
        marginTop: 20,
    },

    /* ── Inputs ── */
    input: {
        backgroundColor: t.colors.inputBg,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: t.colors.text,
        fontSize: 15,
        borderWidth: 1,
        borderColor: t.colors.border,
    },
    inputError: {
        borderColor: t.colors.danger,
        backgroundColor: 'rgba(239,68,68,0.05)',
    },

    /* ── Info card ── */
    infoCard: {
        backgroundColor: 'rgba(245,197,24,0.08)',
        borderRadius: 14,
        padding: 14,
        marginTop: 24,
        borderWidth: 1,
        borderColor: 'rgba(245,197,24,0.25)',
    },
    infoCardText: {
        fontSize: 12,
        color: t.colors.text,
        lineHeight: 19,
    },

    /* ── Primary button ── */
    primaryBtn: {
        backgroundColor: t.colors.primary,
        borderRadius: 16,
        paddingVertical: 17,
        alignItems: 'center',
        marginTop: 28,
    },
    primaryBtnText: {
        color: t.colors.black,
        fontWeight: '900',
        fontSize: 15,
        letterSpacing: 0.5,
    },

    /* ── Vehicle type pills ── */
    typeRow: {
        flexDirection: 'row',
        gap: 10,
    },
    typeBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: t.colors.inputBg,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: t.colors.border,
    },
    typeBtnActive: {
        borderColor: t.colors.primary,
        backgroundColor: 'rgba(245,197,24,0.08)',
    },
    typeIcon: {
        fontSize: 22,
        marginBottom: 4,
    },
    typeLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: t.colors.textSecondary,
    },
    typeLabelActive: {
        color: t.colors.primary,
    },

    /* ── Two-column rows ── */
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfField: {
        flex: 1,
    },

    /* ── Modal & Errors ── */
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        padding: 30,
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    errorBox: {
        backgroundColor: '#1A1A1A',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.3)',
    },
    errorIconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(239,68,68,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    errorIcon: {
        fontSize: 24,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: 10,
    },
    errorText: {
        fontSize: 14,
        color: '#A0A0A0',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 28,
    },
    errorBtn: {
        backgroundColor: t.colors.primary,
        borderRadius: 14,
        paddingVertical: 14,
        width: '100%',
        alignItems: 'center',
    },
    errorBtnText: {
        color: '#000000',
        fontWeight: '800',
        fontSize: 15,
    },
});

const styles = StyleSheet.create({
    errorTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: 10,
    },
    errorText: {
        fontSize: 14,
        color: '#A0A0A0',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 28,
    },
});

export default DriverOnboardingScreen;
