import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import apiService from '../../services/api';

// ─── Always-dark palette (Driver Earnings is permanently dark) ────────────────
const D = {
    bg:      '#0A0E1A',
    card:    '#141A28',
    border:  '#1F2937',
    text:    '#FFFFFF',
    textSub: '#8B949E',
    yellow:  '#F5C518',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecentRide {
    id: string;
    passengerName: string;
    pickup: string;
    dropoff: string;
    fare: number;
    time: string;
}

const MOCK_RIDES: RecentRide[] = [
    { id: '1', passengerName: 'Sara Malik',  pickup: 'Gulberg',  dropoff: 'Garden Town', fare: 185, time: '9:01 AM'  },
    { id: '2', passengerName: 'Ayesha Khan', pickup: 'DHA Ph.5', dropoff: 'MM Alam Rd',  fare: 220, time: '11:20 AM' },
    { id: '3', passengerName: 'Zainab Ali',  pickup: 'Cantt',    dropoff: 'Garden Town', fare: 150, time: '1:00 PM'  },
    { id: '4', passengerName: 'Hina Butt',   pickup: 'Bahria',   dropoff: 'Wapda Town',  fare: 310, time: '3:35 PM'  },
];

const AVATAR_COLORS = ['#F5C518', '#EC4899', '#22C55E', '#3B82F6', '#8B5CF6'];

// ─── Component ────────────────────────────────────────────────────────────────

const EarningsScreen: React.FC = () => {
    const { theme }  = useAppTheme();

    const [loading, setLoading]       = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [todayEarnings, setToday]   = useState(2450);
    const [weekEarnings, setWeek]     = useState(12300);
    const [totalTrips, setTrips]      = useState(14);
    const [avgRating, setRating]      = useState('4.5');
    const [avgFare, setAvgFare]       = useState(175);
    const [rides, setRides]           = useState<RecentRide[]>(MOCK_RIDES);

    const fetchEarnings = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        try {
            const res: any = await apiService.get('/drivers/earnings');
            if (res?.stats) {
                setToday(res.stats.todayEarnings  ?? 2450);
                setWeek(res.stats.weeklyEarnings  ?? 12300);
                setTrips(res.stats.totalTrips     ?? 14);
                setRating(res.stats.averageRating ?? '4.5');
                setAvgFare(res.stats.avgFare      ?? 175);
            }
            if (res?.recentRides?.length) setRides(res.recentRides);
        } catch {
            // Keep mock data
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchEarnings(); }, []);

    const ListHeader = () => (
        <View>
            <StatusBar barStyle="light-content" backgroundColor={D.bg} />
            <Text style={styles.driverLabel}>DRIVER MODE</Text>
            <View style={styles.titleRow}>
                <Text style={styles.title}>MY EARNINGS</Text>
                <View style={styles.menuDot}><Text style={styles.menuDotText}>•••</Text></View>
            </View>

            <View style={styles.bigCardsRow}>
                <View style={styles.bigCard}>
                    <Text style={styles.bigCardLabel}>TODAY'S EARNINGS</Text>
                    <Text style={[styles.bigCardValue, { color: theme.colors.primary }]}>
                        RS {todayEarnings.toLocaleString()}
                    </Text>
                </View>
                <View style={styles.bigCard}>
                    <Text style={styles.bigCardLabel}>THIS WEEK</Text>
                    <Text style={[styles.bigCardValue, { color: theme.colors.primary }]}>
                        RS {weekEarnings.toLocaleString()}
                    </Text>
                </View>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statCol}>
                    <Text style={styles.statVal}>{totalTrips}</Text>
                    <Text style={styles.statLbl}>TOTAL TRIPS</Text>
                </View>
                <View style={styles.statDiv} />
                <View style={styles.statCol}>
                    <Text style={styles.statVal}>{avgRating}★</Text>
                    <Text style={styles.statLbl}>RATING</Text>
                </View>
                <View style={styles.statDiv} />
                <View style={styles.statCol}>
                    <Text style={[styles.statVal, { color: theme.colors.primary }]}>
                        RS {avgFare}
                    </Text>
                    <Text style={styles.statLbl}>AVG/TRIP</Text>
                </View>
            </View>

            <Text style={styles.sectionLbl}>RECENT RIDES</Text>
        </View>
    );

    const renderRide = ({ item, index }: { item: RecentRide; index: number }) => (
        <View style={styles.rideRow}>
            <View style={[styles.avatar, { backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length] }]}>
                <Text style={styles.avatarTxt}>{item.passengerName[0]}</Text>
            </View>
            <View style={styles.rideInfo}>
                <Text style={styles.rideName}>{item.passengerName}</Text>
                <Text style={styles.rideRoute}>{item.pickup} → {item.dropoff}</Text>
            </View>
            <View style={styles.rideRight}>
                <Text style={[styles.rideFare, { color: theme.colors.primary }]}>Rs {item.fare}</Text>
                <Text style={styles.rideTime}>{item.time}</Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={D.yellow} />
            </View>
        );
    }

    return (
        <FlatList
            style={styles.root}
            data={rides}
            keyExtractor={i => i.id}
            renderItem={renderRide}
            ListHeaderComponent={<ListHeader />}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => fetchEarnings(true)}
                    tintColor={D.yellow}
                />
            }
            contentContainerStyle={styles.content}
        />
    );
};

const styles = StyleSheet.create({
    root:    { flex: 1, backgroundColor: D.bg },
    center:  { flex: 1, backgroundColor: D.bg, alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 56 },

    driverLabel: { fontSize: 11, fontWeight: '700', color: D.yellow, letterSpacing: 2, marginBottom: 8 },
    titleRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title:       { fontSize: 32, fontWeight: '900', color: D.text, letterSpacing: 1 },
    menuDot:     { width: 36, height: 36, borderRadius: 18, backgroundColor: D.card, alignItems: 'center', justifyContent: 'center' },
    menuDotText: { color: D.textSub, fontSize: 14, letterSpacing: 1 },

    bigCardsRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
    bigCard:     { flex: 1, backgroundColor: D.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: D.border },
    bigCardLabel:{ fontSize: 10, fontWeight: '700', color: D.textSub, letterSpacing: 1, marginBottom: 8 },
    bigCardValue:{ fontSize: 22, fontWeight: '900' },

    statsRow: { flexDirection: 'row', backgroundColor: D.card, borderRadius: 16, borderWidth: 1, borderColor: D.border, paddingVertical: 14, paddingHorizontal: 8, marginBottom: 24 },
    statCol:  { flex: 1, alignItems: 'center' },
    statVal:  { fontSize: 18, fontWeight: '900', color: D.text },
    statLbl:  { fontSize: 9, fontWeight: '700', color: D.textSub, letterSpacing: 1, marginTop: 4 },
    statDiv:  { width: 1, backgroundColor: D.border, marginHorizontal: 4 },

    sectionLbl: { fontSize: 11, fontWeight: '700', color: D.textSub, letterSpacing: 2, marginBottom: 12 },

    rideRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
    avatar:    { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    avatarTxt: { fontSize: 18, fontWeight: '900', color: '#000' },
    rideInfo:  { flex: 1 },
    rideName:  { fontSize: 14, fontWeight: '700', color: D.text },
    rideRoute: { fontSize: 12, color: D.textSub, marginTop: 3 },
    rideRight: { alignItems: 'flex-end' },
    rideFare:  { fontSize: 15, fontWeight: '800' },
    rideTime:  { fontSize: 11, color: D.textSub, marginTop: 3 },
    sep:       { height: 1, backgroundColor: D.border },
});

export default EarningsScreen;
