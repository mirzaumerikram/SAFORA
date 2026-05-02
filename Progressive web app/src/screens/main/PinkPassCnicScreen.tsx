import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, ActivityIndicator, Platform, Alert, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAppTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../utils/theme';
import apiService from '../../services/api';
import { STORAGE_KEYS } from '../../utils/constants';

type AppStep = 'info' | 'cnic' | 'uploading' | 'not_eligible';

const PinkPassCnicScreen: React.FC = () => {
    const navigation   = useNavigation<any>();
    const { theme }    = useAppTheme();
    const s            = makeStyles(theme);
    const cameraRef    = useRef<CameraView>(null);

    const [step, setStep]               = useState<AppStep>('info');
    const [cnicsUri, setCnicsUri]       = useState<string | null>(null);
    const [cnicsBase64, setCnicsBase64] = useState<string | null>(null);
    const [permission, requestPermission] = useCameraPermissions();
    const [showCamera, setShowCamera]     = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEYS.USER_DATA).then(raw => {
            if (raw) {
                const user = JSON.parse(raw);
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
        navigation.navigate('PinkPassCamera', { cnicsBase64 });
    };

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
                    <Text style={s.notEligibleTitle}>Female Only Feature</Text>
                    <Text style={s.notEligibleText}>
                        Pink Pass is exclusively available for verified female passengers.
                        This allows you to book rides with verified female drivers only.
                    </Text>
                    <TouchableOpacity style={s.primaryBtn} onPress={() => navigation.goBack()}>
                        <Text style={s.primaryBtnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (showCamera) {
        return (
            <View style={s.cameraContainer}>
                <CameraView
                    ref={cameraRef}
                    style={s.camera}
                    facing="back"
                >
                    <View style={s.cameraOverlay}>
                        <View style={s.cameraGuide}>
                            <Text style={s.cameraGuideText}>Place CNIC in the frame</Text>
                        </View>
                        <View style={s.cameraFrame} />
                        <View style={s.cameraControls}>
                            <TouchableOpacity style={s.cancelCamBtn} onPress={() => setShowCamera(false)}>
                                <Text style={s.cancelCamText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.captureBtn} onPress={takePicture}>
                                <View style={s.captureInner} />
                            </TouchableOpacity>
                            <View style={{ width: 72 }} />
                        </View>
                    </View>
                </CameraView>
            </View>
        );
    }

    return (
        <View style={s.container}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Text style={s.backText}>←</Text>
                </TouchableOpacity>
                <Text style={s.headerTitle}>VERIFICATION</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                {step === 'info' && (
                    <>
                        <View style={s.pinkBanner}>
                            <Text style={s.pinkBannerIcon}>🎀</Text>
                            <Text style={s.pinkBannerTitle}>Get Your Pink Pass</Text>
                            <Text style={s.pinkBannerSub}>Fast & secure verification for female passengers</Text>
                        </View>

                        {[
                            { icon: '🪪', title: 'Step 1: CNIC Photo', desc: 'Capture the front side of your Identity Card.' },
                            { icon: '📸', title: 'Step 2: Liveness Check', desc: 'A quick selfie test to confirm it\'s really you.' },
                            { icon: '🚀', title: 'Instant Activation', desc: 'Our AI verifies your gender and activates your pass instantly.' },
                        ].map(item => (
                            <View key={item.title} style={s.requirementItem}>
                                <Text style={s.requirementIcon}>{item.icon}</Text>
                                <View style={s.requirementText}>
                                    <Text style={s.requirementTitle}>{item.title}</Text>
                                    <Text style={s.requirementDesc}>{item.desc}</Text>
                                </View>
                            </View>
                        ))}

                        <TouchableOpacity style={s.primaryBtn} onPress={() => setStep('cnic')}>
                            <Text style={s.primaryBtnText}>Start Verification →</Text>
                        </TouchableOpacity>
                    </>
                )}

                {step === 'cnic' && (
                    <>
                        <Text style={s.stepPageTitle}>Capture CNIC</Text>
                        <Text style={s.stepPageSub}>Take a clear photo of your CNIC front.</Text>

                        <TouchableOpacity
                            style={[s.cnicsUploadBox, cnicsUri && s.cnicsUploaded]}
                            onPress={handleCaptureCnic}
                        >
                            {cnicsUri ? (
                                <Image source={{ uri: cnicsUri }} style={s.cnicsPreview} />
                            ) : (
                                <>
                                    <Text style={s.cnicsUploadIcon}>🪪</Text>
                                    <Text style={s.cnicsUploadLabel}>Capture CNIC Front</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {cnicsUri && (
                            <TouchableOpacity style={s.retakeBtn} onPress={handleCaptureCnic}>
                                <Text style={s.retakeBtnText}>↺ Retake Photo</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[s.primaryBtn, !cnicsBase64 && s.btnDisabled]}
                            onPress={handleProceedToLiveness}
                            disabled={!cnicsBase64}
                        >
                            <Text style={s.primaryBtnText}>Proceed to Camera Test →</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </View>
    );
};

const makeStyles = (t: AppTheme) => StyleSheet.create({
    container:    { flex: 1, backgroundColor: t.colors.background },
    centered:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    header:       { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn:      { width: 38, height: 38, borderRadius: 12, backgroundColor: t.colors.cardSecondary, alignItems: 'center', justifyContent: 'center' },
    backText:     { color: t.colors.text, fontSize: 20 },
    headerTitle:  { fontSize: 13, fontWeight: '900', color: t.colors.text, letterSpacing: 3 },
    scroll:       { paddingHorizontal: 20, paddingBottom: 40 },
    pinkBanner:   { alignItems: 'center', paddingVertical: 24, marginBottom: 12 },
    pinkBannerIcon:{ fontSize: 48, marginBottom: 8 },
    pinkBannerTitle:{ fontSize: 22, fontWeight: '900', color: t.colors.text },
    pinkBannerSub: { fontSize: 13, color: t.colors.textSecondary, textAlign: 'center' },
    requirementItem:{ flexDirection: 'row', gap: 14, marginBottom: 14, backgroundColor: t.colors.cardSecondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: t.colors.border },
    requirementIcon:{ fontSize: 24 },
    requirementText:{ flex: 1 },
    requirementTitle:{ fontSize: 14, fontWeight: '800', color: t.colors.text },
    requirementDesc: { fontSize: 12, color: t.colors.textSecondary },
    stepPageTitle:{ fontSize: 22, fontWeight: '900', color: t.colors.text, marginBottom: 8 },
    stepPageSub:  { fontSize: 13, color: t.colors.textSecondary, marginBottom: 20 },
    cnicsUploadBox:{ height: 180, borderRadius: 18, borderWidth: 2, borderColor: t.colors.border, borderStyle: 'dashed', backgroundColor: t.colors.cardSecondary, alignItems: 'center', justifyContent: 'center', marginBottom: 12, overflow: 'hidden' },
    cnicsUploaded:{ borderColor: t.colors.secondary, borderStyle: 'solid' },
    cnicsPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
    cnicsUploadIcon:{ fontSize: 40, marginBottom: 10 },
    cnicsUploadLabel:{ fontSize: 14, fontWeight: '700', color: t.colors.text },
    retakeBtn:    { alignItems: 'center', paddingVertical: 10, marginBottom: 8 },
    retakeBtnText:{ color: t.colors.textSecondary, fontSize: 13 },
    primaryBtn:   { backgroundColor: t.colors.secondary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
    primaryBtnText:{ color: '#fff', fontWeight: '900', fontSize: 14 },
    btnDisabled:  { opacity: 0.4 },
    bigIcon:      { fontSize: 60, marginBottom: 16 },
    notEligibleTitle: { fontSize: 20, fontWeight: '900', color: t.colors.text, marginBottom: 10 },
    notEligibleText:  { fontSize: 13, color: t.colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
    cameraContainer:  { flex: 1, backgroundColor: '#000' },
    camera:           { flex: 1 },
    cameraOverlay:    { flex: 1, justifyContent: 'space-between', paddingBottom: 40 },
    cameraGuide:      { paddingTop: 60, alignItems: 'center' },
    cameraGuideText:  { color: '#fff', fontSize: 14, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    cameraFrame:      { alignSelf: 'center', width: '85%', aspectRatio: 1.6, borderWidth: 2, borderColor: t.colors.secondary, borderRadius: 12 },
    cameraControls:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 32 },
    cancelCamBtn:     { width: 72, alignItems: 'center' },
    cancelCamText:    { color: '#fff', fontSize: 14 },
    captureBtn:       { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    captureInner:     { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff' },
});

export default PinkPassCnicScreen;
