import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../utils/theme';
import apiService from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type PassStatus = 'loading' | 'active' | 'pending' | 'eligible' | 'ineligible';

const PASSENGER_REQUIREMENTS = [
    'Female identity (verified via AI)',
    'Clear CNIC photo (Front)',
    'Live liveness test (Blink check)',
    'Profile photo matches CNIC',
];

// ─── Component ────────────────────────────────────────────────────────────────

const PinkPassScreen: React.FC = () => {
    const navigation       = useNavigation<any>();
    const { theme }        = useAppTheme();
    const s                = useMemo(() => makeStyles(theme), [theme]);

    const [status, setStatus]     = useState<PassStatus>('loading');
    const [isFemale, setIsFemale] = useState(false);

    useEffect(() => { fetchStatus(); }, []);

    const fetchStatus = async () => {
        try {
            const res: any = await apiService.get('/pink-pass/status');
            setIsFemale(res?.gender === 'female');
            
            if (res?.pinkPassVerified) setStatus('active');
            else if (res?.applied)     setStatus('pending');
            else if (res?.gender === 'female') setStatus('eligible');
            else                       setStatus('ineligible');
        } catch {
            setStatus('eligible'); // Fallback for demo
        }
    };

    const handleApply = () => {
        navigation.navigate('PinkPassCnic');
    };

    if (status === 'loading') {
        return (
            <View style={s.center}>
                <ActivityIndicator size="large" color={theme.colors.secondary} />
            </View>
        );
    }

    return (
        <ScrollView
            style={s.root}
            contentContainerStyle={s.content}
            showsVerticalScrollIndicator={false}
        >
            <StatusBar
                barStyle="light-content"
                backgroundColor={theme.colors.background}
            />

            {/* Background Glows */}
            <View style={s.glow1} />
            <View style={s.glow2} />

            {/* Back */}
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
                <Text style={s.backText}>←</Text>
            </TouchableOpacity>

            {/* Badge */}
            <View style={s.infoBadge}>
                <Text style={s.infoBadgeText}>EXCLUSIVELY FOR FEMALES</Text>
            </View>

            {/* Title */}
            <Text style={s.title}>PINK PASS{'\n'}VERIFICATION</Text>
            <Text style={s.subtitle}>
                Safeguarding our community with AI-powered identity verification. Access elite female driver partners instantly.
            </Text>

            {/* Verification Flow Card (Glassmorphism) */}
            <View style={s.glassCard}>
                <Text style={s.requirementsTitle}>VERIFICATION STEPS</Text>
                {PASSENGER_REQUIREMENTS.map((req, i) => (
                    <View key={i} style={s.reqRow}>
                        <View style={s.stepLineContainer}>
                            <View style={s.stepDot}>
                                <View style={s.stepDotInner} />
                            </View>
                            {i < PASSENGER_REQUIREMENTS.length - 1 && <View style={s.stepLine} />}
                        </View>
                        <View style={s.reqTextContainer}>
                            <Text style={s.reqText}>{req}</Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* Active state */}
            {status === 'active' && (
                <View style={s.activeCard}>
                    <View style={s.successGlow} />
                    <Text style={s.activeIcon}>🛡️</Text>
                    <View style={s.activeTexts}>
                        <Text style={s.activeName}>IDENTITY VERIFIED</Text>
                        <Text style={s.activeSub}>Your Pink Pass is now active and secure.</Text>
                    </View>
                </View>
            )}

            {/* Pending state */}
            {status === 'pending' && (
                <View style={s.pendingCard}>
                    <ActivityIndicator size="small" color={theme.colors.secondary} style={{ marginRight: 10 }} />
                    <View>
                        <Text style={s.pendingTitle}>ANALYZING BIOMETRICS</Text>
                        <Text style={s.pendingSub}>Our AI is performing security checks...</Text>
                    </View>
                </View>
            )}

            {/* Ineligible state */}
            {status === 'ineligible' && (
                <View style={[s.noticeCard, { borderColor: theme.colors.danger, backgroundColor: 'rgba(239,68,68,0.08)' }]}>
                    <Text style={s.noticeIcon}>🚫</Text>
                    <Text style={[s.noticeText, { color: '#ff7b7b' }]}>
                        Pink Pass is restricted to female users to ensure the highest safety standards for our female driver partners.
                    </Text>
                </View>
            )}

            {/* Privacy notice */}
            <View style={s.privacyNotice}>
                <Text style={s.noticeIcon}>🔒</Text>
                <Text style={s.noticeText}>
                    Biometric data is encrypted end-to-end and purged immediately after verification.
                </Text>
            </View>

            {/* CTA */}
            {status === 'eligible' && (
                <TouchableOpacity
                    style={s.applyBtn}
                    activeOpacity={0.85}
                    onPress={handleApply}
                >
                    <Text style={s.applyBtnText}>START VERIFICATION TEST</Text>
                </TouchableOpacity>
            )}
        </ScrollView>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (t: AppTheme) => StyleSheet.create({
    root:    { flex: 1, backgroundColor: '#0A0A0B' }, // Deepest charcoal
    content: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 48 },
    
    glow1: {
        position: 'absolute', top: -50, right: -50,
        width: 250, height: 250, borderRadius: 125,
        backgroundColor: 'rgba(236,72,153,0.12)',
        filter: 'blur(80px)',
    },
    glow2: {
        position: 'absolute', bottom: 100, left: -80,
        width: 300, height: 300, borderRadius: 150,
        backgroundColor: 'rgba(236,72,153,0.05)',
        filter: 'blur(100px)',
    },

    backBtn: {
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 32,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    backText: { fontSize: 22, color: '#FFF', fontWeight: '300' },

    infoBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(236,72,153,0.15)',
        borderColor: 'rgba(236,72,153,0.4)',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 4,
        marginBottom: 20,
    },
    infoBadgeText: {
        fontSize: 10, fontWeight: '900',
        color: '#FF69B4',
        letterSpacing: 1.5,
    },

    title: {
        fontSize: 40, fontWeight: '900',
        color: '#FFF',
        letterSpacing: -0.5, lineHeight: 44,
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 15, color: 'rgba(255,255,255,0.6)',
        lineHeight: 24, marginBottom: 36,
    },

    /* Glass Card */
    glassCard: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1.5, borderRadius: 24,
        padding: 24, marginBottom: 32,
        shadowColor: '#000', shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.4, shadowRadius: 30,
    },
    requirementsTitle: {
        fontSize: 12, fontWeight: '900',
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: 2, marginBottom: 24,
    },
    reqRow: { flexDirection: 'row', gap: 16 },
    stepLineContainer: { alignItems: 'center', width: 24 },
    stepDot: {
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: 'rgba(236,72,153,0.1)',
        borderWidth: 1, borderColor: '#EC4899',
        alignItems: 'center', justifyContent: 'center',
    },
    stepDotInner: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: '#EC4899',
    },
    stepLine: {
        width: 2, flex: 1,
        backgroundColor: 'rgba(236,72,153,0.2)',
        marginVertical: 4,
    },
    reqTextContainer: { flex: 1, paddingBottom: 24 },
    reqText: { fontSize: 15, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

    /* Active card */
    activeCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(16,185,129,0.08)',
        borderColor: 'rgba(16,185,129,0.3)',
        borderWidth: 1, borderRadius: 20,
        padding: 20, marginBottom: 22, gap: 16,
        overflow: 'hidden',
    },
    successGlow: {
        position: 'absolute', top: -20, left: -20,
        width: 60, height: 60, borderRadius: 30,
        backgroundColor: 'rgba(16,185,129,0.2)',
        filter: 'blur(20px)',
    },
    activeIcon: { fontSize: 24 },
    activeTexts: { flex: 1 },
    activeName:  { fontSize: 15, fontWeight: '900', color: '#10B981', letterSpacing: 1 },
    activeSub:   { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 },

    /* Pending card */
    pendingCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20, padding: 20, marginBottom: 22,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    pendingTitle: { fontSize: 14, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
    pendingSub:   { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 },

    /* Privacy */
    privacyNotice: {
        flexDirection: 'row', alignItems: 'center',
        marginBottom: 40, gap: 12, paddingHorizontal: 4,
    },
    noticeIcon: { fontSize: 16 },
    noticeText: {
        flex: 1, fontSize: 12,
        color: 'rgba(255,255,255,0.4)', lineHeight: 18,
    },

    /* CTA */
    applyBtn: {
        backgroundColor: '#EC4899',
        borderRadius: 20, paddingVertical: 20,
        alignItems: 'center',
        shadowColor: '#EC4899', shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
    },
    applyBtnText: { fontSize: 16, fontWeight: '900', color: '#FFF', letterSpacing: 1 },

    center:  { flex: 1, backgroundColor: '#0A0A0B', alignItems: 'center', justifyContent: 'center' },
    noticeCard: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 20, padding: 20, marginBottom: 22,
        borderWidth: 1, gap: 16,
    },
});

export default PinkPassScreen;
