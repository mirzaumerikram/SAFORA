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

const REQUIREMENTS = [
    'Female driver (verified via CNIC)',
    'Valid driving license (2+ years)',
    'Clean safety record on SAFORA',
    'Background check cleared',
    'Vehicle in good condition',
];

// ─── Component ────────────────────────────────────────────────────────────────

const PinkPassScreen: React.FC = () => {
    const navigation       = useNavigation<any>();
    const { theme }        = useAppTheme();
    const s                = useMemo(() => makeStyles(theme), [theme]);

    const [status, setStatus]   = useState<PassStatus>('loading');
    const [applying, setApplying] = useState(false);

    useEffect(() => { fetchStatus(); }, []);

    const fetchStatus = async () => {
        try {
            const res: any = await apiService.get('/pink-pass/status');
            if (res?.pinkPassVerified) setStatus('active');
            else if (res?.applied)     setStatus('pending');
            else if (res?.eligible)    setStatus('eligible');
            else                       setStatus('ineligible');
        } catch {
            // Demo: show eligible state
            setStatus('eligible');
        }
    };

    const handleApply = async () => {
        setApplying(true);
        try {
            await apiService.post('/pink-pass/apply', {});
            setStatus('pending');
        } catch {
            setStatus('pending'); // demo
        } finally {
            setApplying(false);
        }
    };

    if (status === 'loading') {
        return (
            <View style={s.center}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
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
                barStyle={theme.dark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.colors.background}
            />

            {/* Back */}
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
                <Text style={s.backText}>←</Text>
            </TouchableOpacity>

            {/* Badge */}
            <View style={s.infoBadge}>
                <Text style={s.infoBadgeText}>INFO</Text>
            </View>

            {/* Title */}
            <Text style={s.title}>PINK PASS{'\n'}APPLICATION</Text>
            <Text style={s.subtitle}>
                Pink Pass is exclusively for verified female drivers providing safe rides for women passengers.
            </Text>

            {/* Active state */}
            {status === 'active' && (
                <View style={s.activeCard}>
                    <Text style={s.activeIcon}>✓</Text>
                    <View style={s.activeTexts}>
                        <Text style={s.activeName}>Pink Pass Active</Text>
                        <Text style={s.activeSub}>Your badge is visible on your profile</Text>
                    </View>
                </View>
            )}

            {/* Pending state */}
            {status === 'pending' && (
                <View style={s.pendingCard}>
                    <Text style={s.pendingIcon}>⏳</Text>
                    <View>
                        <Text style={s.pendingTitle}>Application Under Review</Text>
                        <Text style={s.pendingSub}>We'll notify you within 2–3 business days</Text>
                    </View>
                </View>
            )}

            {/* Eligibility requirements */}
            {(status === 'eligible' || status === 'ineligible') && (
                <View style={s.requirementsCard}>
                    <Text style={s.requirementsTitle}>Eligibility Requirements</Text>
                    {REQUIREMENTS.map((req, i) => (
                        <View key={i} style={s.reqRow}>
                            <View style={[s.reqCheck, status === 'ineligible' && i > 1 && s.reqCheckFail]}>
                                <Text style={s.reqCheckText}>
                                    {status === 'ineligible' && i > 1 ? '✕' : '✓'}
                                </Text>
                            </View>
                            <Text style={s.reqText}>{req}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Info notice */}
            <View style={s.noticeCard}>
                <Text style={s.noticeIcon}>🔒</Text>
                <Text style={s.noticeText}>
                    Your gender will be verified through your CNIC. Pink Pass badge will appear on your profile upon approval.
                </Text>
            </View>

            {/* CTA */}
            {status === 'eligible' && (
                <TouchableOpacity
                    style={s.applyBtn}
                    activeOpacity={0.85}
                    onPress={handleApply}
                    disabled={applying}
                >
                    {applying
                        ? <ActivityIndicator color="#FFF" />
                        : <Text style={s.applyBtnText}>Apply for Pink Pass →</Text>
                    }
                </TouchableOpacity>
            )}

            {status === 'ineligible' && (
                <View style={s.ineligibleNote}>
                    <Text style={s.ineligibleText}>
                        You don't meet all requirements yet. Complete your driver profile to qualify.
                    </Text>
                </View>
            )}
        </ScrollView>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (t: AppTheme) => StyleSheet.create({
    root:    { flex: 1, backgroundColor: t.colors.background },
    center:  { flex: 1, backgroundColor: t.colors.background, alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 48 },

    backBtn: {
        width: 38, height: 38, borderRadius: 12,
        backgroundColor: t.colors.cardSecondary,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 28,
        borderWidth: 1, borderColor: t.colors.border,
    },
    backText: { fontSize: 20, color: t.colors.text, fontWeight: '600' },

    infoBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(236,72,153,0.12)',
        borderColor: 'rgba(236,72,153,0.35)',
        borderWidth: 1.5,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 5,
        marginBottom: 18,
    },
    infoBadgeText: {
        fontSize: 11, fontWeight: '800',
        color: t.colors.secondary,
        letterSpacing: 2,
    },

    title: {
        fontSize: 36, fontWeight: '900',
        color: t.colors.text,
        letterSpacing: 1, lineHeight: 42,
        marginBottom: 14,
    },
    subtitle: {
        fontSize: 14, color: t.colors.textSecondary,
        lineHeight: 22, marginBottom: 28,
    },

    /* Active card */
    activeCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(34,197,94,0.1)',
        borderColor: 'rgba(34,197,94,0.4)',
        borderWidth: 1.5, borderRadius: 16,
        padding: 16, marginBottom: 22, gap: 14,
    },
    activeIcon: { fontSize: 26, color: t.colors.success },
    activeTexts: { flex: 1 },
    activeName:  { fontSize: 16, fontWeight: '800', color: t.colors.success },
    activeSub:   { fontSize: 13, color: t.colors.textSecondary, marginTop: 3 },

    /* Pending card */
    pendingCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: t.colors.cardSecondary,
        borderRadius: 16, padding: 16, marginBottom: 22, gap: 14,
        borderWidth: 1, borderColor: t.colors.border,
    },
    pendingIcon:  { fontSize: 26 },
    pendingTitle: { fontSize: 15, fontWeight: '700', color: t.colors.text },
    pendingSub:   { fontSize: 13, color: t.colors.textSecondary, marginTop: 3 },

    /* Requirements card */
    requirementsCard: {
        backgroundColor: t.dark ? 'rgba(236,72,153,0.06)' : 'rgba(236,72,153,0.05)',
        borderColor: 'rgba(236,72,153,0.2)',
        borderWidth: 1.5, borderRadius: 18,
        padding: 20, marginBottom: 20,
    },
    requirementsTitle: {
        fontSize: 13, fontWeight: '800',
        color: t.colors.secondary,
        marginBottom: 16,
    },
    reqRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
    reqCheck: {
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: t.colors.secondary,
        alignItems: 'center', justifyContent: 'center',
    },
    reqCheckFail: { backgroundColor: t.colors.danger },
    reqCheckText: { fontSize: 11, fontWeight: '900', color: '#FFF' },
    reqText: { fontSize: 14, color: t.colors.text, flex: 1 },

    /* Notice card */
    noticeCard: {
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: t.colors.cardSecondary,
        borderRadius: 14, padding: 16, marginBottom: 28,
        borderWidth: 1, borderColor: t.colors.border,
        gap: 12,
    },
    noticeIcon: { fontSize: 18, marginTop: 1 },
    noticeText: {
        flex: 1, fontSize: 13,
        color: t.colors.textSecondary, lineHeight: 20,
    },

    /* Apply button */
    applyBtn: {
        backgroundColor: t.colors.secondary,
        borderRadius: 16, paddingVertical: 16,
        alignItems: 'center',
        shadowColor: t.colors.secondary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3, shadowRadius: 14, elevation: 6,
    },
    applyBtnText: { fontSize: 15, fontWeight: '800', color: '#FFF' },

    /* Ineligible note */
    ineligibleNote: {
        backgroundColor: t.colors.cardSecondary,
        borderRadius: 14, padding: 16,
        borderWidth: 1, borderColor: t.colors.border,
    },
    ineligibleText: { fontSize: 14, color: t.colors.textSecondary, lineHeight: 20 },
});

export default PinkPassScreen;
