import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Platform, Alert, Animated,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import theme from '../../utils/theme';
import apiService from '../../services/api';

type TestState = 'instructions' | 'countdown' | 'recording' | 'processing' | 'success' | 'failure';

const CAPTURE_DURATION_MS = 5000;
const FRAME_INTERVAL_MS   = 400;  // capture a frame every 400ms → ~12 frames
const COUNTDOWN_SECS      = 3;

const PinkPassLivenessScreen: React.FC = () => {
    const navigation  = useNavigation<any>();
    const route       = useRoute<any>();
    const cnicsBase64 = route.params?.cnicsBase64 ?? null;

    const cameraRef           = useRef<CameraView>(null);
    const captureTimer        = useRef<ReturnType<typeof setInterval> | null>(null);
    const captureTimeout      = useRef<ReturnType<typeof setTimeout> | null>(null);
    const frames              = useRef<string[]>([]);
    const pulseAnim           = useRef(new Animated.Value(1)).current;

    const [state, setState]             = useState<TestState>('instructions');
    const [countdown, setCountdown]     = useState(COUNTDOWN_SECS);
    const [frameCount, setFrameCount]   = useState(0);
    const [resultMsg, setResultMsg]     = useState('');
    const [confidence, setConfidence]   = useState<number | null>(null);

    const [permission, requestPermission] = useCameraPermissions();

    useEffect(() => {
        return () => {
            if (captureTimer.current)   clearInterval(captureTimer.current);
            if (captureTimeout.current) clearTimeout(captureTimeout.current);
        };
    }, []);

    const startPulse = useCallback(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
            ])
        ).start();
    }, [pulseAnim]);

    const stopPulse = useCallback(() => {
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
    }, [pulseAnim]);

    const handleStartTest = async () => {
        if (!permission?.granted) {
            const { granted } = await requestPermission();
            if (!granted) {
                Alert.alert('Camera Permission', 'Camera access is required for the liveness test.');
                return;
            }
        }
        setState('countdown');
        let count = COUNTDOWN_SECS;
        setCountdown(count);
        const timer = setInterval(() => {
            count -= 1;
            setCountdown(count);
            if (count === 0) {
                clearInterval(timer);
                beginCapture();
            }
        }, 1000);
    };

    const beginCapture = useCallback(() => {
        frames.current = [];
        setFrameCount(0);
        setState('recording');
        startPulse();

        captureTimer.current = setInterval(async () => {
            if (!cameraRef.current) return;
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    base64: true,
                    quality: 0.5,
                    skipProcessing: true,
                });
                if (photo?.base64) {
                    frames.current.push(photo.base64);
                    setFrameCount(frames.current.length);
                }
            } catch { /* camera busy — skip frame */ }
        }, FRAME_INTERVAL_MS);

        captureTimeout.current = setTimeout(() => {
            if (captureTimer.current) clearInterval(captureTimer.current);
            stopPulse();
            sendFrames();
        }, CAPTURE_DURATION_MS);
    }, [startPulse, stopPulse]);

    const sendFrames = useCallback(async () => {
        setState('processing');

        if (frames.current.length < 3) {
            setState('failure');
            setResultMsg('Not enough frames captured. Please ensure your face is clearly visible and try again.');
            return;
        }

        try {
            const res: any = await apiService.post('/pink-pass/driver-apply', {
                cnics:          cnicsBase64,
                livenessFrames: frames.current,
            });

            if (res.success && res.verified) {
                setConfidence(res.confidence ? Math.round(res.confidence) : null);
                setState('success');
            } else {
                setResultMsg(res.reason ?? res.message ?? 'Verification failed. Please try again.');
                setState('failure');
            }
        } catch (e: any) {
            setResultMsg(e.message ?? 'Network error. Please check your connection and try again.');
            setState('failure');
        }
    }, [cnicsBase64]);

    const handleRetry = () => {
        frames.current = [];
        setFrameCount(0);
        setResultMsg('');
        setConfidence(null);
        setState('instructions');
    };

    const handleDone = () => {
        navigation.reset({
            index: 0,
            routes: [{ name: 'DriverApp' }],
        });
    };

    // ── INSTRUCTIONS ────────────────────────────────────────────────────
    if (state === 'instructions') {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Text style={styles.backText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>LIVENESS TEST</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.instructionContent}>
                    <View style={styles.eyeAnim}>
                        <Text style={styles.eyeEmoji}>👁️</Text>
                    </View>
                    <Text style={styles.instrTitle}>Blink Detection Test</Text>
                    <Text style={styles.instrSub}>
                        Look directly at the camera and blink naturally during the 5-second test.
                        Our AI will verify your liveness and confirm female identity.
                    </Text>

                    {[
                        '📷  Face the front camera directly',
                        '💡  Find good lighting — no shadows on your face',
                        '😌  Blink naturally once or twice during the test',
                        '🚫  Do not use a photo or video — it will be detected',
                    ].map(tip => (
                        <View key={tip} style={styles.instrTip}>
                            <Text style={styles.instrTipText}>{tip}</Text>
                        </View>
                    ))}

                    <View style={styles.aiNotice}>
                        <Text style={styles.aiNoticeText}>
                            Powered by MediaPipe Face Mesh + DeepFace Gender Analysis
                        </Text>
                    </View>

                    <TouchableOpacity style={styles.startBtn} onPress={handleStartTest}>
                        <Text style={styles.startBtnText}>Start 5-Second Test</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ── COUNTDOWN ───────────────────────────────────────────────────────
    if (state === 'countdown') {
        return (
            <View style={styles.fullDark}>
                <Text style={styles.countdownLabel}>Get Ready</Text>
                <Text style={styles.countdownNum}>{countdown}</Text>
                <Text style={styles.countdownSub}>Position your face in the circle</Text>
            </View>
        );
    }

    // ── RECORDING ───────────────────────────────────────────────────────
    if (state === 'recording') {
        return (
            <View style={styles.cameraContainer}>
                <CameraView
                    ref={cameraRef}
                    style={styles.camera}
                    facing="front"
                >
                    <View style={styles.cameraUi}>
                        {/* Face oval guide */}
                        <Animated.View style={[styles.faceOval, { transform: [{ scale: pulseAnim }] }]} />

                        {/* Top hint */}
                        <View style={styles.recordingHint}>
                            <View style={styles.recDot} />
                            <Text style={styles.recordingHintText}>Recording — Blink Naturally</Text>
                        </View>

                        {/* Frame counter */}
                        <View style={styles.frameCounter}>
                            <Text style={styles.frameCounterText}>{frameCount} frames</Text>
                        </View>

                        {/* Bottom bar */}
                        <View style={styles.recordingBottom}>
                            <Text style={styles.recordingBottomText}>Hold still · Keep your face centred</Text>
                        </View>
                    </View>
                </CameraView>
            </View>
        );
    }

    // ── PROCESSING ──────────────────────────────────────────────────────
    if (state === 'processing') {
        return (
            <View style={styles.fullDark}>
                <ActivityIndicator size="large" color={theme.colors.secondary} />
                <Text style={styles.processingTitle}>Analysing...</Text>
                <Text style={styles.processingSub}>
                    Checking liveness and verifying identity{'\n'}with MediaPipe + DeepFace AI
                </Text>
                <Text style={styles.framesUsed}>{frames.current.length} frames captured</Text>
            </View>
        );
    }

    // ── SUCCESS ─────────────────────────────────────────────────────────
    if (state === 'success') {
        return (
            <View style={styles.resultContainer}>
                <View style={styles.resultCard}>
                    <Text style={styles.resultIconSuccess}>✓</Text>
                    <Text style={styles.resultTitle}>Verification Passed!</Text>
                    <Text style={styles.resultSub}>
                        Your liveness and identity have been confirmed.
                        Your Pink Pass application is now under admin review.
                    </Text>
                    {confidence !== null && (
                        <View style={styles.confidenceRow}>
                            <Text style={styles.confidenceLabel}>AI Confidence</Text>
                            <Text style={styles.confidenceVal}>{confidence}%</Text>
                        </View>
                    )}
                    <View style={styles.nextStepsBox}>
                        <Text style={styles.nextStepsTitle}>What happens next?</Text>
                        {[
                            '🔍  Our team reviews your CNIC within 24 hours',
                            '📱  You will receive a notification once approved',
                            '🎀  Pink Pass rides will appear in your request feed',
                        ].map(s => (
                            <Text key={s} style={styles.nextStepItem}>{s}</Text>
                        ))}
                    </View>
                    <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
                        <Text style={styles.doneBtnText}>Back to Dashboard</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ── FAILURE ─────────────────────────────────────────────────────────
    return (
        <View style={styles.resultContainer}>
            <View style={styles.resultCard}>
                <Text style={styles.resultIconFail}>✗</Text>
                <Text style={styles.resultTitleFail}>Verification Failed</Text>
                <Text style={styles.resultSub}>{resultMsg || 'The liveness test could not be completed.'}</Text>

                <View style={styles.failTipsBox}>
                    <Text style={styles.failTipsTitle}>Common causes:</Text>
                    {[
                        'Face not clearly visible or too dark',
                        'No blink detected during the test',
                        'Camera obstructed or face partially off-screen',
                        'Gender could not be confidently classified',
                    ].map(t => (
                        <Text key={t} style={styles.failTipItem}>• {t}</Text>
                    ))}
                </View>

                <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
                    <Text style={styles.retryBtnText}>↺ Try Again</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
                    <Text style={styles.backLinkText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container:     { flex: 1, backgroundColor: theme.colors.background },
    header:        {
        paddingTop: Platform.OS === 'ios' ? 54 : 44,
        paddingHorizontal: 20, paddingBottom: 12,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    backBtn:       { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center' },
    backText:      { color: theme.colors.text, fontSize: 20 },
    headerTitle:   { fontSize: 13, fontWeight: '900', color: theme.colors.text, letterSpacing: 3 },

    instructionContent: { flex: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
    eyeAnim:       { alignItems: 'center', marginBottom: 16 },
    eyeEmoji:      { fontSize: 64 },
    instrTitle:    { fontSize: 22, fontWeight: '900', color: theme.colors.text, marginBottom: 8, textAlign: 'center' },
    instrSub:      { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
    instrTip:      { backgroundColor: theme.colors.card, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#1E1E1E' },
    instrTipText:  { fontSize: 13, color: theme.colors.text },
    aiNotice:      { backgroundColor: 'rgba(255,107,157,0.06)', borderRadius: 12, padding: 10, marginTop: 12, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,107,157,0.15)' },
    aiNoticeText:  { fontSize: 11, color: '#FF69B4', textAlign: 'center' },
    startBtn:      { backgroundColor: theme.colors.secondary, borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
    startBtnText:  { color: '#fff', fontWeight: '900', fontSize: 15 },

    fullDark:      { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 16 },
    countdownLabel:{ fontSize: 16, fontWeight: '700', color: '#aaa', letterSpacing: 2 },
    countdownNum:  { fontSize: 96, fontWeight: '900', color: '#fff' },
    countdownSub:  { fontSize: 14, color: '#888' },

    cameraContainer: { flex: 1, backgroundColor: '#000' },
    camera:          { flex: 1 },
    cameraUi:        { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 40 },
    faceOval:        {
        width: 200, height: 260, borderRadius: 100,
        borderWidth: 3, borderColor: theme.colors.secondary,
        position: 'absolute', top: '50%', marginTop: -130,
    },
    recordingHint:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    recDot:          { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4444' },
    recordingHintText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    frameCounter:    { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    frameCounterText:{ color: '#aaa', fontSize: 11 },
    recordingBottom: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
    recordingBottomText: { color: '#ccc', fontSize: 12, textAlign: 'center' },

    processingTitle: { fontSize: 20, fontWeight: '900', color: '#fff', marginTop: 16 },
    processingSub:   { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 },
    framesUsed:      { fontSize: 11, color: '#555', marginTop: 8 },

    resultContainer: { flex: 1, backgroundColor: theme.colors.background, padding: 20, justifyContent: 'center' },
    resultCard:      { backgroundColor: theme.colors.card, borderRadius: 24, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#1E1E1E' },
    resultIconSuccess: { fontSize: 64, color: theme.colors.success, fontWeight: '900', marginBottom: 12 },
    resultIconFail:    { fontSize: 64, color: theme.colors.danger, fontWeight: '900', marginBottom: 12 },
    resultTitle:       { fontSize: 20, fontWeight: '900', color: theme.colors.success, marginBottom: 8 },
    resultTitleFail:   { fontSize: 20, fontWeight: '900', color: theme.colors.danger, marginBottom: 8 },
    resultSub:         { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
    confidenceRow:     { flexDirection: 'row', justifyContent: 'space-between', width: '100%', backgroundColor: '#111', borderRadius: 12, padding: 14, marginBottom: 16 },
    confidenceLabel:   { fontSize: 13, color: theme.colors.textSecondary },
    confidenceVal:     { fontSize: 16, fontWeight: '900', color: theme.colors.success },
    nextStepsBox:      { width: '100%', backgroundColor: '#111', borderRadius: 14, padding: 14, marginBottom: 20 },
    nextStepsTitle:    { fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary, marginBottom: 10, letterSpacing: 0.5 },
    nextStepItem:      { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 22 },
    doneBtn:           { backgroundColor: theme.colors.primary, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 40, alignItems: 'center', width: '100%' },
    doneBtnText:       { color: theme.colors.black, fontWeight: '900', fontSize: 14 },
    failTipsBox:       { width: '100%', backgroundColor: '#111', borderRadius: 14, padding: 14, marginBottom: 20 },
    failTipsTitle:     { fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary, marginBottom: 8 },
    failTipItem:       { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 20 },
    retryBtn:          { backgroundColor: theme.colors.secondary, borderRadius: 16, paddingVertical: 15, alignItems: 'center', width: '100%', marginBottom: 10 },
    retryBtnText:      { color: '#fff', fontWeight: '900', fontSize: 14 },
    backLink:          { paddingVertical: 8 },
    backLinkText:      { color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center' },
});

export default PinkPassLivenessScreen;
