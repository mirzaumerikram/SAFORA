import React, { useState, useRef, useEffect } from 'react'; // Vercel Heartbeat - v2.1.0-deploy
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, ActivityIndicator, Platform, Alert, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../utils/theme';
import { STORAGE_KEYS } from '../../utils/constants';

type Step = 'info' | 'cnic' | 'not_eligible';

// Global state to store large images and avoid navigation param crashes on mobile browsers
export const PinkPassState = {
    cnicBase64: null as string | null
};

const PinkPassCnicScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { theme }  = useAppTheme();
    const s          = makeStyles(theme);

    const videoRef   = useRef<any>(null);
    const streamRef  = useRef<MediaStream | null>(null);
    const [step, setStep]           = useState<Step>('info');
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const [cnicsUri, setCnicsUri]   = useState<string | null>(null);
    const [cnicsBase64, setCnicsBase64] = useState<string | null>(null);
    const [capturing, setCapturing] = useState(false);
    const [torchOn, setTorchOn]     = useState(false);
    const torchTrackRef = useRef<any>(null);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEYS.USER_DATA).then(raw => {
            if (raw) {
                const user = JSON.parse(raw);
                if (user.gender !== 'female') setStep('not_eligible');
            }
        });
        return () => {
            stopCamera();
            // DO NOT clear cnicBase64 here, as it's needed by the next screen
        };
    }, []);

    useEffect(() => {
        if (step === 'cnic' && Platform.OS === 'web') startCamera();
        else if (step !== 'cnic') stopCamera();
    }, [step]);

    const startCamera = async () => {
        setCameraError('');
        setCameraReady(false);
        try {
            const stream = await (navigator as any).mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' }, // rear camera
                    width:  { ideal: 1920, min: 1280 },   // 1080p ideal
                    height: { ideal: 1080, min: 720 },
                },
                audio: false,
            });
            streamRef.current = stream;

            // Try to enable torch (with small delay for mobile browsers to initialize track)
            setTimeout(async () => {
                const track = stream.getVideoTracks()[0];
                torchTrackRef.current = track;
                const caps = track?.getCapabilities?.();
                if (caps && (caps as any).torch) {
                    try { 
                        await track.applyConstraints({ advanced: [{ torch: true } as any] }); 
                        setTorchOn(true); 
                        // Force video play in case constraint update paused it
                        videoRef.current?.play().catch(() => {});
                    } catch (e) { console.log('Torch error:', e); }
                }
            }, 300);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(() => {});
            }
            setCameraReady(true);
        } catch (e: any) {
            setCameraError(
                e.name === 'NotAllowedError'
                    ? 'Camera permission denied. Please allow camera in your browser and try again.'
                    : `Could not open camera: ${e.message || 'Unknown error'}. Please try again.`
            );
        }
    };

    const stopCamera = () => {
        // Turn off torch before stopping
        if (torchTrackRef.current?.getCapabilities?.()?.torch) {
            try { torchTrackRef.current.applyConstraints({ advanced: [{ torch: false } as any] }); } catch {}
        }
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setCameraReady(false);
        setTorchOn(false);
    };

    const toggleTorch = async () => {
        const track = torchTrackRef.current;
        const video = videoRef.current;
        if (!track?.getCapabilities?.()?.torch) {
            Alert.alert('Flash', 'Flash/torch is not available on this device via browser.');
            return;
        }
        try {
            const next = !torchOn;
            await track.applyConstraints({ advanced: [{ torch: next } as any] });
            setTorchOn(next);
            // Crucial: keep video playing
            if (video) video.play().catch(() => {});
        } catch {}
    };

    const capturePhoto = () => {
        if (!videoRef.current || !cameraReady) return;
        setCapturing(true);
        try {
            const video = videoRef.current;
            const canvas = document.createElement('canvas');
            const videoW = video.videoWidth  || 1280;
            const videoH = video.videoHeight || 720;

            // Define crop area (centered box, 85% of width, typical card aspect)
            const cropW = videoW * 0.85;
            const cropH = cropW * 0.63; // ID card aspect ratio
            const startX = (videoW - cropW) / 2;
            const startY = (videoH - cropH) / 2;

            canvas.width  = 1000; // Standardize output size
            canvas.height = 630;
            const ctx = canvas.getContext('2d')!;
            
            // Boost brightness/contrast for CNIC clarity
            ctx.filter = 'brightness(1.1) contrast(1.1)';
            
            // Draw only the cropped portion
            ctx.drawImage(video, startX, startY, cropW, cropH, 0, 0, 1000, 630);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            console.log(`[Capture] Cropped from ${videoW}x${videoH}`);

            setCnicsUri(dataUrl);
            setCnicsBase64(dataUrl);
            PinkPassState.cnicBase64 = dataUrl; // Save to global state
            stopCamera();
        } finally {
            setCapturing(false);
        }
    };

    const retake = () => {
        setCnicsUri(null);
        setCnicsBase64(null);
        PinkPassState.cnicBase64 = null;
        startCamera();
    };

    const [verifying, setVerifying] = useState(false);
    const [scanError, setScanError] = useState('');
    const [extractedCnic, setExtractedCnic] = useState<{ number: string, gender: string, name: string } | null>(null);

    const runAiVerification = async () => {
        if (!PinkPassState.cnicBase64) return;

        setVerifying(true);
        setScanError('');
        setExtractedCnic(null);

        try {
            // Import dynamically to avoid bundle bloat if not used
            const Tesseract = (await import('tesseract.js')).default;
            
            console.log('[PinkPass] Starting Real OCR Scan...');
            const result = await Tesseract.recognize(
                PinkPassState.cnicBase64,
                'eng',
                { logger: m => console.log(`[OCR] ${m.status}: ${Math.round(m.progress * 100)}%`) }
            );

            const text = result.data.text || '';
            console.log('[PinkPass] Raw OCR Text:', text);

            // 1. Detection: Strict Check for CNIC keywords
            const isCnic = /IDENTITY|CARD|PAKISTAN|GOVERNMENT|NATIONAL|ISLAMIC|REPUBLIC/i.test(text);
            const hasEnoughText = text.length > 30; // Real CNICs have a lot of small text

            if (!isCnic || !hasEnoughText) {
                setScanError('CNIC_NOT_DETECTED');
                setVerifying(false);
                return;
            }

            // 2. Extraction: Find 13-digit pattern (XXXXX-XXXXXXX-X)
            const cnicMatch = text.match(/\d{5}-\d{7}-\d{1}/);
            const plainMatch = text.match(/\d{13}/);

            const processCnic = async (num: string) => {
                const digits = num.replace(/-/g, '');
                const lastDigit = parseInt(digits.charAt(digits.length - 1));
                
                // Real Validation
                if (lastDigit % 2 !== 0) {
                    setScanError('MALE_CNIC_DETECTED');
                    
                    // PERMANENT REJECTION IN BACKEND
                    try {
                        const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
                        const { API_CONFIG, PINK_PASS_ENDPOINTS } = await import('../../utils/constants');
                        
                        await fetch(`${API_CONFIG.BASE_URL}${PINK_PASS_ENDPOINTS.REJECT}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                reason: `Automated rejection: Male CNIC detected (Last digit: ${lastDigit})`
                            })
                        });
                    } catch (e) { console.log('Backend rejection failed:', e); }

                } else {
                    setExtractedCnic({
                        number: num,
                        gender: 'Female',
                        name: 'Verified Identity'
                    });
                }
                setVerifying(false);
            };

            if (!cnicMatch && !plainMatch) {
                setScanError('CNIC_NUMBER_NOT_FOUND');
                setVerifying(false);
                return;
            }
            
            processCnic(cnicMatch ? cnicMatch[0] : plainMatch![0]);

        } catch (err: any) {
            console.error('[PinkPass] OCR Error:', err);
            setScanError('SCAN_FAILED');
            setVerifying(false);
        }
    };

    const proceedToFaceCheck = () => {
        if (extractedCnic && !scanError) {
            navigation.navigate('PinkPassCamera');
        }
    };

    // ── Not eligible ─────────────────────────────────────────────────────────


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
                    <Text style={s.notEligTitle}>Female Only Feature</Text>
                    <Text style={s.notEligText}>Pink Pass is exclusively available for verified female passengers. Please update your gender in Profile.</Text>
                    <TouchableOpacity style={s.primaryBtn} onPress={() => navigation.goBack()}>
                        <Text style={s.primaryBtnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={s.container}>
            {/* Background Glows */}
            <View style={s.glow1} />
            <View style={s.glow2} />

            <View style={s.header}>
                <TouchableOpacity onPress={() => { stopCamera(); if (step === 'cnic') setStep('info'); else navigation.goBack(); }} style={s.backBtn}>
                    <Text style={s.backText}>←</Text>
                </TouchableOpacity>
                <Text style={s.headerTitle}>VERIFICATION</Text>
                <View style={s.verBadge}><Text style={s.verBadgeText}>v2.1.0 (AI-READY)</Text></View>
            </View>

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

                {/* ── Info step ── */}
                {step === 'info' && (
                    <>
                        <View style={s.pinkBanner}>
                            <Text style={s.pinkBannerIcon}>🎀</Text>
                            <Text style={s.pinkBannerTitle}>Get Your Pink Pass</Text>
                            <Text style={s.pinkBannerSub}>Fast & secure verification for female passengers</Text>
                        </View>
                        {[
                            { icon: '🪪', title: 'Step 1: CNIC Photo', desc: 'Take a clear photo of the front of your National Identity Card using your camera.' },
                            { icon: '👁️', title: 'Step 2: Liveness Check', desc: 'A 5-second selfie video to confirm you are a real person.' },
                            { icon: '✅', title: 'Step 3: Activation', desc: 'Your pass is activated instantly once verified.' },
                        ].map(item => (
                            <View key={item.title} style={s.reqItem}>
                                <Text style={s.reqIcon}>{item.icon}</Text>
                                <View style={s.reqText}>
                                    <Text style={s.reqTitle}>{item.title}</Text>
                                    <Text style={s.reqDesc}>{item.desc}</Text>
                                </View>
                            </View>
                        ))}
                        <TouchableOpacity style={s.primaryBtn} onPress={() => setStep('cnic')}>
                            <Text style={s.primaryBtnText}>Start Verification →</Text>
                        </TouchableOpacity>
                    </>
                )}

                {/* ── CNIC Camera step ── */}
                {step === 'cnic' && (
                    <>
                        <Text style={s.stepTitle}>Capture CNIC</Text>
                        <Text style={s.stepSub}>Place your CNIC flat inside the frame. Ensure all text is sharp and readable.</Text>

                        {/* Camera box */}
                        {!cnicsUri ? (
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
                                <View style={s.cnicsFrame} pointerEvents="none">
                                    <View style={[s.corner, s.tl]} /><View style={[s.corner, s.tr]} />
                                    <View style={[s.corner, s.bl]} /><View style={[s.corner, s.br]} />
                                    <Text style={s.frameHint}>Place CNIC front side here</Text>
                                </View>

                                {/* Torch button */}
                                <TouchableOpacity style={s.torchBtn} onPress={toggleTorch}>
                                    <Text style={s.torchIcon}>{torchOn ? '🔦' : '💡'}</Text>
                                </TouchableOpacity>

                                {!cameraReady && !cameraError && (
                                    <View style={s.camLoading}>
                                        <ActivityIndicator color="#EC4899" size="large" />
                                        <Text style={s.camLoadingText}>Starting camera…</Text>
                                    </View>
                                )}

                                {cameraError ? (
                                    <View style={s.camError}>
                                        <Text style={s.camErrorText}>{cameraError}</Text>
                                        <TouchableOpacity onPress={startCamera} style={s.retrySmallBtn}>
                                            <Text style={s.retrySmallText}>Retry</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : null}
                            </View>
                        ) : (
                            <View style={s.previewBox}>
                                <Image source={{ uri: cnicsUri }} style={s.previewImage} resizeMode="cover" />
                            </View>
                        )}

                        {/* Tips */}
                        {!cnicsUri && (
                            <View style={s.tipsBox}>
                                <Text style={s.tipsTitle}>Tips for a clear photo:</Text>
                                {['Place CNIC on a dark flat surface', 'All 4 corners must be visible', 'Text must be sharp & readable', 'Tap 💡 to boost brightness if dark'].map(t => (
                                    <Text key={t} style={s.tipItem}>• {t}</Text>
                                ))}
                            </View>
                        )}

                        {/* Capture / Retake / Proceed */}
                        {!cnicsUri ? (
                            <TouchableOpacity
                                style={[s.primaryBtn, (!cameraReady || capturing) && s.btnDisabled]}
                                onPress={capturePhoto}
                                disabled={!cameraReady || capturing}
                            >
                                {capturing
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={s.primaryBtnText}>📸 Capture Photo</Text>
                                }
                            </TouchableOpacity>
                        ) : (
                            <>
                                {scanError === 'MALE_CNIC_DETECTED' && (
                                    <View style={s.errorBanner}>
                                        <Text style={s.errorBannerTitle}>🛡️ AI SECURITY ALERT</Text>
                                        <Text style={s.errorBannerText}>Gender Mismatch: This CNIC belongs to a Male. Pink Pass is restricted to female passengers only.</Text>
                                    </View>
                                )}
                                {scanError === 'CNIC_NOT_DETECTED' && (
                                    <View style={s.errorBanner}>
                                        <Text style={s.errorBannerTitle}>⚠️ CARD NOT DETECTED</Text>
                                        <Text style={s.errorBannerText}>The AI could not identify a valid Pakistani CNIC in this image. Please ensure the card is flat and well-lit.</Text>
                                    </View>
                                )}
                                {scanError === 'CNIC_NUMBER_NOT_FOUND' && (
                                    <View style={s.errorBanner}>
                                        <Text style={s.errorBannerTitle}>🔍 TEXT UNREADABLE</Text>
                                        <Text style={s.errorBannerText}>Found a card, but could not read the 13-digit CNIC number. Please retake with better focus and lighting.</Text>
                                    </View>
                                )}
                                {scanError === 'SCAN_FAILED' && (
                                    <View style={s.errorBanner}>
                                        <Text style={s.errorBannerTitle}>❌ SCAN FAILED</Text>
                                        <Text style={s.errorBannerText}>AI Engine encountered an error. Please try again or use a clearer photo.</Text>
                                    </View>
                                )}

                                {extractedCnic && (
                                    <View style={s.successBanner}>
                                        <Text style={s.successTitle}>✅ AI VERIFICATION SUCCESS</Text>
                                        <View style={s.dataRow}><Text style={s.dataLabel}>Name:</Text><Text style={s.dataVal}>{extractedCnic.name}</Text></View>
                                        <View style={s.dataRow}><Text style={s.dataLabel}>CNIC:</Text><Text style={s.dataVal}>{extractedCnic.number}</Text></View>
                                        <View style={s.dataRow}><Text style={s.dataLabel}>Gender:</Text><Text style={[s.dataVal, {color: '#10B981'}]}>{extractedCnic.gender}</Text></View>
                                    </View>
                                )}

                                <Text style={s.previewHint}>Ensure all text is sharp and readable</Text>
                                
                                <TouchableOpacity style={s.retakeBtn} onPress={retake} disabled={verifying}>
                                    <Text style={s.retakeBtnText}>↺ Retake Photo</Text>
                                </TouchableOpacity>

                                {!extractedCnic && scanError !== 'MALE_CNIC_DETECTED' && (
                                    <TouchableOpacity 
                                        style={[s.primaryBtn, verifying && s.btnDisabled]} 
                                        onPress={runAiVerification}
                                        disabled={verifying}
                                    >
                                        {verifying 
                                            ? <ActivityIndicator color="#fff" /> 
                                            : <Text style={s.primaryBtnText}>🔍 Run AI Verification</Text>
                                        }
                                    </TouchableOpacity>
                                )}

                                {extractedCnic && (
                                    <TouchableOpacity style={[s.primaryBtn, { backgroundColor: '#10B981' }]} onPress={proceedToFaceCheck}>
                                        <Text style={s.primaryBtnText}>Proceed to Face Check →</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}


                        {/* AI Scanning Modal/Overlay */}
                        {verifying && (
                            <View style={s.scanningOverlay}>
                                <View style={s.scanningBox}>
                                    <ActivityIndicator color="#EC4899" size="large" />
                                    <Text style={s.scanningTitle}>AI VERIFICATION</Text>
                                    <Text style={s.scanningSub}>Analyzing CNIC details & gender...</Text>
                                    <View style={s.scanningBar} />
                                </View>
                            </View>
                        )}
                    </>
                )}
                <View style={{ marginTop: 20, marginBottom: 10, padding: 16, backgroundColor: 'rgba(236,72,153,0.05)', borderRadius: 12 }}>
                    <Text style={{ fontSize: 11, color: '#888', textAlign: 'center', lineHeight: 18 }}>
                        🛡️ <Text style={{ fontWeight: '700' }}>Privacy Commitment:</Text> Your documents are encrypted and only accessible by our vetted female safety team. Images are automatically deleted after verification is complete.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
};

const makeStyles = (t: AppTheme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0A0B' }, // Deep charcoal
    glow1: { position: 'absolute', top: -50, right: -50, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(236,72,153,0.12)', filter: 'blur(80px)' } as any,
    glow2: { position: 'absolute', bottom: 100, left: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(236,72,153,0.05)', filter: 'blur(100px)' } as any,
    centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    header:    { paddingTop: Platform.OS === 'ios' ? 54 : 44, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 },
    backBtn:   { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    backText:  { color: '#FFF', fontSize: 22, fontWeight: '300' },
    headerTitle: { fontSize: 14, fontWeight: '900', color: '#FFF', letterSpacing: 3 },
    verBadge:    { backgroundColor: 'rgba(236,72,153,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(236,72,153,0.3)' },
    verBadgeText:{ fontSize: 10, color: '#EC4899', fontWeight: '800', letterSpacing: 1 },
    scroll:    { paddingHorizontal: 20, paddingBottom: 60 },

    pinkBanner:      { alignItems: 'center', paddingVertical: 24, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    pinkBannerIcon:  { fontSize: 48, marginBottom: 8 },
    pinkBannerTitle: { fontSize: 24, fontWeight: '900', color: '#FFF' },
    pinkBannerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },

    reqItem:  { flexDirection: 'row', gap: 14, marginBottom: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    reqIcon:  { fontSize: 28 },
    reqText:  { flex: 1 },
    reqTitle: { fontSize: 15, fontWeight: '800', color: '#FFF', marginBottom: 4 },
    reqDesc:  { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 18 },

    stepTitle: { fontSize: 24, fontWeight: '900', color: '#FFF', marginBottom: 8, marginTop: 10 },
    stepSub:   { fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 22, marginBottom: 20 },

    // Camera
    cameraBox: {
        height: 240, borderRadius: 24, overflow: 'hidden',
        backgroundColor: '#000', marginBottom: 16, position: 'relative',
        borderWidth: 2, borderColor: 'rgba(236,72,153,0.4)',
    },
    cnicsFrame: {
        position: 'absolute', 
        width: '85%', height: '54%',
        top: '23%', left: '7.5%',
        borderWidth: 2, borderColor: '#EC4899', borderRadius: 8,
        alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8,
        backgroundColor: 'rgba(236,72,153,0.05)',
    } as any,
    corner:    { position: 'absolute', width: 20, height: 20, borderColor: '#EC4899', borderWidth: 3 },
    tl: { top: -2,  left: -2,  borderRightWidth: 0, borderBottomWidth: 0 },
    tr: { top: -2,  right: -2, borderLeftWidth: 0,  borderBottomWidth: 0 },
    bl: { bottom: -2, left: -2,  borderRightWidth: 0, borderTopWidth: 0 },
    br: { bottom: -2, right: -2, borderLeftWidth: 0,  borderTopWidth: 0 },
    frameHint: { color: '#FFF', fontSize: 11, fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, overflow: 'hidden' },

    torchBtn:  { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.15)', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' } as any,
    torchIcon: { fontSize: 22 },

    camLoading:     { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0A0B', gap: 12 } as any,
    camLoadingText: { color: '#888', fontSize: 13, fontWeight: '600' },
    camError:       { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0A0B', padding: 20, gap: 16 } as any,
    camErrorText:   { color: '#EF4444', fontSize: 14, textAlign: 'center', lineHeight: 22, fontWeight: '600' },
    retrySmallBtn:  { backgroundColor: 'rgba(236,72,153,0.1)', borderWidth: 1, borderColor: '#EC4899', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10 },
    retrySmallText: { color: '#EC4899', fontWeight: '800', fontSize: 13 },

    previewBox:   { height: 220, width: '100%', borderRadius: 24, overflow: 'hidden', marginBottom: 16, borderWidth: 2, borderColor: '#EC4899', backgroundColor: '#000' },
    previewImage: { width: '100%', height: '100%' },
    previewHint:  { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 12, fontWeight: '500' },

    tipsBox:   { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    tipsTitle: { fontSize: 13, fontWeight: '900', color: 'rgba(255,255,255,0.6)', marginBottom: 12, letterSpacing: 1 },
    tipItem:   { fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 22 },

    primaryBtn:     { backgroundColor: '#EC4899', borderRadius: 20, paddingVertical: 18, alignItems: 'center', marginBottom: 12, shadowColor: '#EC4899', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
    primaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
    btnDisabled:    { opacity: 0.5 },
    retakeBtn:      { alignItems: 'center', paddingVertical: 16, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20 },
    retakeBtnText:  { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '700' },

    scanningOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(10,10,11,0.85)', alignItems: 'center', justifyContent: 'center', zIndex: 100 } as any,
    scanningBox:     { backgroundColor: '#111', borderRadius: 28, padding: 36, alignItems: 'center', width: '85%', borderWidth: 1, borderColor: 'rgba(236,72,153,0.5)', shadowColor: '#EC4899', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.3, shadowRadius: 30 },
    scanningTitle:   { color: '#FFF', fontSize: 18, fontWeight: '900', marginTop: 20, letterSpacing: 2 },
    scanningSub:     { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 8, textAlign: 'center' },
    scanningBar:     { width: '100%', height: 3, backgroundColor: '#EC4899', marginTop: 24, borderRadius: 2, shadowColor: '#EC4899', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10 },

    errorBanner:      { backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', padding: 20, borderRadius: 20, marginBottom: 20 },
    errorBannerTitle: { color: '#EF4444', fontWeight: '900', fontSize: 14, marginBottom: 6, letterSpacing: 0.5 },
    errorBannerText:  { color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 20 },

    successBanner:    { backgroundColor: 'rgba(16,185,129,0.08)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', padding: 20, borderRadius: 20, marginBottom: 20 },
    successTitle:     { color: '#10B981', fontWeight: '900', fontSize: 14, marginBottom: 16, letterSpacing: 1 },
    dataRow:          { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    dataLabel:        { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
    dataVal:          { color: '#FFF', fontSize: 14, fontWeight: '800' },

    bigIcon:       { fontSize: 70, marginBottom: 20 },

    notEligTitle:  { fontSize: 24, fontWeight: '900', color: '#FFF', marginBottom: 12, textAlign: 'center' },
    notEligText:   { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
});

export default PinkPassCnicScreen;
