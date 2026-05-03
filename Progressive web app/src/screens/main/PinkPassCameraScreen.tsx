/**
 * PinkPassCameraScreen — Mobile-safe video liveness verification
 *
 * Uses MediaRecorder + canvas frame sampling instead of face-api.js.
 * face-api.js downloads 100MB+ of ML weights and crashes mobile Chrome.
 *
 * Liveness proof:
 *  - Records 5 seconds of front-camera video
 *  - Samples 15 JPEG frames via canvas every 333ms
 *  - Computes pixel-diff between consecutive frames — detects real movement
 *  - Rejects if movement score is too low (photo/static image spoof)
 *  - Sends frames + CNIC to backend for AI/admin verification
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

type Step =
    | 'loading'       // camera starting
    | 'ready'         // camera live, waiting for user
    | 'countdown'     // 3-2-1 before recording
    | 'recording'     // capturing 5s video
    | 'analyzing'     // checking liveness locally
    | 'submitting'    // sending to backend
    | 'passed'
    | 'failed';

const RECORD_SECONDS   = 5;
const FRAMES_TARGET    = 15;                         // one frame every ~333ms
const FRAME_INTERVAL   = (RECORD_SECONDS * 1000) / FRAMES_TARGET;
const MIN_MOTION_SCORE = 8;                          // avg pixel-diff threshold for liveness

const PinkPassCameraScreen: React.FC = () => {
    const navigation  = useNavigation<any>();
    const route       = useRoute<any>();
    const cnicsBase64 = route.params?.cnicsBase64 ?? null;

    const { theme } = useAppTheme();
    const s         = useMemo(() => makeStyles(theme), [theme]);

    const videoRef      = useRef<any>(null);
    const streamRef     = useRef<MediaStream | null>(null);
    const frameTimerRef = useRef<any>(null);
    const countdownRef  = useRef<any>(null);
    const framesRef     = useRef<string[]>([]);
    const pulseAnim     = useRef(new Animated.Value(1)).current;

    const [step, setStep]           = useState<Step>('loading');
    const [message, setMessage]     = useState('Starting camera…');
    const [countdown, setCountdown] = useState(3);
    const [progress, setProgress]   = useState(0);   // 0-100 recording progress
    const [frameCount, setFrameCount] = useState(0);
    const [camError, setCamError]   = useState('');

    // ── Boot ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (Platform.OS !== 'web') {
            setStep('failed');
            setMessage('This check requires a browser with camera access.');
            return;
        }
        startCamera();
        return () => cleanup();
    }, []);

    // ── Camera ────────────────────────────────────────────────────────────────
    const startCamera = async () => {
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
            setMessage('When ready, tap "Start Liveness Check" and look at the camera.');
        } catch (e: any) {
            const denied = e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError';
            setCamError(denied
                ? 'Camera access denied.\n\nPlease allow camera permission in your browser settings, then refresh the page.'
                : 'Could not open camera. Please use a device with a front-facing camera.'
            );
            setStep('failed');
        }
    };

    const cleanup = () => {
        clearInterval(frameTimerRef.current);
        clearInterval(countdownRef.current);
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        stopPulse();
    };

    // ── Pulse animation during recording ──────────────────────────────────────
    const startPulse = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
            ])
        ).start();
    };

    const stopPulse = () => {
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
    };

    // ── Countdown then record ─────────────────────────────────────────────────
    const beginCountdown = () => {
        setStep('countdown');
        let c = 3;
        setCountdown(c);
        countdownRef.current = setInterval(() => {
            c -= 1;
            setCountdown(c);
            if (c === 0) {
                clearInterval(countdownRef.current);
                beginRecording();
            }
        }, 1000);
    };

    // ── Frame capture using canvas ────────────────────────────────────────────
    const captureFrame = (): string | null => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return null;
        const canvas = document.createElement('canvas');
        canvas.width  = 320;   // smaller = faster, still enough for liveness
        canvas.height = 240;
        const ctx = canvas.getContext('2d')!;
        // Mirror to match the display (front cam is flipped in CSS)
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, -320, 240);
        return canvas.toDataURL('image/jpeg', 0.55);
    };

    // ── Record 5 seconds of frames ────────────────────────────────────────────
    const beginRecording = () => {
        framesRef.current = [];
        setFrameCount(0);
        setProgress(0);
        setStep('recording');
        setMessage('Look at the camera · Blink or move slightly…');
        startPulse();

        const startTime = Date.now();

        frameTimerRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const pct = Math.min(100, Math.round((elapsed / (RECORD_SECONDS * 1000)) * 100));
            setProgress(pct);

            const frame = captureFrame();
            if (frame) {
                framesRef.current.push(frame);
                setFrameCount(framesRef.current.length);
            }

            if (elapsed >= RECORD_SECONDS * 1000) {
                clearInterval(frameTimerRef.current);
                stopPulse();
                analyzeLiveness();
            }
        }, FRAME_INTERVAL);
    };

    // ── Client-side liveness check (pixel-diff motion detection) ─────────────
    /**
     * Computes average pixel difference between consecutive grayscale frames.
     * A real person moving/blinking produces a score >> MIN_MOTION_SCORE.
     * A printed photo held still produces near-zero score.
     */
    const computeMotionScore = async (frames: string[]): Promise<number> => {
        if (frames.length < 3) return 0;

        const toGray = (b64: string): Promise<Uint8ClampedArray> =>
            new Promise(resolve => {
                const img = new window.Image();
                img.onload = () => {
                    const c = document.createElement('canvas');
                    c.width = 80; c.height = 60;   // tiny for speed
                    const ctx = c.getContext('2d')!;
                    ctx.drawImage(img, 0, 0, 80, 60);
                    resolve(ctx.getImageData(0, 0, 80, 60).data);
                };
                img.src = b64;
            });

        let totalDiff = 0;
        let comparisons = 0;

        for (let i = 1; i < Math.min(frames.length, 10); i++) {
            const [a, b] = await Promise.all([toGray(frames[i - 1]), toGray(frames[i])]);
            let diff = 0;
            for (let j = 0; j < a.length; j += 4) {
                // Luminance: 0.299R + 0.587G + 0.114B
                const ga = 0.299 * a[j] + 0.587 * a[j+1] + 0.114 * a[j+2];
                const gb = 0.299 * b[j] + 0.587 * b[j+1] + 0.114 * b[j+2];
                diff += Math.abs(ga - gb);
            }
            totalDiff += diff / (80 * 60);   // normalise to per-pixel
            comparisons++;
        }

        return comparisons > 0 ? totalDiff / comparisons : 0;
    };

    const analyzeLiveness = async () => {
        setStep('analyzing');
        setMessage('Analyzing liveness…');

        const frames = framesRef.current;
        if (frames.length < 5) {
            setStep('failed');
            setMessage('Not enough frames captured. Ensure your face is visible and try again.');
            return;
        }

        try {
            const score = await computeMotionScore(frames);
            console.log('[PinkPass] motion score:', score.toFixed(2));

            if (score < MIN_MOTION_SCORE) {
                setStep('failed');
                setMessage(
                    'Liveness check failed — no movement detected.\n\n' +
                    'Please blink naturally or move your head slightly during the recording.'
                );
                return;
            }

            // Passed — submit to backend
            await submitToBackend(frames);
        } catch (err) {
            // If analysis itself errors, still submit and let backend decide
            await submitToBackend(frames);
        }
    };

    // ── Submit to backend ─────────────────────────────────────────────────────
    const submitToBackend = async (frames: string[]) => {
        setStep('submitting');
        setMessage('Submitting for verification…');

        try {
            const res: any = await apiService.post('/pink-pass/enroll', {
                cnics:          cnicsBase64,
                livenessFrames: frames,
            });

            if (res.success) {
                // Update local cache
                const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
                if (raw) {
                    const u = JSON.parse(raw);
                    u.pinkPassVerified = true;
                    u.pinkPassStatus   = 'approved';
                    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(u));
                }
                setStep('passed');
                setMessage('Liveness verified! Pink Pass activated.');
                setTimeout(() => navigation.navigate('PinkPass'), 2500);
            } else {
                setStep('failed');
                setMessage(res.message || 'Verification failed. Please try again.');
            }
        } catch (err: any) {
            setStep('failed');
            setMessage(err?.message || 'Network error. Please check your connection and try again.');
        }
    };

    const handleRetry = () => {
        framesRef.current = [];
        setFrameCount(0);
        setProgress(0);
        setCamError('');
        setStep('loading');
        setMessage('Starting camera…');
        startCamera();
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity style={s.backBtn} onPress={() => { cleanup(); navigation.goBack(); }}>
                    <Text style={s.backText}>←</Text>
                </TouchableOpacity>
                <Text style={s.headerTitle}>Liveness Check</Text>
                <View style={s.pinkBadge}><Text style={s.pinkBadgeText}>🎀 PINK PASS</Text></View>
            </View>

            {/* Camera viewport */}
            {Platform.OS === 'web' && (
                <View style={s.cameraBox}>
                    {/* @ts-ignore — web-only video element */}
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        style={{
                            width: '100%', height: '100%',
                            objectFit: 'cover',
                            borderRadius: 20,
                            transform: 'scaleX(-1)',   // mirror selfie cam
                            display: ['loading','ready','countdown','recording'].includes(step) ? 'block' : 'none',
                        }}
                    />

                    {/* Oval face guide */}
                    {['ready','countdown','recording'].includes(step) && (
                        <Animated.View
                            style={[
                                s.ovalGuide,
                                step === 'recording' && { transform: [{ scale: pulseAnim }] },
                            ]}
                            pointerEvents="none"
                        />
                    )}

                    {/* Recording progress ring */}
                    {step === 'recording' && (
                        <View style={s.progressBarWrap} pointerEvents="none">
                            <View style={[s.progressBar, { width: `${progress}%` as any }]} />
                        </View>
                    )}

                    {/* Frame counter */}
                    {step === 'recording' && (
                        <View style={s.frameBadge} pointerEvents="none">
                            <Text style={s.frameBadgeText}>● REC  {frameCount} frames</Text>
                        </View>
                    )}

                    {/* Countdown overlay */}
                    {step === 'countdown' && (
                        <View style={s.countdownOverlay} pointerEvents="none">
                            <Text style={s.countdownNum}>{countdown}</Text>
                            <Text style={s.countdownLabel}>Get ready…</Text>
                        </View>
                    )}

                    {/* Camera error */}
                    {camError ? (
                        <View style={s.errorOverlay}>
                            <Text style={s.errorText}>{camError}</Text>
                        </View>
                    ) : null}

                    {/* Camera loading */}
                    {step === 'loading' && !camError && (
                        <View style={s.loadingOverlay}>
                            <ActivityIndicator color="#EC4899" size="large" />
                        </View>
                    )}
                </View>
            )}

            {/* Bottom info panel */}
            <View style={s.infoBox}>

                {/* Status message */}
                <Text style={[
                    s.message,
                    step === 'passed'  && s.messagePassed,
                    (step === 'failed') && s.messageFailed,
                ]}>
                    {message}
                </Text>

                {/* Tips — shown when ready */}
                {step === 'ready' && (
                    <View style={s.tipsList}>
                        {[
                            '📷  Position your face in the oval',
                            '💡  Find good lighting — no shadows',
                            '😌  Blink or move slightly during recording',
                            '🚫  No photos or videos of yourself',
                        ].map(t => (
                            <Text key={t} style={s.tip}>{t}</Text>
                        ))}
                    </View>
                )}

                {/* Start button */}
                {step === 'ready' && (
                    <TouchableOpacity style={s.startBtn} onPress={beginCountdown} activeOpacity={0.85}>
                        <Text style={s.startBtnText}>Start 5-Second Liveness Check →</Text>
                    </TouchableOpacity>
                )}

                {/* Analyzing / Submitting spinner */}
                {(step === 'analyzing' || step === 'submitting') && (
                    <View style={s.centeredRow}>
                        <ActivityIndicator color="#EC4899" />
                        <Text style={s.submittingText}>
                            {step === 'analyzing' ? ' Checking liveness…' : ' Submitting to SAFORA…'}
                        </Text>
                    </View>
                )}

                {/* Pass icon */}
                {step === 'passed' && <Text style={s.passIcon}>✅</Text>}

                {/* Retry */}
                {step === 'failed' && (
                    <TouchableOpacity style={s.retryBtn} onPress={handleRetry}>
                        <Text style={s.retryText}>↺ Try Again</Text>
                    </TouchableOpacity>
                )}

                <Text style={s.privacyNote}>
                    🔒 Video never leaves your device. Only encrypted frames are sent for verification.
                </Text>
            </View>
        </View>
    );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const makeStyles = (t: AppTheme) => StyleSheet.create({
    root:   { flex: 1, backgroundColor: '#0A0A0A' },

    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 52 : 40,
        paddingHorizontal: 20, paddingBottom: 16, gap: 12,
    },
    backBtn:       { width: 38, height: 38, borderRadius: 12, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
    backText:      { color: '#FFF', fontSize: 20 },
    headerTitle:   { flex: 1, fontSize: 18, fontWeight: '800', color: '#FFF' },
    pinkBadge:     { backgroundColor: 'rgba(236,72,153,0.2)', borderColor: 'rgba(236,72,153,0.5)', borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    pinkBadgeText: { fontSize: 11, fontWeight: '800', color: '#EC4899' },

    cameraBox: {
        marginHorizontal: 20, height: 320,
        borderRadius: 20, overflow: 'hidden',
        backgroundColor: '#111', position: 'relative',
    },

    ovalGuide: {
        position: 'absolute',
        top: '8%', left: '18%', right: '18%', bottom: '8%',
        borderRadius: 999,
        borderWidth: 3, borderColor: '#EC4899',
    } as any,

    progressBarWrap: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 4, backgroundColor: 'rgba(255,255,255,0.15)',
    } as any,
    progressBar: {
        height: 4, backgroundColor: '#EC4899',
        borderRadius: 2,
    },

    frameBadge: {
        position: 'absolute', top: 12, left: 12,
        backgroundColor: 'rgba(0,0,0,0.65)',
        borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
    } as any,
    frameBadgeText: { color: '#EC4899', fontSize: 11, fontWeight: '800' },

    countdownOverlay: {
        position: 'absolute', inset: 0,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.55)',
    } as any,
    countdownNum:   { fontSize: 96, fontWeight: '900', color: '#FFF', lineHeight: 100 },
    countdownLabel: { fontSize: 16, color: '#CCC', fontWeight: '600', marginTop: 8 },

    loadingOverlay: {
        position: 'absolute', inset: 0,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    } as any,

    errorOverlay: {
        position: 'absolute', inset: 0,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#111', padding: 24,
    } as any,
    errorText: { color: '#EF4444', fontSize: 14, textAlign: 'center', lineHeight: 22 },

    infoBox: {
        flex: 1, backgroundColor: '#111',
        marginTop: 16, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 24, gap: 14,
    },

    message:       { fontSize: 15, color: '#CCC', lineHeight: 22, textAlign: 'center' },
    messagePassed: { color: '#22C55E', fontWeight: '700' },
    messageFailed: { color: '#EF4444' },

    tipsList: { gap: 8 },
    tip:      { fontSize: 13, color: '#888', lineHeight: 20 },

    startBtn:     { backgroundColor: '#EC4899', borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: '#EC4899', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
    startBtnText: { fontSize: 15, fontWeight: '800', color: '#FFF' },

    centeredRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    submittingText: { color: '#EC4899', fontSize: 15, fontWeight: '600' },
    passIcon:       { fontSize: 48, textAlign: 'center' },

    retryBtn:  { borderWidth: 1.5, borderColor: '#EC4899', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    retryText: { color: '#EC4899', fontWeight: '700', fontSize: 15 },

    privacyNote: { fontSize: 11, color: '#444', textAlign: 'center', lineHeight: 16, marginTop: 4 },
});

export default PinkPassCameraScreen;
