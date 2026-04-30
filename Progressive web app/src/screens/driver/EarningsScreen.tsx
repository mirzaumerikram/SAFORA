import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import theme from '../../utils/theme';
import apiService from '../../services/api';

interface RideHistory {
    id: string;
    date: string;
    fare: number;
    passengerName: string;
    distance: number;
}

interface EarningsStats {
    todayEarnings: number;
    weeklyEarnings: number;
    totalTrips: number;
    averageRating: string;
}

const EarningsScreen: React.FC = () => {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<EarningsStats>({
        todayEarnings: 0,
        weeklyEarnings: 0,
        totalTrips: 0,
        averageRating: '5.0',
    });
    const [recentRides, setRecentRides] = useState<RideHistory[]>([]);

    useEffect(() => {
        fetchEarnings();
    }, []);

    const fetchEarnings = async () => {
        try {
            const res = await apiService.get('/drivers/earnings');
            if (res.success) {
                setStats(res.stats);
                setRecentRides(res.recentRides);
            }
        } catch (error) {
            console.error('Failed to fetch earnings', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' ' +
               date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Earnings</Text>
            <View style={{ width: 40 }} />
        </View>
    );

    const renderOverview = () => (
        <View style={styles.overviewContainer}>
            <View style={styles.overviewCard}>
                <Text style={styles.overviewLabel}>TODAY'S EARNINGS</Text>
                <Text style={styles.overviewValue}>RS {stats.todayEarnings}</Text>
            </View>
            <View style={styles.overviewCard}>
                <Text style={styles.overviewLabel}>THIS WEEK</Text>
                <Text style={styles.overviewValue}>RS {stats.weeklyEarnings}</Text>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statVal}>{stats.totalTrips}</Text>
                    <Text style={styles.statLabel}>Total Trips</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statVal}>⭐ {stats.averageRating}</Text>
                    <Text style={styles.statLabel}>Rating</Text>
                </View>
            </View>
        </View>
    );

    const renderRideItem = ({ item }: { item: RideHistory }) => (
        <View style={styles.rideItem}>
            <View style={styles.rideIconContainer}>
                <Text style={styles.rideIcon}>🚗</Text>
            </View>
            <View style={styles.rideInfo}>
                <Text style={styles.passengerName}>{item.passengerName}</Text>
                <Text style={styles.rideDate}>{formatDate(item.date)} • {item.distance} km</Text>
            </View>
            <Text style={styles.rideFare}>+RS {item.fare}</Text>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.loadingCenter]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {renderHeader()}
            <FlatList
                data={recentRides}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={() => (
                    <>
                        {renderOverview()}
                        <Text style={styles.sectionTitle}>Recent Rides</Text>
                        {recentRides.length === 0 && (
                            <Text style={styles.emptyText}>No recent rides found.</Text>
                        )}
                    </>
                )}
                renderItem={renderRideItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    loadingCenter: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 50 : 40,
        paddingHorizontal: 20,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.background,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: theme.colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#1E1E1E',
    },
    backText: {
        color: theme.colors.text,
        fontSize: 20,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: theme.colors.text,
        letterSpacing: 1.5,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    overviewContainer: {
        marginBottom: 24,
    },
    overviewCard: {
        backgroundColor: theme.colors.card,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#1E1E1E',
    },
    overviewLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: theme.colors.textSecondary,
        letterSpacing: 2,
        marginBottom: 6,
    },
    overviewValue: {
        fontSize: 32,
        fontWeight: '900',
        color: theme.colors.primary,
        letterSpacing: -1,
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: theme.colors.card,
        borderRadius: 16,
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: '#1E1E1E',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statVal: {
        fontSize: 20,
        fontWeight: '900',
        color: theme.colors.text,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    statDivider: {
        width: 1,
        backgroundColor: '#1E1E1E',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: theme.colors.text,
        marginBottom: 16,
        marginLeft: 4,
    },
    emptyText: {
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: 20,
        fontSize: 13,
    },
    rideItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.card,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#1E1E1E',
    },
    rideIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#111',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    rideIcon: {
        fontSize: 20,
    },
    rideInfo: {
        flex: 1,
    },
    passengerName: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 4,
    },
    rideDate: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    rideFare: {
        fontSize: 15,
        fontWeight: '900',
        color: '#00e676',
    },
});

export default EarningsScreen;
