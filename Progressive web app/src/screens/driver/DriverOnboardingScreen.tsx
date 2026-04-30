import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, ActivityIndicator, Platform, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../../utils/theme';
import apiService from '../../services/api';
import { STORAGE_KEYS } from '../../utils/constants';

type Step = 1 | 2;

interface FormData {
    licenseNumber: string;
    cnic: string;
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
    const [step, setStep] = useState<Step>(1);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<FormData>({
        licenseNumber: '',
        cnic: '',
        vehicleType: 'car',
        vehicleMake: '',
        vehicleModel: '',
        vehicleYear: '',
        vehicleColor: '',
        vehiclePlate: '',
    });

    const set = (key: keyof FormData, val: string) =>
        setForm(prev => ({ ...prev, [key]: val }));

    const validateStep1 = () => {
        if (!form.licenseNumber.trim()) {
            Alert.alert('Missing Field', 'Please enter your license number.'); return false;
        }
        if (!/^\d{13}$/.test(form.cnic.replace(/-/g, ''))) {
            Alert.alert('Invalid CNIC', 'CNIC must be 13 digits (e.g. 3520112345671).'); return false;
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
                vehicleType: form.vehicleType,
                vehicleInfo: {
                    make:        form.vehicleMake,
                    model:       form.vehicleModel,
                    year:        parseInt(form.vehicleYear),
                    color:       form.vehicleColor,
                    plateNumber: form.vehiclePlate.toUpperCase(),
                },
            });

            // Save updated user data with driver flag
            await AsyncStorage.setItem(
                STORAGE_KEYS.USER_DATA,
                JSON.stringify({ ...user, driverRegistered: true, role: 'driver' })
            );

