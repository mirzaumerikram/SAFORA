import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../utils/theme';
import { useLanguage } from '../../context/LanguageContext';
import { STORAGE_KEYS } from '../../utils/constants';
import apiService from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ride {
    id: string;
    date: string;
    from: string;
    to: string;
    price: string;
    status: 'completed' | 'cancelled';
    type: 'standard' | 'eco' | 'pink-pass';
    duration: string;
    driver: string;
}

// ─── Mock data (shown when API is unavailable) ────────────────────────────────

const MOCK_RIDES: Ride[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (iso: string): string => {
    if (!iso) return '—';
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff === 0) return `Today, ${time}`;
    if (diff === 1) return `Yesterday, ${time}`;
    return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}, ${time}`;
};

const mapRide = (r: any): Ride => ({
    id: r._id,
    date: formatDate(r.completedAt || r.cancelledAt || r.createdAt),
    from: r.pickupLocation?.address || 'Pickup',
    to: r.dropoffLocation?.address || 'Dropoff',
    price: `Rs ${r.actualPrice || r.estimatedPrice || 0}`,
    status: r.status === 'completed' ? 'completed' : 'cancelled',
    type: r.type || 'standard',
    duration: r.estimatedDuration ? `${r.estimatedDuration} min` : '—',
    driver: r.driver?.user?.name || r.driver?.name || '—',
});

const parsePriceNum = (price: string): number =>
    parseInt(price.replace(/[^0-9]/g, '') || '0', 10);

// ─── Component ────────────────────────────────────────────────────────────────

const RideHistoryScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { t } = useLanguage();
    const { theme } = useAppTheme();
    const s = useMemo(() => makeStyles(theme), [theme]);

    const [rides, setRides] = useState<Ride[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

    // ── Data fetching ──────────────────────────────────────────────────────────

    const fetchRides = useCallback(async () => {
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
            if (!raw) {
                setRides([]);
                setLoading(false);
                setRefreshing(false);
                return;
            }
            const user = JSON.parse(raw);
            const userId = user.id || user._id;
            const res: any = await apiService.get(`/rides/history/${userId}`);
            const mapped: Ride[] = (res.rides || []).map(mapRide);
            setRides(mapped);
            setError('');
        } catch {
            setRides([]);
            setError('Failed to load history');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchRides();
    }, [fetchRides]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchRides();
    }, [fetchRides]);

    // ── Derived data ───────────────────────────────────────────────────────────

    const completed = useMemo(() => rides.filter(r => r.status === 'completed'), [rides]);
    const cancelled = useMemo(() => rides.filter(r => r.status === 'cancelled'), [rides]);
    const totalSpent = useMemo(
        () => completed.reduce((sum, r) => sum + parsePriceNum(r.price), 0),
        [completed]
    );
    const filtered = useMemo(
        () => filter === 'all' ? rides : rides.filter(r => r.status === filter),
        [rides, filter]
    );

    // ── Render ─────────────────────────────────────────────────────────────────

    const filterTabs: { key: 'all' | 'completed' | 'cancelled'; label: string }[] = [
        { key: 'all', label: 'All Rides' },
        { key: 'completed', label: '✓ Done' },
        { key: 'cancelled', label: '✗ Cancelled' },
    ];

    return (
        <View style={s.container}>

            {/* ── Header ── */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
                    <Text style={s.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={s.headerTitle}>RIDE HISTORY</Text>
                <View style={s.headerSpacer} />
            </View>

            {/* ── Stat Cards ── */}
            <View style={s.statsRow}>
                {/* Completed */}
                <View style={s.statCard}>
                    <Text style={s.statValueYellow}>{completed.length}</Text>
                    <Text style={s.statLabel}>COMPLETED</Text>
                </View>

                {/* Total Spent */}
                <View style={[s.statCard, s.statCardMiddle]}>
                    <Text style={s.statValueYellow}>RS {totalSpent.toLocaleString()}</Text>
                    <Text style={s.statLabel}>TOTAL SPENT</Text>
                </View>

                {/* Cancelled */}
                <View style={s.statCard}>
                    <Text style={s.statValueRed}>{cancelled.length}</Text>
                    <Text style={s.statLabel}>CANCELLED</Text>
                </View>
            </View>

            {/* ── Filter Tabs ── */}
            <View style={s.filterRow}>
                {filterTabs.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[s.filterPill, filter === tab.key && s.filterPillActive]}
                        onPress={() => setFilter(tab.key)}
                        activeOpacity={0.75}
                    >
                        <Text style={[s.filterPillText, filter === tab.key && s.filterPillTextActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ── Content ── */}
            {loading ? (
                <View style={s.centered}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={s.loadingText}>Loading rides...</Text>
                </View>
            ) : error ? (
                <View style={s.centered}>
                    <Text style={s.emptyIcon}>⚠️</Text>
                    <Text style={s.errorText}>{error}</Text>
                    <TouchableOpacity onPress={fetchRides} style={s.retryBtn} activeOpacity={0.8}>
                        <Text style={s.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={s.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={theme.colors.primary}
                            colors={[theme.colors.primary]}
                        />
                    }
                >
                    {filtered.length === 0 ? (
                        <View style={s.emptyState}>
                            <View style={s.emptyIconCircle}>
                                <Text style={s.emptyIcon}>🚗</Text>
                            </View>
                            <Text style={s.emptyStateTitle}>No trips yet</Text>
                            <Text style={s.emptyStateSub}>Your completed and cancelled rides will appear here.</Text>
                            <TouchableOpacity 
                                style={s.bookNowBtn} 
                                onPress={() => navigation.navigate('Home')}
                                activeOpacity={0.8}
                            >
                                <Text style={s.bookNowText}>Book Your First Ride</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        filtered.map((ride, index) => (
                            <RideCard
                                key={ride.id}
                                ride={ride}
                                s={s}
                                isLast={index === filtered.length - 1}
                            />
                        ))
                    )}
                </ScrollView>
            )}
        </View>
    );
};

// ─── Ride Card sub-component ──────────────────────────────────────────────────

interface RideCardProps {
    ride: Ride;
    s: ReturnType<typeof makeStyles>;
    isLast: boolean;
}

const RideCard: React.FC<RideCardProps> = ({ ride, s, isLast }) => {
    const isDone = ride.status === 'completed';

    return (
        <View style={[s.rideCard, !isLast && s.rideCardBorder]}>
            <View style={s.cardInner}>

                {/* Left colored dot */}
                <View style={[s.statusDot, isDone ? s.dotDone : s.dotCancelled]} />

                {/* Route info */}
                <View style={s.routeBlock}>
                    <View style={s.routeNames}>
                        <Text style={s.routeFrom} numberOfLines={1}>{ride.from}</Text>
                        <Text style={s.routeArrow}>→</Text>
                        <Text style={s.routeTo} numberOfLines={1}>{ride.to}</Text>
                    </View>
                    <View style={s.rideMeta}>
                        {ride.driver !== '—' && (
                            <Text style={s.driverName}>{ride.driver}</Text>
                        )}
                        <Text style={s.rideDate}>{ride.date}</Text>
                    </View>
                </View>

                {/* Right: price + status badge */}
                <View style={s.rightBlock}>
                    <Text style={s.ridePrice}>{ride.price}</Text>
                    <View style={[s.statusBadge, isDone ? s.badgeDone : s.badgeCancelled]}>
                        <Text style={[s.statusBadgeText, isDone ? s.badgeTextDone : s.badgeTextCancelled]}>
                            {isDone ? '✓ Done' : '✗ Cancelled'}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (t: AppTheme) => StyleSheet.create({
    // ── Screen ──
    container: {
        flex: 1,
        backgroundColor: t.colors.background,
    },

    // ── Header ──
    header: {
        paddingTop: Platform.OS === 'ios' ? 54 : 42,
        paddingHorizontal: 20,
        paddingBottom: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: t.colors.background,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: t.colors.cardSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backArrow: {
        color: t.colors.text,
        fontSize: 20,
        lineHeight: 24,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: t.colors.text,
        letterSpacing: 2.5,
        fontFamily: t.fonts.heading,
    },
    headerSpacer: {
        width: 40,
    },

    // ── Stat Cards ──
    statsRow: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginBottom: 18,
        borderRadius: 16,
        backgroundColor: t.colors.card,
        borderWidth: 1,
        borderColor: t.colors.border,
        overflow: 'hidden',
        ...(t.shadows.sm as object),
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 8,
    },
    statCardMiddle: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: t.colors.divider,
    },
    statValueYellow: {
        color: t.colors.primary,
        fontSize: 17,
        fontWeight: '900',
        marginBottom: 4,
        fontFamily: t.fonts.bodyBold,
    },
    statValueRed: {
        color: t.colors.danger,
        fontSize: 17,
        fontWeight: '900',
        marginBottom: 4,
        fontFamily: t.fonts.bodyBold,
    },
    statLabel: {
        color: t.colors.textSecondary,
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.5,
        textAlign: 'center',
    },

    // ── Filter Tabs ──
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 8,
        marginBottom: 16,
    },
    filterPill: {
        flex: 1,
        paddingVertical: 9,
        paddingHorizontal: 6,
        borderRadius: 50,
        backgroundColor: t.colors.cardSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterPillActive: {
        backgroundColor: t.colors.primary,
    },
    filterPillText: {
        color: t.colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    filterPillTextActive: {
        color: '#000000',
        fontWeight: '700',
    },

    // ── Ride List ──
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },

    // ── Ride Card ──
    rideCard: {
        backgroundColor: t.colors.card,
        paddingVertical: 14,
    },
    rideCardBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: t.colors.divider,
    },
    cardInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },

    // Left dot
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        flexShrink: 0,
    },
    dotDone: {
        backgroundColor: '#22C55E',
    },
    dotCancelled: {
        backgroundColor: '#EF4444',
    },

    // Route block
    routeBlock: {
        flex: 1,
        gap: 5,
    },
    routeNames: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'nowrap',
        gap: 4,
    },
    routeFrom: {
        color: t.colors.text,
        fontSize: 13,
        fontWeight: '700',
        flexShrink: 1,
        fontFamily: t.fonts.bodyBold,
    },
    routeArrow: {
        color: t.colors.textSecondary,
        fontSize: 12,
        flexShrink: 0,
    },
    routeTo: {
        color: t.colors.text,
        fontSize: 13,
        fontWeight: '600',
        flexShrink: 1,
        fontFamily: t.fonts.bodyMedium,
    },
    rideMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    driverName: {
        color: t.colors.textSecondary,
        fontSize: 11,
        fontWeight: '500',
    },
    rideDate: {
        color: t.colors.placeholder,
        fontSize: 11,
    },

    // Right block
    rightBlock: {
        alignItems: 'flex-end',
        gap: 5,
        flexShrink: 0,
    },
    ridePrice: {
        color: t.colors.text,
        fontSize: 14,
        fontWeight: '900',
        fontFamily: t.fonts.bodyBold,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 50,
    },
    badgeDone: {
        backgroundColor: 'rgba(34,197,94,0.12)',
    },
    badgeCancelled: {
        backgroundColor: 'rgba(239,68,68,0.12)',
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    badgeTextDone: {
        color: '#22C55E',
    },
    badgeTextCancelled: {
        color: '#EF4444',
    },

    // ── States ──
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingTop: 60,
    },
    loadingText: {
        color: t.colors.textSecondary,
        fontSize: 13,
    },
    errorText: {
        color: t.colors.textSecondary,
        fontSize: 13,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    retryBtn: {
        backgroundColor: t.colors.primary,
        borderRadius: 10,
        paddingHorizontal: 24,
        paddingVertical: 10,
    },
    retryText: {
        color: '#000000',
        fontWeight: '700',
        fontSize: 13,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 80,
        paddingHorizontal: 40,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: t.colors.cardSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyIcon: {
        fontSize: 32,
    },
    emptyStateTitle: {
        color: t.colors.text,
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 8,
    },
    emptyStateSub: {
        color: t.colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 32,
    },
    bookNowBtn: {
        backgroundColor: t.colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 14,
        width: '100%',
        alignItems: 'center',
    },
    bookNowText: {
        color: '#000',
        fontWeight: '800',
        fontSize: 15,
    },
});

export default RideHistoryScreen;
