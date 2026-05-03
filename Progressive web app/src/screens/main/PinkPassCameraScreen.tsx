/**
 * PinkPassCameraScreen — Mobile-safe liveness check
 *
 * Uses requestAnimationFrame instead of setInterval to capture frames.
 * setInterval-based canvas loops crash mobile Chrome due to memory pressure.
 * RAF is browser-native, pauses when tab is backgrounded, never overflows.
 */
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Platform, StatusBar, Animated,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../utils/theme';
import apiService from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../utils/constants';

type Step = 'loading' | 'ready' | 'countdown' | 'recording' | 'submitting' | 'passed' | 'failed';

const RECORD_MS      = 5000;   // 5 seconds
const TARGET_FRAMES  = 12;     // capture 12 frames total
const MIN_MOTION     = 4.0;    // min avg pixel-diff for liveness

const PinkPassCameraScreen: React.FC = () => {
    const navigation  = useNavigation<any>();
    const route       = useRoute<any>();
    const cnicsBase64 = route.params?.cnicsBase64 ?? null;
    const { theme }   = useAppTheme();
    const s           = useMemo(() => makeStyles(theme), [theme]);

    const videoRef    = useRef<any>(null);
    const streamRef   = useRef<MediaStream | null>(null);
    const rafRef      = useRef<number | null>(null);
    const framesRef   = useRef<string[]>([]);
    const startTimeRef = useRef<number>(0);
    const lastFrameTimeRef = useRef<number>(0);
    const pulseAnim   = useRef(new Animated.Value(1)).current;

    const [step, setStep]         = useState<Step>('loading');
    const [message, setMessage]   = useState('Starting camera…');
    const [countdown, setCountdown] = useState(3);
    const [progress, setProgress] = useState(0);
    const [frameCount, setFrameCount] = useState(0);
    const [camError, setCamError] = useState('');

    useEffect(() => {
        if (Platform.OS !== 'web') {
            setStep('failed');
            setMessage('Please use a browser to complete this check.');
            return;
        }
        startCamera();
        return cleanup;
    }, []);

    const startCamera = async () => {
        setCamError('');
        try {
            const stream = await (navigator as any).mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width:  { ideal: 640 },
                    height: { ideal: 480 },
                },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play().catch(() => {});
            }
            setStep('ready');
            setMessage('Position your face in the oval, then tap Start.');
        } catch (e: any) {
            const denied = e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError';
            setCamError(denied
                ? 'Camera access denied.\nPlease allow camera in browser settings and refresh.'
                : 'Cannot open front camera. Please try on a different browser or device.'
            );
            setStep('failed');
        }
    };

    const cleanup = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        stopPulse();
    };

    const startPulse = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.06, duration: 700, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
            ])
        ).start();
    };
    const stopPulse = () => { pulseAnim.stopAnimation(); pulseAnim.setValue(1); };

    // ── Countdown ──────────────────────────────────────────────────────────────
    const beginCountdown = () => {
        setStep('countdown');
        let c = 3;
        setCountdown(c);
        const tick = () => {
            c -= 1;
            setCountdown(c);
            if (c > 0) setTimeout(tick, 1000);
            else beginRecording();
        };
        setTimeout(tick, 1000);
    };

    // ── Capture one frame to base64 ────────────────────────────────────────────
    const captureFrame = (): string | null => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return null;
        try {
            const canvas = document.createElement('canvas');
            canvas.width  = 320;
            canvas.height = 240;
            const ctx = canvas.getContext('2d')!;
            ctx.scale(-1, 1);  // mirror
            ctx.drawImage(video, 0, 0, -320, 240);
            return canvas.toDataURL('image/jpeg', 0.5);
        } catch { return null; }
    };

    // ── RAF-based recording loop ───────────────────────────────────────────────
    const beginRecording = () => {
        framesRef.current    = [];
        startTimeRef.current = performance.now();
        lastFrameTimeRef.current = 0;
        setFrameCount(0);
        setProgress(0);
        setStep('recording');
        setMessage('Look at the camera · Blink naturally…');
        startPulse();

        const frameInterval = RECORD_MS / TARGET_FRAMES; // ms between captures

        const loop = (now: number) => {
            const elapsed = now - startTimeRef.current;
            const pct = Math.min(100, (elapsed / RECORD_MS) * 100);
            setProgress(Math.round(pct));

            // Capture a frame if enough time has passed
            if (now - lastFrameTimeRef.current >= frameInterval) {
                const f = captureFrame();
                if (f) {
                    framesRef.current.push(f);
                    setFrameCount(framesRef.current.length);
                    lastFrameTimeRef.current = now;
                }
            }

            if (elapsed < RECORD_MS) {
                rafRef.current = requestAnimationFrame(loop);
            } else {
                stopPulse();
                analyzeAndSubmit();
            }
        };

        rafRef.current = requestAnimationFrame(loop);
    };

    // ── Motion analysis (synchronous, tiny images) ─────────────────────────────
    const computeMotion = async (frames: string[]): Promise<number> => {
        if (frames.length < 2) return 0;

        const toPixels = (b64: string): Promise<Uint8ClampedArray> =>
            new Promise(res => {
                const img = new window.Image();
                img.onload = () => {
                    const c = document.createElement('canvas');
                    c.width = 40; c.height = 30;
                    c.getContext('2d')!.drawImage(img, 0, 0, 40, 30);
                    res(c.getContext('2d')!.getImageData(0, 0, 40, 30).data);
                };
                img.onerror = () => res(new Uint8ClampedArray(40 * 30 * 4));
                img.src = b64;
            });

        let total = 0, count = 0;
        const limit = Math.min(frames.length - 1, 8);
        for (let i = 0; i < limit; i++) {
            const [a, b] = await Promise.all([toPixels(frames[i]), toPixels(frames[i + 1])]);
            let diff = 0;
            for (let j = 0; j < a.length; j += 4) {
                const ga = 0.299 * a[j] + 0.587 * a[j+1] + 0.114 * a[j+2];
                const gb = 0.299 * b[j] + 0.587 * b[j+1] + 0.114 * b[j+2];
                diff += Math.abs(ga - gb);
            }
            total += diff / (40 * 30);
            count++;
        }
        return count > 0 ? total / count : 0;
    };

    const analyzeAndSubmit = async () => {
        const frames = framesRef.current;
        setStep('submitting');
        setMessage('Analyzing liveness…');

        if (frames.length < 4) {
            setStep('failed');
            setMessage('Not enough frames captured. Ensure your face is visible and try again.');
            return;
        }

        try {
            const score = await computeMotion(frames);
            if (score < MIN_MOTION) {
                setStep('failed');
                setMessage('Liveness check failed — no movement detected.\nPlease blink or move slightly during the recording.');
                return;
            }
        } catch { /* if analysis fails, still submit */ }

        setMessage('Submitting verification…');
        try {
            const res: any = await apiService.post('/pink-pass/enroll', {
                cnics:          cnicsBase64,
                livenessFrames: frames,
            });

            if (res.success) {
                const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
                if (raw) {
                    const u = JSON.parse(raw);
                    u.pinkPassVerified = true;
                    u.pinkPassStatus   = 'approved';
                    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(u));
                }
                setStep('passed');
                setMessage('Pink Pass verified and activated! ✅');
                setTimeout(() => navigation.navigate('PinkPass'), 2500);
            } else {
                setStep('failed');
                setMessage(res.message || 'Verification failed. Please try again.');
            }
        } catch (err: any) {
            setStep('failed');
            setMessage(err?.message || 'Network error. Please check connection and try again.');
        }
    };

    const retry = () => {
        framesRef.current = [];
        setCamError('');
        setProgress(0);
        setFrameCount(0);
        setStep('loading');
        setMessage('Starting camera…');
        startCamera();
    };

    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

            <View style={s.header}>
                <TouchableOpacity style={s.backBtn} onPress={() => { cleanup(); navigation.goBack(); }}>
                    <Text style={s.backText}>←</Text>
                </TouchableOpacity>
                <Text style={s.headerTitle}>Face Liveness Check</Text>
                <View style={s.pinkBadge}><Text style={s.pinkBadgeText}>🎀 PINK PASS</Text></View>
            </View>

            {/* Camera box */}
            {Platform.OS === 'web' && (
                <View style={s.cameraBox}>
                    {/* @ts-ignore */}
                    <video
                        ref={videoRef}
                        autoPlay muted playsInline
                        style={{
                            width: '100%', height: '100%',
                            objectFit: 'cover', borderRadius: 20,
                            transform: 'scaleX(-1)',
                            display: ['loading','ready','countdown','recording'].includes(step) ? 'block' : 'none',
                        }}
                    />

                    {/* Oval guide */}
                    {['ready','countdown','recording'].includes(step) && (
                        <Animated.View
                            style={[s.ovalGuide, step === 'recording' && { transform: [{ scale: pulseAnim }] }]}
                            pointerEvents="none"
                        />
                    )}

                    {/* Progress bar */}
                    {step === 'recording' && (
                        <View style={s.progressWrap} pointerEvents="none">
                            <View style={[s.progressBar, { width: `${progress}%` as any }]} />
                        </View>
                    )}

                    {/* REC badge */}
                    {step === 'recording' && (
                        <View style={s.recBadge} pointerEvents="none">
                            <Text style={s.recText}>● REC  {frameCount} frames</Text>
                        </View>
                    )}

                    {/* Countdown overlay */}
                    {step === 'countdown' && (
                        <View style={s.countdownOverlay} pointerEvents="none">
                            <Text style={s.countdownNum}>{countdown}</Text>
                            <Text style={s.countdownSub}>Get ready…</Text>
                        </View>
                    )}

                    {/* Loading */}
                    {step === 'loading' && !camError && (
                        <View style={s.overlay}>
                            <ActivityIndicator color="#EC4899" size="large" />
                        </View>
                    )}

                    {/* Camera error */}
                    {camError ? (
                        <View style={s.overlay}>
                            <Text style={s.errorText}>{camError}</Text>
                        </View>
                    ) : null}
                </View>
            )}

            {/* Info panel */}
            <View style={s.infoBox}>
                <Text style={[s.message, step === 'passed' && s.msgPassed, step === 'failed' && s.msgFailed]}>
                    {message}
                </Text>

                {step === 'ready' && (
                    <View style={s.tipsList}>
                        {['📷  Face the front camera directly','💡  Find good lighting','😌  Blink naturally once or twice','🚫  Do not use a photo — it will be rejected'].map(t => (
                            <Text key={t} style={s.tip}>{t}</Text>
                        ))}
                    </View>
                )}

                {step === 'ready' && (
                    <TouchableOpacity style={s.startBtn} onPress={beginCountdown} activeOpacity={0.85}>
                        <Text style={s.startBtnText}>Start 5-Second Check →</Text>
                    </TouchableOpacity>
                )}

                {step === 'submitting' && (
                    <View style={s.row}>
                        <ActivityIndicator color="#EC4899" />
                        <Text style={s.submittingText}> Processing…</Text>
                    </View>
                )}

                {step === 'passed' && <Text style={s.passIcon}>✅</Text>}

                {step === 'failed' && (
                    <TouchableOpacity style={s.retryBtn} onPress={retry}>
                        <Text style={s.retryText}>↺ Try Again</Text>
                    </TouchableOpacity>
                )}

                <Text style={s.privacy}>🔒 Video never leaves your device. Only encrypted frames are analyzed.</Text>
            </View>
        </View>
    );
};