            // Navigate to driver main app
            navigation.reset({ index: 0, routes: [{ name: 'DriverApp' }] });
        } catch (e: any) {
            Alert.alert('Registration Failed', e.message || 'Could not register. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                {step === 2 && (
                    <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
                        <Text style={styles.backText}>←</Text>
                    </TouchableOpacity>
                )}
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>DRIVER SETUP</Text>
                    <Text style={styles.headerSub}>Step {step} of 2</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Progress bar */}
            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: step === 1 ? '50%' : '100%' }]} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {step === 1 ? (
                    <>
                        <Text style={styles.stepTitle}>Personal Documents</Text>
                        <Text style={styles.stepSub}>
                            Your details are verified once by our team. They are never shared with passengers.
                        </Text>

                        <Text style={styles.label}>DRIVER LICENSE NUMBER</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. LHR-123456"
                            placeholderTextColor={theme.colors.placeholder}
                            value={form.licenseNumber}
                            onChangeText={v => set('licenseNumber', v)}
                            autoCapitalize="characters"
                        />

                        <Text style={styles.label}>CNIC NUMBER</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="3520112345671 (13 digits)"
                            placeholderTextColor={theme.colors.placeholder}
                            value={form.cnic}
                            onChangeText={v => set('cnic', v)}
                            keyboardType="numeric"
                            maxLength={13}
                        />
                        <Text style={styles.hint}>Used for identity verification only. Admin-reviewed.</Text>

                        <TouchableOpacity
                            style={styles.primaryBtn}
                            onPress={() => validateStep1() && setStep(2)}
                        >
                            <Text style={styles.primaryBtnText}>Continue →</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <Text style={styles.stepTitle}>Vehicle Information</Text>
                        <Text style={styles.stepSub}>
                            Enter your registered vehicle details. Registration plate must match your vehicle.
                        </Text>

                        {/* Vehicle type selector */}
                        <Text style={styles.label}>VEHICLE TYPE</Text>
                        <View style={styles.typeRow}>
                            {VEHICLE_TYPES.map(t => (
                                <TouchableOpacity
                                    key={t.key}
                                    style={[
                                        styles.typeBtn,
                                        form.vehicleType === t.key && styles.typeBtnActive,
                                    ]}
                                    onPress={() => set('vehicleType', t.key)}
                                >
                                    <Text style={styles.typeIcon}>{t.icon}</Text>
                                    <Text style={[
                                        styles.typeLabel,
                                        form.vehicleType === t.key && styles.typeLabelActive,
                                    ]}>
                                        {t.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.row}>
                            <View style={styles.halfField}>
                                <Text style={styles.label}>MAKE</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Toyota"
                                    placeholderTextColor={theme.colors.placeholder}
                                    value={form.vehicleMake}
                                    onChangeText={v => set('vehicleMake', v)}
                                />
                            </View>
                            <View style={styles.halfField}>
                                <Text style={styles.label}>MODEL</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Corolla"
                                    placeholderTextColor={theme.colors.placeholder}
                                    value={form.vehicleModel}
                                    onChangeText={v => set('vehicleModel', v)}
                                />
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={styles.halfField}>
                                <Text style={styles.label}>YEAR</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="2020"
                                    placeholderTextColor={theme.colors.placeholder}
                                    value={form.vehicleYear}
                                    onChangeText={v => set('vehicleYear', v)}
                                    keyboardType="numeric"
                                    maxLength={4}
                                />
                            </View>
                            <View style={styles.halfField}>
                                <Text style={styles.label}>COLOR</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="White"
                                    placeholderTextColor={theme.colors.placeholder}
                                    value={form.vehicleColor}
                                    onChangeText={v => set('vehicleColor', v)}
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>REGISTRATION PLATE</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="LEA-1234"
                            placeholderTextColor={theme.colors.placeholder}
                            value={form.vehiclePlate}
                            onChangeText={v => set('vehiclePlate', v)}
                            autoCapitalize="characters"
                        />

                        <View style={styles.infoBox}>
                            <Text style={styles.infoBoxText}>
                                Your registration will be reviewed by SAFORA within 24 hours. You will be notified once approved.
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading
                                ? <ActivityIndicator color={theme.colors.black} />
                                : <Text style={styles.primaryBtnText}>Submit Registration</Text>
                            }
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container:      { flex: 1, backgroundColor: theme.colors.background },
    header:         {
        paddingTop: Platform.OS === 'ios' ? 54 : 44,
        paddingHorizontal: 20, paddingBottom: 12,
        flexDirection: 'row', alignItems: 'center',
    },
    backBtn:        {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center',
    },
    backText:       { color: theme.colors.text, fontSize: 20 },
    headerCenter:   { flex: 1, alignItems: 'center' },
    headerTitle:    { fontSize: 14, fontWeight: '900', color: theme.colors.text, letterSpacing: 2 },
    headerSub:      { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
    progressBar:    { height: 3, backgroundColor: '#1E1E1E', marginHorizontal: 20 },
    progressFill:   { height: 3, backgroundColor: theme.colors.primary, borderRadius: 2 },
    scroll:         { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 60 },
    stepTitle:      { fontSize: 22, fontWeight: '900', color: theme.colors.text, marginBottom: 8 },
    stepSub:        { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 20, marginBottom: 28 },
    label:          { fontSize: 10, fontWeight: '800', color: theme.colors.textSecondary, letterSpacing: 1.5, marginBottom: 8, marginTop: 16 },
    input:          {
        backgroundColor: theme.colors.card, borderRadius: 14,
        paddingHorizontal: 16, paddingVertical: 14,
        color: theme.colors.text, fontSize: 15,
        borderWidth: 1, borderColor: '#1E1E1E',
    },
    hint:           { fontSize: 11, color: theme.colors.textSecondary, marginTop: 6, marginLeft: 4 },
    row:            { flexDirection: 'row', gap: 12 },
    halfField:      { flex: 1 },
    typeRow:        { flexDirection: 'row', gap: 10 },
    typeBtn:        {
        flex: 1, paddingVertical: 14, borderRadius: 14,
        backgroundColor: theme.colors.card, alignItems: 'center',
        borderWidth: 1, borderColor: '#1E1E1E',
    },
    typeBtnActive:  { borderColor: theme.colors.primary, backgroundColor: 'rgba(245,197,24,0.08)' },
    typeIcon:       { fontSize: 22, marginBottom: 4 },
    typeLabel:      { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary },
    typeLabelActive:{ color: theme.colors.primary },
    infoBox:        {
        backgroundColor: 'rgba(245,197,24,0.06)', borderRadius: 14,
        padding: 14, marginTop: 20, borderWidth: 1, borderColor: 'rgba(245,197,24,0.15)',
    },
    infoBoxText:    { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 },
    primaryBtn:     {
        backgroundColor: theme.colors.primary, borderRadius: 16,
        paddingVertical: 17, alignItems: 'center', marginTop: 24,
    },
    primaryBtnText: { color: theme.colors.black, fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
});

export default DriverOnboardingScreen;
