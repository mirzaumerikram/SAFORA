import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import theme from '../../utils/theme';
import { apiClient } from '../../services/api';

interface TripRecord {
    id: string;
    pickup: string;
    dropoff: string;
    fare: number;
    distance: number;
    completedAt: string;
    passengerName: string;
}

interface EarningsSummary {
    today: number;
    thisWeek: number;
    thisMonth: number;
    totalTrips: number;
    avgRating: number;
}

const DriverEarningsScreen: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [summary, setSummary] = useState<EarningsSummary>({
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        totalTrips: 0,
        avgRating: 5.0,
    });
    const [trips, setTrips] = useState<TripRecord[]>([]);

    useEffect(() => {
        loadEarnings();
    }, []);

    const loadEarnings = async () => {
        try {
            // Will connect to /api/rides/history/:userId once auth token is stored
            setLoading(false);
        } catch (err) {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadEarnings();
        setRefreshing(false);
    };

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        const today = new Date();
        const diff = today.getDate() - d.getDate();
        if (diff === 0) return 'Today';
        if (diff === 1) return 'Yesterday';
        return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Earnings</Text>
                <Text style={styles.headerSub}>Lahore · Active Driver</Text>
            </View>

            {/* Summary Cards */}
            <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, styles.primaryCard]}>
                    <Text style={styles.summaryLabel}>TODAY</Text>
                    <Text style={styles.summaryValue}>RS {summary.today.toLocaleString()}</Text>
                </View>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>THIS WEEK</Text>
                    <Text style={styles.summaryValue}>RS {summary.thisWeek.toLocaleString()}</Text>
                </View>
            </View>

            <View style={styles.summaryRow}>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>THIS MONTH</Text>
                    <Text style={styles.summaryValue}>RS {summary.thisMonth.toLocaleString()}</Text>
                </View>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>TOTAL TRIPS</Text>
                    <Text style={styles.summaryValue}>{summary.totalTrips}</Text>
                </View>
            </View>

            <View style={styles.ratingCard}>
                <Text style={styles.ratingLabel}>Average Rating</Text>
                <View style={styles.ratingRow}>
                    <Text style={styles.starIcon}>⭐</Text>
                    <Text style={styles.ratingValue}>{summary.avgRating}</Text>
                    <Text style={styles.ratingOut}>/ 5.0</Text>
                </View>
            </View>

            {/* Trip History */}
            <Text style={styles.sectionTitle}>Recent Trips</Text>

            {trips.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyIcon}>💰</Text>
                    <Text style={styles.emptyTitle}>No earnings yet</Text>
                    <Text style={styles.emptySub}>Complete your first ride to see your earnings history here.</Text>
                </View>
            ) : (
                trips.map((trip) => (
                    <View key={trip.id} style={styles.tripCard}>
                        <View style={styles.tripHeader}>
                            <Text style={styles.passengerName}>{trip.passengerName}</Text>
                            <Text style={styles.tripFare}>RS {trip.fare}</Text>
                        </View>

                        <View style={styles.routeRow}>
                            <View style={styles.routeDots}>
                                <View style={styles.dotStart} />
                                <View style={styles.routeLine} />
                                <View style={styles.dotEnd} />
                            </View>
                            <View style={styles.routeLabels}>
                                <Text style={styles.routeText}>{trip.pickup}</Text>
                                <Text style={styles.routeText}>{trip.dropoff}</Text>
                            </View>
                        </View>

                        <View style={styles.tripMeta}>
                            <Text style={styles.metaText}>{trip.distance} km</Text>
                            <Text style={styles.metaDot}>·</Text>
                            <Text style={styles.metaText}>{formatDate(trip.completedAt)} {formatTime(trip.completedAt)}</Text>
                        </View>
                    </View>
                ))
            )}

            <View style={{ height: 40 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.background,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: theme.colors.text,
    },
    headerSub: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    summaryRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 12,
        marginBottom: 12,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: theme.colors.card,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#222',
    },
    primaryCard: {
        borderColor: theme.colors.primary,
        backgroundColor: 'rgba(245,184,0,0.07)',
    },
    summaryLabel: {
        fontSize: 9,
        color: theme.colors.textSecondary,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: '900',
        color: theme.colors.text,
    },
    ratingCard: {
        marginHorizontal: 16,
        backgroundColor: theme.colors.card,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#222',
        marginBottom: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    ratingLabel: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    starIcon: {
        fontSize: 16,
    },
    ratingValue: {
        fontSize: 22,
        fontWeight: '900',
        color: theme.colors.primary,
    },
    ratingOut: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        alignSelf: 'flex-end',
        marginBottom: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: theme.colors.text,
        paddingHorizontal: 24,
        marginBottom: 12,
    },
    tripCard: {
        marginHorizontal: 16,
        backgroundColor: theme.colors.card,
        borderRadius: 20,
        padding: 20,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#1e1e1e',
    },
    tripHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    passengerName: {
        fontSize: 14,
        fontWeight: '800',
        color: theme.colors.text,
    },
    tripFare: {
        fontSize: 15,
        fontWeight: '900',
        color: theme.colors.primary,
    },
    routeRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    routeDots: {
        alignItems: 'center',
        paddingVertical: 2,
    },
    dotStart: {
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    routeLine: {
        width: 2,
        flex: 1,
        backgroundColor: '#333',
        marginVertical: 3,
    },
    dotEnd: {
        width: 8,
        height: 8,
        backgroundColor: theme.colors.primary,
        borderRadius: 2,
    },
    routeLabels: {
        flex: 1,
        justifyContent: 'space-between',
    },
    routeText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    tripMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 11,
        color: '#555',
    },
    metaDot: {
        color: '#555',
    },
    emptyCard: {
        marginHorizontal: 16,
        backgroundColor: theme.colors.card,
        borderRadius: 24,
        padding: 40,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1e1e1e',
        marginTop: 10,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: theme.colors.text,
        marginBottom: 8,
    },
    emptySub: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default DriverEarningsScreen;