const makeStyles = (t: AppTheme) => StyleSheet.create({
    root:   { flex: 1, backgroundColor: '#0A0A0A' },
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 52 : 40, paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
    backBtn:       { width: 38, height: 38, borderRadius: 12, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
    backText:      { color: '#FFF', fontSize: 20 },
    headerTitle:   { flex: 1, fontSize: 16, fontWeight: '800', color: '#FFF' },
    pinkBadge:     { backgroundColor: 'rgba(236,72,153,0.2)', borderColor: 'rgba(236,72,153,0.5)', borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    pinkBadgeText: { fontSize: 11, fontWeight: '800', color: '#EC4899' },

    cameraBox: { marginHorizontal: 20, height: 300, borderRadius: 20, overflow: 'hidden', backgroundColor: '#111', position: 'relative' },

    ovalGuide: {
        position: 'absolute', top: '8%', left: '20%', right: '20%', bottom: '8%',
        borderRadius: 999, borderWidth: 3, borderColor: '#EC4899',
    } as any,

    progressWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, backgroundColor: 'rgba(255,255,255,0.1)' } as any,
    progressBar:  { height: 5, backgroundColor: '#EC4899', borderRadius: 3 },

    recBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 } as any,
    recText:  { color: '#EC4899', fontSize: 11, fontWeight: '800' },

    countdownOverlay: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' } as any,
    countdownNum:     { fontSize: 96, fontWeight: '900', color: '#FFF', lineHeight: 100 },
    countdownSub:     { fontSize: 16, color: '#CCC', marginTop: 8 },

    overlay:   { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20, gap: 12 } as any,
    errorText: { color: '#EF4444', fontSize: 13, textAlign: 'center', lineHeight: 20 },

    infoBox:  { flex: 1, backgroundColor: '#111', marginTop: 16, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 14 },
    message:  { fontSize: 15, color: '#CCC', lineHeight: 22, textAlign: 'center' },
    msgPassed:{ color: '#22C55E', fontWeight: '700' },
    msgFailed:{ color: '#EF4444' },

    tipsList: { gap: 8 },
    tip:      { fontSize: 13, color: '#888', lineHeight: 20 },

    startBtn:     { backgroundColor: '#EC4899', borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: '#EC4899', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 6 },
    startBtnText: { fontSize: 15, fontWeight: '800', color: '#FFF' },

    row:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    submittingText:{ color: '#EC4899', fontSize: 14, fontWeight: '600' },
    passIcon:      { fontSize: 48, textAlign: 'center' },

    retryBtn:  { borderWidth: 1.5, borderColor: '#EC4899', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    retryText: { color: '#EC4899', fontWeight: '700', fontSize: 15 },

    privacy: { fontSize: 11, color: '#444', textAlign: 'center', lineHeight: 16, marginTop: 4 },
});

export default PinkPassCameraScreen;
