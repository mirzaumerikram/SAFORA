import React, { useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, ActivityIndicator, Platform, Alert,
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

    const set = (key: keyof FormData, val: string) => {
        setForm(prev => ({ ...prev, [key]: val }));
        if (errors[key]) setErrors(prev => ({ ...prev, [key]: false }));
    };

    const validateStep1 = () => {
        const newErrors: Partial<Record<keyof FormData, boolean>> = {};
        if (!form.licenseNumber.trim()) newErrors.licenseNumber = true;
        if (!/^\d{13}$/.test(form.cnic.replace(/-/g, ''))) newErrors.cnic = true;
        if (!form.fullName.trim()) newErrors.fullName = true;

        setErrors(newErrors);
        
        if (Object.keys(newErrors).length > 0) {
            if (Platform.OS === 'web') {
                window.alert('Please correct the red fields before continuing.');
            } else {
                Alert.alert('Missing Info', 'Please fill in all fields correctly.');
            }
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        if (!form.vehicleMake.trim() || !form.vehicleModel.trim()) {
            Alert.alert('Missing Field', 'Please enter vehicle make and model.'); return false;
        }
        if (!form.vehiclePlate.trim()) {
            Alert.alert('Missing Field', 'Please enter vehicle registration number.'); return false;
        }
        const year = parseInt(form.vehicleYear);
        if (!year || year < 1990 || year > new Date().getFullYear() + 1) {
            Alert.alert('Invalid Year', 'Enter a valid vehicle year.'); return false;
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
                                    style={s.input}
                                    placeholder="e.g. Toyota"
                                    placeholderTextColor={theme.colors.placeholder}
                                    value={form.vehicleMake}
                                    onChangeText={v => set('vehicleMake', v)}
                                />
                            </View>
                            <View style={s.halfField}>
                                <Text style={s.sectionLabel}>MODEL</Text>
                                <TextInput
                                    style={s.input}
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
                                    style={s.input}
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
                                    style={s.input}
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
                            style={s.input}
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
});

export default DriverOnboardingScreen;
