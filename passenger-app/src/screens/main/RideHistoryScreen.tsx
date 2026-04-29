import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import theme from '../../utils/theme';
import { useLanguage } from '../../context/LanguageContext';
import { STORAGE_KEYS } from '../../utils/constants';
import apiService from '../../services/api';

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

const typeLabel: Record<string, string> = {
    standard:   '🚗 Comfort AC',
    eco:        '🏍️ Eco Bike',
    'pink-pass':'🎀 Pink Pass',
};

const formatDate = (iso: string) => {
    if (!iso) return '—';
    const d    = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff === 0) return `Today, ${time}`;
    if (diff === 1) return `Yesterday, ${time}`;
    return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}, ${time}`;
};

const mapRide = (r: any): Ride => ({
    id:       r._id,
    date:     formatDate(r.completedAt || r.cancelledAt || r.createdAt),
    from:     r.pickupLocation?.address  || 'Pickup',
    to:       r.dropoffLocation?.address || 'Dropoff',
    price:    `RS ${r.actualPrice || r.estimatedPrice || 0}`,
    status:   r.status === 'completed' ? 'completed' : 'cancelled',
    type:     r.type || 'standard',
    duration: r.estimatedDuration ? `${r.estimatedDuration} min` : '—',
    driver:   r.driver?.user?.name || r.driver?.name || '—',
});

const RideHistoryScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { t }      = useLanguage();

    const [rides, setRides]           = useState<Ride[]>([]);
    const [loading, setLoading]       = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError]           = useState('');
    const [filter, setFilter]         = useState<'all' | 'completed' | 'cancelled'>('all');

    const fetchHistory = useCallback(async () => {
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
            if (!raw) { setLoading(false); return; }
            const user   = JSON.parse(raw);
            const userId = user.id || user._id;
            const res: any = await apiService.get(`/rides/history/${userId}`);
            setRides((res.rides || []).map(mapRide));
            setError('');
        } catch {
            setError('Could not load ride history. Pull down to retry.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);
    const onRefresh = () => { setRefreshing(true); fetchHistory(); };

    const filtered   = filter === 'all' ? rides : rides.filter(r => r.status === filter);
    const completed  = rides.filter(r => r.status === 'completed');
    const totalSpent = completed.reduce((s, r) => s + parseInt(r.price.replace('RS ', '') || '0'), 0);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t.rideHistoryTitle}</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Summary Card */}
            <View style={styles.summaryCard}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{completed.length}</Text>
                    <Text style={styles.summaryLabel}>{t.completedFilter}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>RS {totalSpent}</Text>
                    <Text style={styles.summaryLabel}>{t.totalSpent}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{rides.filter(r => r.status === 'cancelled').length}</Text>
                    <Text style={styles.summaryLabel}>{t.cancelledFilter}</Text>
                </View>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterRow}>
                {([
                    { key: 'all' as const,      label: t.allFilter },
                    { key: 'completed' as const, label: t.completedFilter },
                    { key: 'cancelled' as const, label: t.cancelledFilter },
                ]).map(f => (
                    <TouchableOpacity
                        key={f.key}
                        style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
                        onPress={() => setFilter(f.key)}
                    >
                        <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>Loading rides...</Text>
                </View>
            ) : error ? (
                <View style={styles.centered}>
                    <Text style={styles.emptyIcon}>⚠️</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={fetchHistory} style={styles.retryBtn}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={theme.colors.primary}
                        />
                    }
                >
                    {filtered.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>🚗</Text>
                            <Text style={styles.emptyText}>{t.noRidesFound}</Text>
                        </View>
                    ) : (
                        filtered.map(ride => (
                            <TouchableOpacity key={ride.id} style={styles.rideCard} activeOpacity={0.85}>
                                <View style={styles.cardTop}>
                                    <Text style={styles.rideDate}>{ride.date}</Text>
                                    <View style={[styles.statusBadge, ride.status === 'completed' ? styles.badgeCompleted : styles.badgeCancelled]}>
                                        <Text style={[styles.statusText, ride.status === 'completed' ? styles.textCompleted : styles.textCancelled]}>
                                            {ride.status === 'completed' ? t.completedBadge : t.cancelledBadge}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.routeSection}>
                                    <View style={styles.routeDots}>
                                        <View style={styles.dotOrigin} />
                                        <View style={styles.routeLine} />
                                        <View style={styles.dotDest} />
                                    </View>
                                    <View style={styles.routeTexts}>
                                        <Text style={styles.routeFrom} numberOfLines={1}>{ride.from}</Text>
                                        <Text style={styles.routeTo}   numberOfLines={1}>{ride.to}</Text>
                                    </View>
                                </View>
                                <View style={styles.cardBottom}>
                                    <Text style={styles.rideType}>{typeLabel[ride.type] || ride.type}</Text>
                                    <View style={styles.cardMeta}>
                                        {ride.duration !== '—' && <Text style={styles.metaItem}>⏱ {ride.duration}</Text>}
                                        {ride.driver   !== '—' && <Text style={styles.metaItem}>👤 {ride.driver}</Text>}
                                    </View>
                                    <Text style={styles.ridePrice}>{ride.price}</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container:      { flex: 1, backgroundColor: theme.colors.background },
    header:         { paddingTop: Platform.OS === 'ios' ? 50 : 40, paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn:        { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center' },
    backText:       { color: theme.colors.text, fontSize: 20 },
    headerTitle:    { fontSize: 16, fontWeight: '900', color: theme.colors.text, letterSpacing: 2 },
    summaryCard:    { flexDirection: 'row', backgroundColor: theme.colors.card, marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 16, justifyContent: 'space-around', borderWidth: 1, borderColor: '#1E1E1E' },
    summaryItem:    { alignItems: 'center' },
    summaryValue:   { color: theme.colors.primary, fontSize: 18, fontWeight: '900' },
    summaryLabel:   { color: theme.colors.textSecondary, fontSize: 11, marginTop: 4 },
    summaryDivider: { width: 1, height: 32, backgroundColor: '#1E1E1E', alignSelf: 'center' },
    filterRow:      { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16 },
    filterBtn:      { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: theme.colors.card, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
    filterBtnActive:{ borderColor: theme.colors.primary, backgroundColor: 'rgba(245,197,24,0.08)' },
    filterText:     { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
    filterTextActive:{ color: theme.colors.primary },
    scroll:         { paddingHorizontal: 20, paddingBottom: 40 },
    centered:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
    loadingText:    { color: theme.colors.textSecondary, fontSize: 13 },
    errorText:      { color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
    retryBtn:       { backgroundColor: theme.colors.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
    retryText:      { color: theme.colors.black, fontWeight: '700', fontSize: 13 },
    emptyState:     { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyIcon:      { fontSize: 40 },
    emptyText:      { color: theme.colors.textSecondary, fontSize: 14 },
    rideCard:       { backgroundColor: theme.colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1E1E1E' },
    cardTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    rideDate:       { color: theme.colors.textSecondary, fontSize: 12 },
    statusBadge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    badgeCompleted: { backgroundColor: 'rgba(0,230,118,0.08)', borderColor: 'rgba(0,230,118,0.25)' },
    badgeCancelled: { backgroundColor: 'rgba(255,68,68,0.08)', borderColor: 'rgba(255,68,68,0.25)' },
    statusText:     { fontSize: 11, fontWeight: '700' },
    textCompleted:  { color: theme.colors.success },
    textCancelled:  { color: theme.colors.danger },
    routeSection:   { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'center' },
    routeDots:      { alignItems: 'center', paddingVertical: 3 },
    dotOrigin:      { width: 8, height: 8, borderRadius: 4, borderWidth: 2, borderColor: theme.colors.primary },
    routeLine:      { width: 1.5, height: 18, backgroundColor: '#2A2A2A', marginVertical: 3 },
    dotDest:        { width: 8, height: 8, borderRadius: 2, backgroundColor: theme.colors.primary },
    routeTexts:     { flex: 1, justifyContent: 'space-between', gap: 12 },
    routeFrom:      { color: theme.colors.text, fontSize: 13, fontWeight: '600' },
    routeTo:        { color: theme.colors.text, fontSize: 13, fontWeight: '600' },
    cardBottom:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1E1E1E' },
    rideType:       { color: theme.colors.textSecondary, fontSize: 11, flex: 1 },
    cardMeta:       { flexDirection: 'row', gap: 10, flex: 1, justifyContent: 'center' },
    metaItem:       { color: theme.colors.textSecondary, fontSize: 10 },
    ridePrice:      { color: theme.colors.primary, fontSize: 14, fontWeight: '900' },
});

export default RideHistoryScreen;
