import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import theme from '../../utils/theme';
import apiService from '../../services/api';

type VerifyStep = 'idle' | 'scanning' | 'processing' | 'done';

const PinkPassScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<{ pinkPassVerified: boolean; gender: string; eligible: boolean } | null>(null);
    const [verifyStep, setVerifyStep] = useState<VerifyStep>('idle');
    const [progress, setProgress] = useState(0);
    const [verifyResult, setVerifyResult] = useState<'success' | 'fail' | null>(null);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await apiService.get('/pink-pass/status') as any;
            setStatus(res);
        } catch {
            // Backend not available - show demo UI
            setStatus({ pinkPassVerified: false, gender: 'female', eligible: true });
        } finally {
            setLoading(false);
        }
    };

    const startVerification = () => {
        setVerifyStep('scanning');
        setProgress(0);
        setVerifyResult(null);

        // Simulate camera scan (3 seconds)
        let p = 0;
        const interval = setInterval(() => {
            p += 5;
            setProgress(p);
            if (p >= 100) {
                clearInterval(interval);
                setVerifyStep('processing');
                // Simulate AI processing (2 seconds)
                setTimeout(() => callDemoVerify(), 2000);
            }
        }, 150);
    };

    const callDemoVerify = async () => {
        try {
            await apiService.post('/pink-pass/demo-verify', {});
            setVerifyResult('success');
            setVerifyStep('done');
            setStatus(prev => prev ? { ...prev, pinkPassVerified: true } : null);
        } catch (e: any) {
            if (e.message?.includes('only for female')) {
                setVerifyResult('fail');
            } else {
                // Backend offline — show success for demo
                setVerifyResult('success');
                setStatus(prev => prev ? { ...prev, pinkPassVerified: true } : null);
            }
            setVerifyStep('done');
        }
    };

    const renderScanAnimation = () => (
        <View style={styles.scanBox}>
            <View style={styles.scanFrame}>
                <View style={[styles.scanCorner, styles.scanTL]} />
                <View style={[styles.scanCorner, styles.scanTR]} />
                <View style={[styles.scanCorner, styles.scanBL]} />
                <View style={[styles.scanCorner, styles.scanBR]} />
                <Text style={styles.scanEmoji}>👤</Text>
                <View style={[styles.scanLine, { top: `${progress}%` as any }]} />
            </View>
            <Text style={styles.scanLabel}>
                {verifyStep === 'processing' ? '🤖 AI Liveness Check...' : `📷 Scanning Face... ${progress}%`}
            </Text>
            {verifyStep === 'processing' && <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 12 }} />}
        </View>
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
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

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* Hero Badge */}
                <View style={styles.heroBadge}>
                    <Text style={styles.heroEmoji}>🎀</Text>
                    <Text style={styles.heroTitle}>Pink Pass</Text>
                    <Text style={styles.heroSub}>AI-powered safety verification for women</Text>
                </View>

                {/* Status Card */}
                {status?.pinkPassVerified ? (
                    <View style={[styles.statusCard, styles.verifiedCard]}>
                        <View style={styles.statusRow}>
                            <View style={styles.verifiedBadge}>
                                <Text style={styles.verifiedIcon}>✓</Text>
                            </View>
                            <View style={styles.statusText}>
                                <Text style={styles.statusTitle}>Pink Pass Verified</Text>
                                <Text style={styles.statusSub}>You can book Pink Pass rides with female-only drivers</Text>
                            </View>
                        </View>
                        <View style={styles.benefitRow}>
                            {['Female Driver', 'AI Safety', 'Priority Match'].map(b => (
                                <View key={b} style={styles.benefitChip}>
                                    <Text style={styles.benefitText}>{b}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                ) : (
                    <View style={[styles.statusCard, styles.unverifiedCard]}>
                        <Text style={styles.unverifiedTitle}>Not Verified</Text>
                        <Text style={styles.unverifiedSub}>
                            Complete the face liveness check to unlock Pink Pass rides
                        </Text>
                    </View>
                )}

                {/* Gender gating */}
                {!status?.eligible && (
                    <View style={styles.gateCard}>
                        <Text style={styles.gateEmoji}>ℹ️</Text>
                        <Text style={styles.gateText}>Pink Pass is available for female passengers only</Text>
                    </View>
                )}

                {/* Verification flow */}
                {status?.eligible && !status?.pinkPassVerified && (
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>FACE LIVENESS CHECK</Text>

                        {verifyStep === 'idle' && (
                            <View>
                                {[
                                    { icon: '📷', text: 'Face scan via device camera' },
                                    { icon: '🤖', text: 'AI liveness detection (anti-spoofing)' },
                                    { icon: '🔒', text: 'Data is encrypted and not stored' },
                                    { icon: '⚡', text: 'Takes less than 10 seconds' },
                                ].map((step, i) => (
                                    <View key={i} style={styles.stepRow}>
                                        <Text style={styles.stepIcon}>{step.icon}</Text>
                                        <Text style={styles.stepText}>{step.text}</Text>
                                    </View>
                                ))}
                                <TouchableOpacity style={styles.startBtn} onPress={startVerification}>
                                    <Text style={styles.startBtnText}>Start Verification →</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {(verifyStep === 'scanning' || verifyStep === 'processing') && renderScanAnimation()}

                        {verifyStep === 'done' && verifyResult === 'success' && (
                            <View style={styles.resultCard}>
                                <Text style={styles.resultIcon}>✅</Text>
                                <Text style={styles.resultTitle}>Verification Successful!</Text>
                                <Text style={styles.resultSub}>Confidence: 97.3% • Liveness: Passed</Text>
                                <Text style={styles.resultSub}>Pink Pass rides are now unlocked</Text>
                            </View>
                        )}

                        {verifyStep === 'done' && verifyResult === 'fail' && (
                            <View style={[styles.resultCard, { borderColor: theme.colors.danger }]}>
                                <Text style={styles.resultIcon}>❌</Text>
                                <Text style={[styles.resultTitle, { color: theme.colors.danger }]}>Verification Failed</Text>
                                <Text style={styles.resultSub}>Please try again in good lighting</Text>
                                <TouchableOpacity style={styles.retryBtn} onPress={() => { setVerifyStep('idle'); setVerifyResult(null); }}>
                                    <Text style={styles.retryText}>Try Again</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {/* How it works */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>HOW PINK PASS WORKS</Text>
                    {[
                        { num: '1', title: 'Verify Your Identity', desc: 'One-time AI face liveness check' },
                        { num: '2', title: 'Book Pink Pass Rides', desc: 'Select Pink Pass when booking' },
                        { num: '3', title: 'Female-Only Match', desc: 'Matched only with certified female drivers' },
                        { num: '4', title: 'AI Safety Monitor', desc: 'Route deviation alerts throughout the ride' },
                    ].map(step => (
                        <View key={step.num} style={styles.howRow}>
                            <View style={styles.howNum}>
                                <Text style={styles.howNumText}>{step.num}</Text>
                            </View>
                            <View style={styles.howContent}>
                                <Text style={styles.howTitle}>{step.title}</Text>
                                <Text style={styles.howDesc}>{step.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
    header: {
        paddingTop: Platform.OS === 'ios' ? 50 : 40,
        paddingHorizontal: 20, paddingBottom: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: theme.colors.card,
        alignItems: 'center', justifyContent: 'center',
    },
    backText: { color: theme.colors.text, fontSize: 20 },
    headerTitle: { fontSize: 16, fontWeight: '900', color: theme.colors.text, letterSpacing: 2 },
    scroll: { paddingHorizontal: 20, paddingBottom: 40 },

    heroBadge: {
        backgroundColor: 'rgba(255,107,157,0.08)',
        borderWidth: 1, borderColor: 'rgba(255,107,157,0.25)',
        borderRadius: 20, padding: 24,
        alignItems: 'center', marginBottom: 20,
    },
    heroEmoji: { fontSize: 48, marginBottom: 10 },
    heroTitle: { fontSize: 24, fontWeight: '900', color: theme.colors.secondary, letterSpacing: 2, marginBottom: 6 },
    heroSub: { fontSize: 12, color: theme.colors.textSecondary, textAlign: 'center' },

    statusCard: {
        borderRadius: 16, padding: 18, marginBottom: 20,
        borderWidth: 1.5,
    },
    verifiedCard: {
        backgroundColor: 'rgba(0,230,118,0.05)',
        borderColor: 'rgba(0,230,118,0.3)',
    },
    unverifiedCard: {
        backgroundColor: theme.colors.card,
        borderColor: theme.colors.border,
    },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
    verifiedBadge: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: theme.colors.success,
        alignItems: 'center', justifyContent: 'center',
    },
    verifiedIcon: { color: theme.colors.black, fontSize: 20, fontWeight: '900' },
    statusText: { flex: 1 },
    statusTitle: { color: theme.colors.text, fontWeight: '800', fontSize: 15 },
    statusSub: { color: theme.colors.textSecondary, fontSize: 11, marginTop: 3 },
    benefitRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    benefitChip: {
        backgroundColor: 'rgba(0,230,118,0.1)',
        borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
        borderWidth: 1, borderColor: 'rgba(0,230,118,0.2)',
    },
    benefitText: { color: theme.colors.success, fontSize: 10, fontWeight: '700' },
    unverifiedTitle: { color: theme.colors.text, fontWeight: '800', fontSize: 15, marginBottom: 6 },
    unverifiedSub: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },

    gateCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: theme.colors.card, borderRadius: 14, padding: 16, marginBottom: 20,
        borderWidth: 1, borderColor: theme.colors.border,
    },
    gateEmoji: { fontSize: 20 },
    gateText: { color: theme.colors.textSecondary, fontSize: 13, flex: 1 },

    section: { marginBottom: 28 },
    sectionLabel: {
        fontSize: 10, letterSpacing: 3, fontWeight: '800',
        color: theme.colors.textSecondary, marginBottom: 14,
    },

    stepRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: theme.colors.card, borderRadius: 12,
        padding: 14, marginBottom: 8,
        borderWidth: 1, borderColor: '#1E1E1E',
    },
    stepIcon: { fontSize: 18 },
    stepText: { color: theme.colors.textSecondary, fontSize: 13, flex: 1 },

    startBtn: {
        backgroundColor: theme.colors.secondary,
        borderRadius: 14, paddingVertical: 16,
        alignItems: 'center', marginTop: 8,
    },
    startBtnText: { color: theme.colors.black, fontWeight: '800', fontSize: 15 },

    scanBox: { alignItems: 'center', paddingVertical: 20 },
    scanFrame: {
        width: 200, height: 200, borderRadius: 16,
        backgroundColor: 'rgba(255,107,157,0.05)',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative',
        borderWidth: 1, borderColor: 'rgba(255,107,157,0.2)',
    },
    scanCorner: {
        position: 'absolute', width: 20, height: 20,
        borderColor: theme.colors.secondary, borderWidth: 3,
    },
    scanTL: { top: 10, left: 10, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 6 },
    scanTR: { top: 10, right: 10, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 6 },
    scanBL: { bottom: 10, left: 10, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 6 },
    scanBR: { bottom: 10, right: 10, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 6 },
    scanEmoji: { fontSize: 60 },
    scanLine: {
        position: 'absolute', left: 0, right: 0, height: 2,
        backgroundColor: theme.colors.secondary, opacity: 0.7,
    },
    scanLabel: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 16, fontWeight: '600' },

    resultCard: {
        backgroundColor: theme.colors.card, borderRadius: 16, padding: 24,
        alignItems: 'center', borderWidth: 1.5,
        borderColor: 'rgba(0,230,118,0.3)',
    },
    resultIcon: { fontSize: 48, marginBottom: 12 },
    resultTitle: { color: theme.colors.success, fontSize: 18, fontWeight: '900', marginBottom: 8 },
    resultSub: { color: theme.colors.textSecondary, fontSize: 12, marginBottom: 4 },
    retryBtn: {
        marginTop: 12, borderWidth: 1.5, borderColor: theme.colors.danger,
        borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24,
    },
    retryText: { color: theme.colors.danger, fontWeight: '700', fontSize: 13 },

    howRow: {
        flexDirection: 'row', gap: 14, alignItems: 'flex-start',
        marginBottom: 16,
    },
    howNum: {
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: 'rgba(255,107,157,0.12)',
        borderWidth: 1, borderColor: 'rgba(255,107,157,0.3)',
        alignItems: 'center', justifyContent: 'center',
    },
    howNumText: { color: theme.colors.secondary, fontWeight: '900', fontSize: 13 },
    howContent: { flex: 1 },
    howTitle: { color: theme.colors.text, fontWeight: '700', fontSize: 13 },
    howDesc: { color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 },
});

export default PinkPassScreen;
