import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, ActivityIndicator, Platform, Alert, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import theme from '../../utils/theme';
import apiService from '../../services/api';
import { STORAGE_KEYS } from '../../utils/constants';

type AppStep = 'info' | 'cnic' | 'uploading' | 'done' | 'not_eligible';

const PinkPassDriverScreen: React.FC = () => {
    const navigation   = useNavigation<any>();
    const cameraRef    = useRef<CameraView>(null);

    const [step, setStep]               = useState<AppStep>('info');
    const [cnicsUri, setCnicsUri]       = useState<string | null>(null);
    const [cnicsBase64, setCnicsBase64] = useState<string | null>(null);
    const [uploading, setUploading]     = useState(false);
    const [gender, setGender]           = useState<string>('');

    const [permission, requestPermission] = useCameraPermissions();
    const [showCamera, setShowCamera]     = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEYS.USER_DATA).then(raw => {
            if (raw) {
                const user = JSON.parse(raw);
                setGender(user.gender ?? '');
                if (user.gender !== 'female') setStep('not_eligible');
            }
        });
    }, []);

    const handleCaptureCnic = async () => {
        if (!permission?.granted) {
            const { granted } = await requestPermission();
            if (!granted) {
                Alert.alert('Permission Required', 'Camera access is needed to capture your CNIC.');
                return;
            }
        }
        setShowCamera(true);
    };

    const takePicture = async () => {
        if (!cameraRef.current) return;
        try {
            const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
            if (photo) {
                setCnicsUri(photo.uri);
                setCnicsBase64(photo.base64 ?? null);
                setShowCamera(false);
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to capture photo. Try again.');
        }
    };

    const handleProceedToLiveness = () => {
        if (!cnicsBase64) {
            Alert.alert('CNIC Required', 'Please capture your CNIC front photo first.');
            return;
        }
        navigation.navigate('PinkPassLiveness', { cnicsBase64 });
    };

    if (step === 'not_eligible') {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Text style={styles.backText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>PINK PASS</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.centered}>
                    <Text style={styles.bigIcon}>🎀</Text>
                    <Text style={styles.notEligibleTitle}>Female Drivers Only</Text>
                    <Text style={styles.notEligibleText}>
                        Pink Pass is exclusively available for verified female drivers.
                        This program ensures female passengers always travel with a verified female driver.
                    </Text>
                    <View style={styles.infoCard}>
                        <Text style={styles.infoCardText}>
                            If you believe this is an error, please update your gender in your profile or contact SAFORA support.
                        </Text>
                    </View>
                </View>
            </View>
        );
    }

    if (showCamera) {
        return (
            <View style={styles.cameraContainer}>
                <CameraView
                    ref={cameraRef}
                    style={styles.camera}
                    facing="back"
                >
                    <View style={styles.cameraOverlay}>
                        <View style={styles.cameraGuide}>
                            <Text style={styles.cameraGuideText}>
                                Place CNIC flat in the frame
                            </Text>
                        </View>
                        <View style={styles.cameraFrame} />
                        <View style={styles.cameraControls}>
                            <TouchableOpacity
                                style={styles.cancelCamBtn}
                                onPress={() => setShowCamera(false)}
                            >
                                <Text style={styles.cancelCamText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
                                <View style={styles.captureInner} />
                            </TouchableOpacity>
                            <View style={{ width: 72 }} />
                        </View>
                    </View>
                </CameraView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>PINK PASS</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Step indicator */}
            <View style={styles.stepsRow}>
                {['Info', 'CNIC', 'Liveness'].map((s, i) => {
                    const stepIndex = step === 'info' ? 0 : step === 'cnic' ? 1 : 2;
                    const active = i <= stepIndex;
                    return (
                        <React.Fragment key={s}>
                            <View style={styles.stepDot}>
                                <View style={[styles.dot, active && styles.dotActive]}>
                                    {i < stepIndex && <Text style={styles.dotCheck}>✓</Text>}
                                </View>
                                <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{s}</Text>
                            </View>
                            {i < 2 && <View style={[styles.stepLine, active && i < stepIndex && styles.stepLineActive]} />}
                        </React.Fragment>
                    );
                })}
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {step === 'info' && (
                    <>
                        <View style={styles.pinkBanner}>
                            <Text style={styles.pinkBannerIcon}>🎀</Text>
                            <Text style={styles.pinkBannerTitle}>Apply for Pink Pass</Text>
                            <Text style={styles.pinkBannerSub}>
                                Join Pakistan's first female-verified ride category
                            </Text>
                        </View>

                        {[
                            { icon: '🪪', title: 'CNIC Verification', desc: 'Upload a clear photo of your CNIC (front). Your CNIC number must match your account.' },
                            { icon: '👁️', title: 'Liveness Test', desc: 'A 5-second camera test to confirm you are a real person. You will be asked to blink naturally.' },
                            { icon: '⚥', title: 'Gender Verification', desc: 'Our AI analyzes your facial features to confirm female identity, ensuring passenger safety.' },
                            { icon: '✅', title: 'Admin Review', desc: 'Our team reviews your CNIC within 24 hours and activates your Pink Pass certification.' },
                        ].map(item => (
                            <View key={item.title} style={styles.requirementItem}>
                                <Text style={styles.requirementIcon}>{item.icon}</Text>
                                <View style={styles.requirementText}>
                                    <Text style={styles.requirementTitle}>{item.title}</Text>
                                    <Text style={styles.requirementDesc}>{item.desc}</Text>
                                </View>
                            </View>
                        ))}

                        <View style={styles.privacyBox}>
                            <Text style={styles.privacyText}>
                                Your biometric data is processed locally and never stored. Only verification results are saved.
                            </Text>
                        </View>

                        <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('cnic')}>
                            <Text style={styles.primaryBtnText}>Start Verification →</Text>
                        </TouchableOpacity>
                    </>
                )}

                {step === 'cnic' && (
                    <>
                        <Text style={styles.stepPageTitle}>CNIC Photo</Text>
                        <Text style={styles.stepPageSub}>
                            Take a clear, well-lit photo of the front of your CNIC.
                            Ensure all text is readable and the card is fully visible.
                        </Text>

                        <TouchableOpacity
                            style={[styles.cnicsUploadBox, cnicsUri && styles.cnicsUploaded]}
                            onPress={handleCaptureCnic}
                        >
                            {cnicsUri ? (
                                <Image source={{ uri: cnicsUri }} style={styles.cnicsPreview} />
                            ) : (
                                <>
                                    <Text style={styles.cnicsUploadIcon}>🪪</Text>
                                    <Text style={styles.cnicsUploadLabel}>Tap to Capture CNIC Front</Text>
                                    <Text style={styles.cnicsUploadHint}>Camera will open automatically</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {cnicsUri && (
                            <TouchableOpacity
                                style={styles.retakeBtn}
                                onPress={handleCaptureCnic}
                            >
                                <Text style={styles.retakeBtnText}>↺ Retake Photo</Text>
                            </TouchableOpacity>
                        )}

                        <View style={styles.tipsBox}>
                            <Text style={styles.tipsTitle}>Tips for a good photo:</Text>
                            {['Place CNIC on a flat, dark surface', 'Ensure all 4 corners are visible', 'Make sure text is sharp and readable', 'Avoid glare from lights'].map(tip => (
                                <Text key={tip} style={styles.tipItem}>• {tip}</Text>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[styles.primaryBtn, !cnicsBase64 && styles.btnDisabled]}
                            onPress={handleProceedToLiveness}
                            disabled={!cnicsBase64}
                        >
                            <Text style={styles.primaryBtnText}>Proceed to Liveness Test →</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container:    { flex: 1, backgroundColor: theme.colors.background },
    centered:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 60 },
    header:       {
        paddingTop: Platform.OS === 'ios' ? 54 : 44,
        paddingHorizontal: 20, paddingBottom: 12,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    backBtn:      { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center' },
    backText:     { color: theme.colors.text, fontSize: 20 },
    headerTitle:  { fontSize: 13, fontWeight: '900', color: theme.colors.text, letterSpacing: 3 },

    stepsRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 32, marginBottom: 8, paddingVertical: 12 },
    stepDot:      { alignItems: 'center', flex: 0 },
    dot:          { width: 24, height: 24, borderRadius: 12, backgroundColor: '#1E1E1E', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#333' },
    dotActive:    { borderColor: theme.colors.secondary, backgroundColor: 'rgba(255,107,157,0.15)' },
    dotCheck:     { fontSize: 11, color: theme.colors.secondary, fontWeight: '900' },
    stepLabel:    { fontSize: 9, color: theme.colors.textSecondary, marginTop: 5, fontWeight: '600' },
    stepLabelActive: { color: theme.colors.secondary },
    stepLine:     { flex: 1, height: 1.5, backgroundColor: '#1E1E1E', marginHorizontal: 4, marginBottom: 16 },
    stepLineActive:  { backgroundColor: theme.colors.secondary },

    scroll:       { paddingHorizontal: 20, paddingBottom: 60 },

    pinkBanner:   { alignItems: 'center', paddingVertical: 24, marginBottom: 20 },
    pinkBannerIcon:{ fontSize: 48, marginBottom: 10 },
    pinkBannerTitle:{ fontSize: 22, fontWeight: '900', color: theme.colors.text, marginBottom: 6 },
    pinkBannerSub: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center' },

    requirementItem:{ flexDirection: 'row', gap: 14, marginBottom: 16, backgroundColor: theme.colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1E1E1E' },
    requirementIcon:{ fontSize: 28, marginTop: 2 },
    requirementText:{ flex: 1 },
    requirementTitle:{ fontSize: 14, fontWeight: '800', color: theme.colors.text, marginBottom: 4 },
    requirementDesc: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 },

    privacyBox:   { backgroundColor: 'rgba(255,107,157,0.06)', borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,107,157,0.15)' },
    privacyText:  { fontSize: 11, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 16 },

    stepPageTitle:{ fontSize: 22, fontWeight: '900', color: theme.colors.text, marginBottom: 8 },
    stepPageSub:  { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 20, marginBottom: 20 },

    cnicsUploadBox:{
        height: 180, borderRadius: 18, borderWidth: 2, borderColor: '#2A2A2A', borderStyle: 'dashed',
        backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center', marginBottom: 12, overflow: 'hidden',
    },
    cnicsUploaded:{ borderColor: theme.colors.secondary, borderStyle: 'solid' },
    cnicsPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
    cnicsUploadIcon:{ fontSize: 40, marginBottom: 10 },
    cnicsUploadLabel:{ fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
    cnicsUploadHint: { fontSize: 11, color: theme.colors.textSecondary },

    retakeBtn:    { alignItems: 'center', paddingVertical: 10, marginBottom: 8 },
    retakeBtnText:{ color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600' },

    tipsBox:      { backgroundColor: '#111', borderRadius: 14, padding: 14, marginBottom: 20 },
    tipsTitle:    { fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary, marginBottom: 8, letterSpacing: 0.5 },
    tipItem:      { fontSize: 11, color: theme.colors.textSecondary, lineHeight: 20 },

    primaryBtn:   { backgroundColor: theme.colors.secondary, borderRadius: 16, paddingVertical: 17, alignItems: 'center', marginTop: 4 },
    primaryBtnText:{ color: '#fff', fontWeight: '900', fontSize: 14 },
    btnDisabled:  { opacity: 0.4 },

    // Not eligible
    bigIcon:          { fontSize: 60, marginBottom: 16 },
    notEligibleTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.text, marginBottom: 10, textAlign: 'center' },
    notEligibleText:  { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
    infoCard:         { backgroundColor: theme.colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1E1E1E' },
    infoCardText:     { fontSize: 12, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 18 },

    // Camera
    cameraContainer:  { flex: 1, backgroundColor: '#000' },
    camera:           { flex: 1 },
    cameraOverlay:    { flex: 1, justifyContent: 'space-between', paddingBottom: 40 },
    cameraGuide:      { paddingTop: Platform.OS === 'ios' ? 60 : 40, alignItems: 'center' },
    cameraGuideText:  { color: '#fff', fontSize: 14, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    cameraFrame:      {
        alignSelf: 'center', width: '85%', aspectRatio: 1.6,
        borderWidth: 2, borderColor: theme.colors.secondary, borderRadius: 12,
    },
    cameraControls:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 32 },
    cancelCamBtn:     { width: 72, alignItems: 'center' },
    cancelCamText:    { color: '#fff', fontSize: 14, fontWeight: '600' },
    captureBtn:       {
        width: 72, height: 72, borderRadius: 36,
        borderWidth: 4, borderColor: '#fff', backgroundColor: 'transparent',
        alignItems: 'center', justifyContent: 'center',
    },
    captureInner:     { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff' },
});

export default PinkPassDriverScreen;
