import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, ActivityIndicator, Platform, Alert, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../utils/theme';
import apiService from '../../services/api';
import { STORAGE_KEYS } from '../../utils/constants';

type Step = 'info' | 'cnic' | 'submitting' | 'done' | 'not_eligible';

const PinkPassDriverScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { theme }  = useAppTheme();
    const s          = useMemo(() => makeStyles(theme), [theme]);
    const fileInputRef = useRef<any>(null);

    const [step, setStep]             = useState<Step>('info');
    const [gender, setGender]         = useState('');
    const [pinkPassStatus, setPinkPassStatus] = useState('none');
    const [cnicsUri, setCnicsUri]     = useState<string | null>(null);
    const [cnicsBase64, setCnicsBase64] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const checkEligibility = async () => {
            try {
                const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
                if (raw) {
                    const user = JSON.parse(raw);
                    setGender(user.gender ?? '');
                    if (user.gender !== 'female') { setStep('not_eligible'); return; }
                }
                const res: any = await apiService.get('/drivers/me');
                if (res.success) {
                    const status = res.driver.pinkPassStatus;
                    setPinkPassStatus(status);
                    if (status === 'approved') setStep('done');
                }
            } catch { /* use local */ }
        };
        checkEligibility();
    }, []);

    // ── CNIC file picker (web) ──
    const handlePickCnic = () => {
        if (Platform.OS === 'web') {
            fileInputRef.current?.click();
        } else {
            Alert.alert('Use File Picker', 'Select your CNIC photo from gallery.');
        }
    };

    const handleFileChange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const localUrl = URL.createObjectURL(file);
        setCnicsUri(localUrl);

        const reader = new FileReader();
        reader.onload = (ev) => {
            setCnicsBase64(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    // ── Submit to backend ──
    const handleSubmit = async () => {
        if (!cnicsBase64) {
            Alert.alert('CNIC Required', 'Please select your CNIC photo first.');
            return;
        }
        setSubmitting(true);
        try {
            const res: any = await apiService.post('/pink-pass/driver/apply', {
                cnicImage: cnicsBase64,
            });
            if (res.success) {
                // Update local cache
                const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
                if (raw) {
                    const u = JSON.parse(raw);
                    u.pinkPassStatus = 'pending_review';
                    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(u));
                }
                setPinkPassStatus('pending_review');
                setStep('done');
            } else {
                Alert.alert('Submission Failed', res.message || 'Please try again.');
            }
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Submission failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Not eligible ──
    if (step === 'not_eligible') {
        return (
            <View style={s.container}>
                <View style={s.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                        <Text style={s.backText}>←</Text>
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>PINK PASS</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={s.centered}>
                    <Text style={s.bigIcon}>🎀</Text>
                    <Text style={s.notEligibleTitle}>Female Drivers Only</Text>
                    <Text style={s.notEligibleText}>
                        Pink Pass is exclusively available for verified female drivers.{'\n\n'}
                        Please update your gender to Female in your profile first.
                    </Text>
                    <TouchableOpacity style={s.primaryBtn} onPress={() => navigation.goBack()}>
                        <Text style={s.primaryBtnText}>Go Back to Profile</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ── Already approved or just submitted ──
    if (step === 'done') {
        return (
            <View style={s.container}>
                <View style={s.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                        <Text style={s.backText}>←</Text>
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>PINK PASS</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={s.centered}>
                    {pinkPassStatus === 'approved' ? (
                        <>
                            <Text style={s.bigIcon}>✅</Text>
                            <Text style={[s.notEligibleTitle, { color: theme.colors.success }]}>Pink Pass Certified!</Text>
                            <Text style={s.notEligibleText}>You are a verified Pink Pass driver. You will receive rides from female passengers.</Text>
                        </>
                    ) : (
                        <>
                            <Text style={s.bigIcon}>⏳</Text>
                            <Text style={s.notEligibleTitle}>Application Submitted!</Text>
                            <Text style={s.notEligibleText}>Your CNIC is under review. Our team will verify within 24–48 hours. You'll receive a notification once approved.</Text>
                        </>
                    )}
                    <TouchableOpacity style={s.primaryBtn} onPress={() => navigation.goBack()}>
                        <Text style={s.primaryBtnText}>Back to Profile</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={s.container}>
            {/* Hidden file input for web */}
            {Platform.OS === 'web' && (
                // @ts-ignore
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />
            )}

            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Text style={s.backText}>←</Text>
                </TouchableOpacity>
                <Text style={s.headerTitle}>PINK PASS</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Step indicator */}
            <View style={s.stepsRow}>
                {['Info', 'CNIC', 'Submit'].map((label, i) => {
                    const stepIndex = step === 'info' ? 0 : step === 'cnic' ? 1 : 2;
                    const active = i <= stepIndex;
                    return (
                        <React.Fragment key={label}>
                            <View style={s.stepDot}>
                                <View style={[s.dot, active && s.dotActive]}>
                                    {i < stepIndex && <Text style={s.dotCheck}>✓</Text>}
                                </View>
                                <Text style={[s.stepLabel, active && s.stepLabelActive]}>{label}</Text>
                            </View>
                            {i < 2 && <View style={[s.stepLine, active && i < stepIndex && s.stepLineActive]} />}
                        </React.Fragment>
                    );
                })}
            </View>

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

                {/* ── Step 1: Info ── */}
                {step === 'info' && (
                    <>
                        <View style={s.pinkBanner}>
                            <Text style={s.pinkBannerIcon}>🎀</Text>
                            <Text style={s.pinkBannerTitle}>Apply for Pink Pass</Text>
                            <Text style={s.pinkBannerSub}>Join Pakistan's first female-verified ride category</Text>
                        </View>

                        {[
                            { icon: '🪪', title: 'CNIC Verification', desc: 'Upload a clear photo of your CNIC (front). Ensure all text is visible.' },
                            { icon: '✅', title: 'Admin Review', desc: 'Our team reviews your CNIC within 24 hours and activates your Pink Pass.' },
                            { icon: '🚗', title: 'Receive Pink Pass Rides', desc: 'Once certified, you will receive exclusive ride requests from verified female passengers.' },
                        ].map(item => (
                            <View key={item.title} style={s.requirementItem}>
                                <Text style={s.requirementIcon}>{item.icon}</Text>
                                <View style={s.requirementText}>
                                    <Text style={s.requirementTitle}>{item.title}</Text>
                                    <Text style={s.requirementDesc}>{item.desc}</Text>
                                </View>
                            </View>
                        ))}

                        <View style={s.privacyBox}>
                            <Text style={s.privacyText}>🔒 Your CNIC photo is processed securely and only used for identity verification.</Text>
                        </View>

                        <TouchableOpacity style={s.primaryBtn} onPress={() => setStep('cnic')}>
                            <Text style={s.primaryBtnText}>Start Verification →</Text>
                        </TouchableOpacity>
                    </>
                )}

                {/* ── Step 2: CNIC Upload ── */}
                {step === 'cnic' && (
                    <>
                        <Text style={s.stepPageTitle}>Upload CNIC Photo</Text>
                        <Text style={s.stepPageSub}>Upload a clear, well-lit photo of the front of your CNIC. All text must be readable.</Text>

                        <TouchableOpacity
                            style={[s.cnicsUploadBox, cnicsUri ? s.cnicsUploaded : null]}
                            onPress={handlePickCnic}
                            activeOpacity={0.8}
                        >
                            {cnicsUri ? (
                                <Image source={{ uri: cnicsUri }} style={s.cnicsPreview} resizeMode="cover" />
                            ) : (
                                <>
                                    <Text style={s.cnicsUploadIcon}>🪪</Text>
                                    <Text style={s.cnicsUploadLabel}>Tap to Select CNIC Photo</Text>
                                    <Text style={s.cnicsUploadHint}>JPG, PNG — front side only</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {cnicsUri && (
                            <TouchableOpacity style={s.retakeBtn} onPress={handlePickCnic}>
                                <Text style={s.retakeBtnText}>↺ Choose Different Photo</Text>
                            </TouchableOpacity>
                        )}

                        <View style={s.tipsBox}>
                            <Text style={s.tipsTitle}>Tips for a good photo:</Text>
                            {[
                                'Place CNIC on a flat, dark surface',
                                'Ensure all 4 corners are visible',
                                'Make sure text is sharp and readable',
                                'Avoid glare from lights',
                            ].map(tip => (
                                <Text key={tip} style={s.tipItem}>• {tip}</Text>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[s.primaryBtn, !cnicsBase64 && s.btnDisabled, submitting && s.btnDisabled]}
                            onPress={handleSubmit}
                            disabled={!cnicsBase64 || submitting}
                        >
                            {submitting
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={s.primaryBtnText}>Submit Application →</Text>
                            }
                        </TouchableOpacity>

                        <TouchableOpacity style={s.backLinkBtn} onPress={() => setStep('info')}>
                            <Text style={s.backLinkText}>← Back to Info</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </View>
    );
};

const makeStyles = (t: AppTheme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 60 },
    header:    { paddingTop: Platform.OS === 'ios' ? 54 : 44, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn:   { width: 40, height: 40, borderRadius: 12, backgroundColor: t.colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.colors.border },
    backText:  { color: t.colors.text, fontSize: 20 },
    headerTitle: { fontSize: 13, fontWeight: '900', color: t.colors.text, letterSpacing: 3 },

    stepsRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 32, marginBottom: 8, paddingVertical: 12 },
    stepDot:       { alignItems: 'center', flex: 0 },
    dot:           { width: 24, height: 24, borderRadius: 12, backgroundColor: t.dark ? '#1E1E1E' : '#EEE', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.colors.border },
    dotActive:     { borderColor: '#FF69B4', backgroundColor: 'rgba(255,105,180,0.15)' },
    dotCheck:      { fontSize: 11, color: '#FF69B4', fontWeight: '900' },
    stepLabel:     { fontSize: 9, color: t.colors.textSecondary, marginTop: 5, fontWeight: '600' },
    stepLabelActive: { color: '#FF69B4' },
    stepLine:      { flex: 1, height: 1.5, backgroundColor: t.colors.border, marginHorizontal: 4, marginBottom: 16 },
    stepLineActive:  { backgroundColor: '#FF69B4' },

    scroll: { paddingHorizontal: 20, paddingBottom: 60 },

    pinkBanner:      { alignItems: 'center', paddingVertical: 24, marginBottom: 20 },
    pinkBannerIcon:  { fontSize: 48, marginBottom: 10 },
    pinkBannerTitle: { fontSize: 22, fontWeight: '900', color: t.colors.text, marginBottom: 6 },
    pinkBannerSub:   { fontSize: 13, color: t.colors.textSecondary, textAlign: 'center' },

    requirementItem:  { flexDirection: 'row', gap: 14, marginBottom: 14, backgroundColor: t.colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: t.colors.border },
    requirementIcon:  { fontSize: 28, marginTop: 2 },
    requirementText:  { flex: 1 },
    requirementTitle: { fontSize: 14, fontWeight: '800', color: t.colors.text, marginBottom: 4 },
    requirementDesc:  { fontSize: 12, color: t.colors.textSecondary, lineHeight: 18 },

    privacyBox:  { backgroundColor: 'rgba(255,105,180,0.06)', borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,105,180,0.15)' },
    privacyText: { fontSize: 11, color: t.colors.textSecondary, textAlign: 'center', lineHeight: 16 },

    stepPageTitle: { fontSize: 22, fontWeight: '900', color: t.colors.text, marginBottom: 8 },
    stepPageSub:   { fontSize: 13, color: t.colors.textSecondary, lineHeight: 20, marginBottom: 20 },

    cnicsUploadBox: { height: 200, borderRadius: 18, borderWidth: 2, borderColor: t.colors.border, borderStyle: 'dashed', backgroundColor: t.colors.card, alignItems: 'center', justifyContent: 'center', marginBottom: 12, overflow: 'hidden' },
    cnicsUploaded:  { borderColor: '#FF69B4', borderStyle: 'solid' },
    cnicsPreview:   { width: '100%', height: '100%' },
    cnicsUploadIcon:  { fontSize: 40, marginBottom: 10 },
    cnicsUploadLabel: { fontSize: 14, fontWeight: '700', color: t.colors.text, marginBottom: 4 },
    cnicsUploadHint:  { fontSize: 11, color: t.colors.textSecondary },

    retakeBtn:     { alignItems: 'center', paddingVertical: 10, marginBottom: 8 },
    retakeBtnText: { color: t.colors.textSecondary, fontSize: 13, fontWeight: '600' },

    tipsBox:   { backgroundColor: t.dark ? '#111' : '#F5F5F5', borderRadius: 14, padding: 14, marginBottom: 20 },
    tipsTitle: { fontSize: 12, fontWeight: '800', color: t.colors.textSecondary, marginBottom: 8, letterSpacing: 0.5 },
    tipItem:   { fontSize: 11, color: t.colors.textSecondary, lineHeight: 20 },

    primaryBtn:      { backgroundColor: '#FF69B4', borderRadius: 16, paddingVertical: 17, alignItems: 'center', marginTop: 4 },
    primaryBtnText:  { color: '#fff', fontWeight: '900', fontSize: 14 },
    btnDisabled:     { opacity: 0.4 },

    backLinkBtn:  { alignItems: 'center', paddingVertical: 14 },
    backLinkText: { color: t.colors.textSecondary, fontSize: 13 },

    bigIcon:          { fontSize: 60, marginBottom: 16 },
    notEligibleTitle: { fontSize: 20, fontWeight: '900', color: t.colors.text, marginBottom: 10, textAlign: 'center' },
    notEligibleText:  { fontSize: 13, color: t.colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
});

export default PinkPassDriverScreen;
