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

type Step = 'info' | 'cnic' | 'done' | 'not_eligible';

const PinkPassDriverScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { theme }  = useAppTheme();
    const s          = useMemo(() => makeStyles(theme), [theme]);

    // Web camera refs
    const videoRef    = useRef<any>(null);
    const streamRef   = useRef<MediaStream | null>(null);

    const [step, setStep]               = useState<Step>('info');
    const [pinkPassStatus, setPinkPassStatus] = useState('none');
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const [cnicsUri, setCnicsUri]       = useState<string | null>(null);
    const [cnicsBase64, setCnicsBase64] = useState<string | null>(null);
    const [capturing, setCapturing]     = useState(false);

    useEffect(() => {
        const check = async () => {
            try {
                const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
                if (raw) {
                    const user = JSON.parse(raw);
                    if (user.gender !== 'female') { setStep('not_eligible'); return; }
                }
                const res: any = await apiService.get('/drivers/me');
                if (res.success) {
                    const status = res.driver.pinkPassStatus;
                    setPinkPassStatus(status);
                    if (status === 'approved' || status === 'pending_review') setStep('done');
                }
            } catch { /* use local */ }
        };
        check();
    }, []);

    // Start camera when entering cnic step (web only)
    useEffect(() => {
        if (step === 'cnic' && Platform.OS === 'web') {
            startCamera();
        }
        return () => {
            if (step !== 'cnic') stopCamera();
        };
    }, [step]);

    const startCamera = async () => {
        try {
            setCameraError('');
            const stream = await (navigator as any).mediaDevices.getUserMedia({
                video: { width: 1280, height: 720, facingMode: 'environment' },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setCameraReady(true);
            }
        } catch (e: any) {
            setCameraError('Camera access denied. Please allow camera in your browser settings.');
        }
    };

    const stopCamera = () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setCameraReady(false);
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;
        setCapturing(true);
        const canvas = document.createElement('canvas');
        canvas.width  = videoRef.current.videoWidth  || 1280;
        canvas.height = videoRef.current.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCnicsUri(dataUrl);
        setCnicsBase64(dataUrl);
        stopCamera();
        setCapturing(false);
    };

    const retake = () => {
        setCnicsUri(null);
        setCnicsBase64(null);
        startCamera();
    };

    const proceedToLiveness = () => {
        if (!cnicsBase64) {
            Alert.alert('CNIC Required', 'Please capture your CNIC photo first.');
            return;
        }
        // Navigate to existing liveness screen (same as driver liveness)
        navigation.navigate('PinkPassLiveness', { cnicsBase64 });
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

    // ── Already applied / approved ──
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
                            <Text style={s.notEligibleText}>
                                Your CNIC and liveness check are under review.{'\n'}
                                Our team will verify within 24–48 hours.
                            </Text>
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
            <View style={s.header}>
                <TouchableOpacity onPress={() => {
                    stopCamera();
                    if (step === 'cnic') setStep('info');
                    else navigation.goBack();
                }} style={s.backBtn}>
                    <Text style={s.backText}>←</Text>
                </TouchableOpacity>
                <Text style={s.headerTitle}>PINK PASS</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Step indicator */}
            <View style={s.stepsRow}>
                {['Info', 'CNIC', 'Liveness'].map((label, i) => {
                    const stepIndex = step === 'info' ? 0 : 1;
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

            {/* ── Step 1: Info ── */}
            {step === 'info' && (
                <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                    <View style={s.pinkBanner}>
                        <Text style={s.pinkBannerIcon}>🎀</Text>
                        <Text style={s.pinkBannerTitle}>Apply for Pink Pass</Text>
                        <Text style={s.pinkBannerSub}>Join Pakistan's first female-verified ride category</Text>
                    </View>

                    {[
                        { icon: '🪪', title: 'Step 1: CNIC Photo', desc: 'Take a live photo of your CNIC (front) using your camera. File uploads are not accepted.' },
                        { icon: '👁️', title: 'Step 2: Liveness Check', desc: 'A 5-second front-camera blink test to confirm you are a real person — not a photo.' },
                        { icon: '✅', title: 'Step 3: Admin Review', desc: 'Our team reviews your submission within 24 hours and activates your Pink Pass.' },
                        { icon: '🚗', title: 'Receive Pink Pass Rides', desc: 'Once certified, you receive exclusive ride requests from verified female passengers.' },
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
                        <Text style={s.privacyText}>🔒 Your biometric data is never stored. Only verification results are saved.</Text>
                    </View>

                    <TouchableOpacity style={s.primaryBtn} onPress={() => setStep('cnic')}>
                        <Text style={s.primaryBtnText}>Start Verification →</Text>
                    </TouchableOpacity>
                </ScrollView>
            )}

            {/* ── Step 2: Live CNIC Camera ── */}
            {step === 'cnic' && (
                <View style={s.cnicContainer}>
                    {!cnicsUri ? (
                        <>
                            {/* Live camera view */}
                            <View style={s.cameraBox}>
                                {Platform.OS === 'web' && (
                                    // @ts-ignore
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        muted
                                        playsInline
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                )}
                                {/* CNIC frame guide */}
                                <View style={s.cnicFrame} pointerEvents="none">
                                    <View style={[s.corner, s.tl]} />
                                    <View style={[s.corner, s.tr]} />
                                    <View style={[s.corner, s.bl]} />
                                    <View style={[s.corner, s.br]} />
                                </View>
                                {!cameraReady && !cameraError && (
                                    <View style={s.cameraLoading}>
                                        <ActivityIndicator color="#FF69B4" size="large" />
                                        <Text style={s.cameraLoadingText}>Starting camera…</Text>
                                    </View>
                                )}
                            </View>

                            {cameraError ? (
                                <View style={s.cameraErrorBox}>
                                    <Text style={s.cameraErrorText}>{cameraError}</Text>
                                </View>
                            ) : (
                                <View style={s.cnicHintBox}>
                                    <Text style={s.cnicHintText}>Place your CNIC flat inside the frame · Ensure all text is readable · Avoid glare</Text>
                                </View>
                            )}

                            <TouchableOpacity
                                style={[s.captureBtn, (!cameraReady || capturing) && s.btnDisabled]}
                                onPress={capturePhoto}
                                disabled={!cameraReady || capturing}
                            >
                                {capturing
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={s.captureBtnText}>📸 Capture CNIC Photo</Text>
                                }
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            {/* Preview captured photo */}
                            <View style={s.previewBox}>
                                <Image source={{ uri: cnicsUri }} style={s.previewImage} resizeMode="contain" />
                            </View>
                            <Text style={s.previewHint}>Check that all CNIC text is clearly visible</Text>

                            <TouchableOpacity style={s.retakeBtn} onPress={retake}>
                                <Text style={s.retakeBtnText}>↺ Retake Photo</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={s.primaryBtn} onPress={proceedToLiveness}>
                                <Text style={s.primaryBtnText}>Proceed to Liveness Test →</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            )}
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

    stepsRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 12, marginBottom: 4 },
    stepDot:        { alignItems: 'center', flex: 0 },
    dot:            { width: 24, height: 24, borderRadius: 12, backgroundColor: t.dark ? '#1E1E1E' : '#EEE', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.colors.border },
    dotActive:      { borderColor: '#FF69B4', backgroundColor: 'rgba(255,105,180,0.15)' },
    dotCheck:       { fontSize: 11, color: '#FF69B4', fontWeight: '900' },
    stepLabel:      { fontSize: 9, color: t.colors.textSecondary, marginTop: 5, fontWeight: '600' },
    stepLabelActive:{ color: '#FF69B4' },
    stepLine:       { flex: 1, height: 1.5, backgroundColor: t.colors.border, marginHorizontal: 4, marginBottom: 16 },
    stepLineActive: { backgroundColor: '#FF69B4' },

    scroll: { paddingHorizontal: 20, paddingBottom: 60 },

    pinkBanner:      { alignItems: 'center', paddingVertical: 20, marginBottom: 16 },
    pinkBannerIcon:  { fontSize: 48, marginBottom: 10 },
    pinkBannerTitle: { fontSize: 22, fontWeight: '900', color: t.colors.text, marginBottom: 6 },
    pinkBannerSub:   { fontSize: 13, color: t.colors.textSecondary, textAlign: 'center' },

    requirementItem:  { flexDirection: 'row', gap: 14, marginBottom: 12, backgroundColor: t.colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: t.colors.border },
    requirementIcon:  { fontSize: 26, marginTop: 2 },
    requirementText:  { flex: 1 },
    requirementTitle: { fontSize: 14, fontWeight: '800', color: t.colors.text, marginBottom: 4 },
    requirementDesc:  { fontSize: 12, color: t.colors.textSecondary, lineHeight: 18 },

    privacyBox:  { backgroundColor: 'rgba(255,105,180,0.06)', borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,105,180,0.15)' },
    privacyText: { fontSize: 11, color: t.colors.textSecondary, textAlign: 'center', lineHeight: 16 },

    primaryBtn:     { backgroundColor: '#FF69B4', borderRadius: 16, paddingVertical: 17, alignItems: 'center', marginHorizontal: 20, marginBottom: 12 },
    primaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
    btnDisabled:    { opacity: 0.4 },

    // ── CNIC Camera step ──
    cnicContainer: { flex: 1, paddingHorizontal: 20 },
    cameraBox: {
        height: 220, borderRadius: 20, overflow: 'hidden',
        backgroundColor: '#111', marginBottom: 14, position: 'relative',
    },
    cnicFrame: { position: 'absolute', top: 16, left: 24, right: 24, bottom: 16 },
    corner:    { position: 'absolute', width: 22, height: 22, borderColor: '#FF69B4', borderWidth: 3 },
    tl: { top: 0,    left: 0,   borderRightWidth: 0, borderBottomWidth: 0 },
    tr: { top: 0,    right: 0,  borderLeftWidth: 0,  borderBottomWidth: 0 },
    bl: { bottom: 0, left: 0,   borderRightWidth: 0, borderTopWidth: 0 },
    br: { bottom: 0, right: 0,  borderLeftWidth: 0,  borderTopWidth: 0 },

    cameraLoading:     { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111', gap: 12 } as any,
    cameraLoadingText: { color: '#888', fontSize: 13 },
    cameraErrorBox:    { backgroundColor: 'rgba(255,68,68,0.1)', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,68,68,0.3)' },
    cameraErrorText:   { color: t.colors.danger, fontSize: 13, textAlign: 'center' },
    cnicHintBox:       { marginBottom: 16 },
    cnicHintText:      { fontSize: 12, color: t.colors.textSecondary, textAlign: 'center', lineHeight: 18 },

    captureBtn:     { backgroundColor: '#FF69B4', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 8 },
    captureBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },

    previewBox:   { height: 200, borderRadius: 16, overflow: 'hidden', marginBottom: 10, borderWidth: 2, borderColor: '#FF69B4' },
    previewImage: { width: '100%', height: '100%' },
    previewHint:  { fontSize: 12, color: t.colors.textSecondary, textAlign: 'center', marginBottom: 14 },
    retakeBtn:    { alignItems: 'center', paddingVertical: 12, marginBottom: 8 },
    retakeBtnText:{ color: t.colors.textSecondary, fontSize: 13, fontWeight: '600' },

    bigIcon:           { fontSize: 60, marginBottom: 16 },
    notEligibleTitle:  { fontSize: 20, fontWeight: '900', color: t.colors.text, marginBottom: 10, textAlign: 'center' },
    notEligibleText:   { fontSize: 13, color: t.colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
});

export default PinkPassDriverScreen;
