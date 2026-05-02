import React, { useEffect, useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../utils/theme';
import apiService from '../../services/api';

interface TripRecord {
    id: string;
    date: string;
    fare: number;
    passengerName: string;
    distance: number;
    pickup?: string;
    dropoff?: string;
}

interface EarningsStats {
    todayEarnings: number;
    weeklyEarnings: number;
    totalTrips: number;
    averageRating: string;
}

const DriverEarningsScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { theme } = useAppTheme();
    const s = useMemo(() => makeStyles(theme), [theme]);

    const [loading, setLoading]     = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats]         = useState<EarningsStats>({ todayEarnings: 0, weeklyEarnings: 0, totalTrips: 0, averageRating: '5.0' });
    const [trips, setTrips]         = useState<TripRecord[]>([]);
    const [error, setError]         = useState('');

    const loadEarnings = async () => {
        try {
            setError('');
            const res: any = await apiService.get('/drivers/earnings');
            if (res.success) {
                setStats(res.stats);
                setTrips(res.recentRides || []);
            } else {
                setError('Could not load earnings data.');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load earnings.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { loadEarnings(); }, []);

    const onRefresh = () => { setRefreshing(true); loadEarnings(); };

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        const today = new Date();
        const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
        if (diff === 0) return 'Today';
        if (diff === 1) return 'Yesterday';
        return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
    };

    const avgPerTrip = stats.totalTrips > 0
        ? Math.round(stats.weeklyEarnings / stats.totalTrips)
        : 0;

    if (loading) {
        return (
            <View style={s.centered}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView
            style={s.container}
            contentContainerStyle={s.scroll}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <View style={s.header}>
                <Text style={s.driverModeLabel}>DRIVER MODE</Text>
                <Text style={s.headerTitle}>MY EARNINGS</Text>
            </View>

            {error ? (
                <View style={s.errorCard}>
                    <Text style={s.errorText}>{error}</Text>
                    <TouchableOpacity onPress={loadEarnings}>
                        <Text style={s.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : null}

            {/* Top summary row */}
            <View style={s.summaryRow}>
                <View style={[s.summaryCard, s.primaryCard]}>
                    <Text style={s.summaryLabel}>TODAY'S EARNINGS</Text>
                    <Text style={s.summaryValue}>RS {stats.todayEarnings.toLocaleString()}</Text>
                </View>
                <View style={s.summaryCard}>
                    <Text style={s.summaryLabel}>THIS WEEK</Text>
                    <Text style={s.summaryValue}>RS {stats.weeklyEarnings.toLocaleString()}</Text>
                </View>
            </View>

            {/* 3 stat boxes */}
            <View style={s.statBoxRow}>
                <View style={s.statBox}>
                    <Text style={s.statBoxValue}>{stats.totalTrips}</Text>
                    <Text style={s.statBoxLabel}>TOTAL TRIPS</Text>
                </View>
                <View style={s.statBox}>
                    <Text style={s.statBoxValue}>{stats.averageRating}★</Text>
                    <Text style={s.statBoxLabel}>RATING</Text>
                </View>
                <View style={s.statBox}>
                    <Text style={s.statBoxValue}>RS {avgPerTrip}</Text>
                    <Text style={s.statBoxLabel}>AVG/TRIP</Text>
                </View>
            </View>

            {/* Recent Rides */}
            <Text style={s.sectionTitle}>RECENT RIDES</Text>

            {trips.length === 0 ? (
                <View style={s.emptyCard}>
                    <Text style={s.emptyIcon}>💰</Text>
                    <Text style={s.emptyTitle}>No earnings yet</Text>
                    <Text style={s.emptySub}>Complete your first ride to see earnings history here.</Text>
                </View>
            ) : (
                trips.map(trip => (
                    <View key={trip.id} style={s.tripCard}>
                        <View style={s.tripHeader}>
                            <View style={s.tripAvatarCircle}>
                                <Text style={s.tripAvatarText}>{(trip.passengerName || 'P').charAt(0).toUpperCase()}</Text>
                            </View>
                            <View style={s.tripInfo}>
                                <Text style={s.passengerName}>{trip.passengerName || 'Passenger'}</Text>
                                <Text style={s.tripMeta}>{formatDate(trip.date)} · {formatTime(trip.date)} · {trip.distance} km</Text>
                            </View>
                            <Text style={s.tripFare}>Rs {trip.fare}</Text>
                        </View>
                    </View>
                ))
            )}
        </ScrollView>
    );
};

const makeStyles = (t: AppTheme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    scroll:    { paddingBottom: 40 },
    centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.background },

    header: {
        paddingTop: Platform.OS === 'ios' ? 58 : 44,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    driverModeLabel: {
        fontSize: 11, fontWeight: '800', color: t.colors.primary,
        letterSpacing: 2, marginBottom: 6,
    },
    headerTitle: {
        fontSize: 32, fontWeight: '900', color: t.colors.text, letterSpacing: -0.5,
    },

    errorCard: {
        marginHorizontal: 20, marginBottom: 16, backgroundColor: 'rgba(255,68,68,0.08)',
        borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,68,68,0.2)',
    },
    errorText: { color: t.colors.danger, fontSize: 13, marginBottom: 8 },
    retryText: { color: t.colors.primary, fontWeight: '700', fontSize: 13 },

    summaryRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 12 },
    summaryCard: {
        flex: 1, backgroundColor: t.colors.card, borderRadius: 18,
        padding: 18, borderWidth: 1, borderColor: t.colors.border,
    },
    primaryCard: { borderColor: t.colors.primary, backgroundColor: t.dark ? 'rgba(245,197,24,0.07)' : 'rgba(245,197,24,0.05)' },
    summaryLabel: { fontSize: 9, color: t.colors.textSecondary, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
    summaryValue: { fontSize: 22, fontWeight: '900', color: t.colors.primary },

    statBoxRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 24 },
    statBox: {
        flex: 1, backgroundColor: t.colors.card, borderRadius: 14,
        paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center',
        borderWidth: 1, borderColor: t.colors.border,
    },
    statBoxValue: { fontSize: 15, fontWeight: '900', color: t.colors.text, marginBottom: 4, textAlign: 'center' },
    statBoxLabel: { fontSize: 9, fontWeight: '800', color: t.colors.textSecondary, letterSpacing: 0.8, textAlign: 'center' },

    sectionTitle: {
        fontSize: 11, fontWeight: '800', color: t.colors.textSecondary,
        letterSpacing: 1.5, paddingHorizontal: 20, marginBottom: 12,
    },

    tripCard: {
        marginHorizontal: 20, backgroundColor: t.colors.card, borderRadius: 16,
        padding: 16, marginBottom: 10, borderWidth: 1, borderColor: t.colors.border,
    },
    tripHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    tripAvatarCircle: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center',
    },
    tripAvatarText: { fontSize: 16, fontWeight: '900', color: t.colors.black },
    tripInfo: { flex: 1 },
    passengerName: { fontSize: 14, fontWeight: '800', color: t.colors.text, marginBottom: 3 },
    tripMeta: { fontSize: 11, color: t.colors.textSecondary },
    tripFare: { fontSize: 15, fontWeight: '900', color: t.colors.primary },

    emptyCard: {
        marginHorizontal: 20, backgroundColor: t.colors.card, borderRadius: 20,
        padding: 40, alignItems: 'center', borderWidth: 1, borderColor: t.colors.border,
    },
    emptyIcon:  { fontSize: 48, marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: t.colors.text, marginBottom: 8 },
    emptySub:   { fontSize: 14, color: t.colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});

export default DriverEarningsScreen;
