import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Switch, Modal, ActivityIndicator,
    Dimensions, Alert, Platform, PermissionsAndroid,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';
import SaforaMap from '../../components/SaforaMap';
import theme from '../../utils/theme';
import socketService from '../../services/socket.service';
import apiService from '../../services/api';
import { STORAGE_KEYS } from '../../utils/constants';

const { width } = Dimensions.get('window');

type RideStatus = 'idle' | 'incoming' | 'accepted' | 'started' | 'completed';

interface IncomingRide {
    rideId: string;
    pickup: { address: string };
    dropoff: { address: string };
    estimatedPrice: number;
    estimatedDuration: number;
    distance: number;
    type: string;
    passenger?: { name: string };
}

const DriverDashboard: React.FC = () => {
    const navigation = useNavigation<any>();
    const [isOnline, setIsOnline]     = useState(false);
    const [rideStatus, setRideStatus] = useState<RideStatus>('idle');
    const [incoming, setIncoming]     = useState<IncomingRide | null>(null);
    const [activeRide, setActiveRide] = useState<IncomingRide | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [driverId, setDriverId]     = useState<string>('');
    const [earnings, setEarnings]     = useState({ today: 0, trips: 0, rating: '4.9' });
    const socketConnected = useRef(false);
    const watchId = useRef<number | null>(null);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEYS.USER_DATA).then(raw => {
            if (raw) {
                const user = JSON.parse(raw);
                setDriverId(user.id || user._id || '');
            }
        });
    }, []);

    // Connect socket and listen for ride requests when going online
    const handleToggleOnline = async (value: boolean) => {
        setIsOnline(value);
        if (value) {
            try {
                await socketService.connect();
                socketConnected.current = true;
                if (driverId) socketService.emitDriverOnline(driverId);

                socketService.onRideRequest((data: IncomingRide) => {
                    setIncoming(data);
                    setRideStatus('incoming');
                });
            } catch (e) {
                console.log('[Driver] Socket connect failed:', e);
            }
        } else {
            if (driverId) socketService.emitDriverOffline(driverId);
            socketService.offAll();
            socketConnected.current = false;
            setRideStatus('idle');
            setIncoming(null);
        }
    };

    const requestLocationPermission = async (): Promise<boolean> => {
        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                { title: 'Location Permission', message: 'SAFORA needs your location to track the ride.', buttonPositive: 'Allow' }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true; // iOS handled by Info.plist
    };

    const startGPS = async (rideId: string) => {
        const allowed = await requestLocationPermission();
        if (!allowed) return;
        watchId.current = Geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                socketService.emitLocationUpdate(rideId, latitude, longitude);
            },
            (err) => console.log('[GPS] Error:', err.message),
            { enableHighAccuracy: true, distanceFilter: 5, interval: 4000, fastestInterval: 2000 }
        );
    };

    const stopGPS = () => {
        if (watchId.current !== null) {
            Geolocation.clearWatch(watchId.current);
            watchId.current = null;
        }
    };

    const handleAccept = async () => {
        if (!incoming) return;
        setActionLoading(true);
        try {
            await apiService.patch(`/rides/${incoming.rideId}/accept`, {});
            setActiveRide(incoming);
            setIncoming(null);
            setRideStatus('accepted');
            startGPS(incoming.rideId);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to accept ride');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!incoming) return;
        setActionLoading(true);
        try {
            await apiService.patch(`/rides/${incoming.rideId}/reject`, {});
        } catch { /* ignore */ } finally {
            setIncoming(null);
            setRideStatus('idle');
            setActionLoading(false);
        }
    };

    const handleStartRide = async () => {
        if (!activeRide) return;
        setActionLoading(true);
        try {
            await apiService.patch(`/rides/${activeRide.rideId}/status`, { status: 'started' });
            setRideStatus('started');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to start ride');
        } finally {
            setActionLoading(false);
        }
    };

    const handleEndRide = async () => {
        if (!activeRide) return;
        setActionLoading(true);
        try {
            await apiService.patch(`/rides/${activeRide.rideId}/status`, { status: 'completed' });
            stopGPS();
            setEarnings(prev => ({
                today: prev.today + (activeRide.estimatedPrice || 0),
                trips: prev.trips + 1,
                rating: prev.rating,
            }));
            setRideStatus('completed');
            setTimeout(() => {
                setActiveRide(null);
                setRideStatus('idle');
            }, 2000);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to end ride');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <SaforaMap type="home" />

            {/* Incoming Ride Modal */}
            <Modal visible={rideStatus === 'incoming'} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.rideModal}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>🚗 Ride Request</Text>

                        <View style={styles.routeCard}>
                            <View style={styles.routeRow}>
                                <View style={styles.dotFrom} />
                                <View style={styles.routeTexts}>
                                    <Text style={styles.routeLabel}>PICKUP</Text>
                                    <Text style={styles.routeAddr} numberOfLines={1}>
                                        {incoming?.pickup?.address || '—'}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.routeDivider} />
                            <View style={styles.routeRow}>
                                <View style={styles.dotTo} />
                                <View style={styles.routeTexts}>
                                    <Text style={styles.routeLabel}>DROPOFF</Text>
                                    <Text style={styles.routeAddr} numberOfLines={1}>
                                        {incoming?.dropoff?.address || '—'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statVal}>RS {incoming?.estimatedPrice || '—'}</Text>
                                <Text style={styles.statLabel}>Fare</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statVal}>{incoming?.distance || '—'} km</Text>
                                <Text style={styles.statLabel}>Distance</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statVal}>{incoming?.estimatedDuration || '—'} min</Text>
                                <Text style={styles.statLabel}>Duration</Text>
                            </View>
                        </View>

                        {incoming?.type === 'pink-pass' && (
                            <View style={styles.pinkBadge}>
                                <Text style={styles.pinkBadgeText}>🎀 Pink Pass — Female passenger</Text>
                            </View>
                        )}

                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={[styles.rejectBtn, actionLoading && { opacity: 0.5 }]}
                                onPress={handleReject}
                                disabled={actionLoading}
                            >
                                <Text style={styles.rejectText}>✕ Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.acceptBtn, actionLoading && { opacity: 0.5 }]}
                                onPress={handleAccept}
                                disabled={actionLoading}
                            >
                                {actionLoading
                                    ? <ActivityIndicator color={theme.colors.black} />
                                    : <Text style={styles.acceptText}>✓ Accept</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <View style={styles.overlay}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={[styles.onlineBadge, isOnline && styles.onlineBadgeActive]}>
                        <View style={[styles.onlineDot, isOnline && styles.onlineDotActive]} />
                        <Text style={[styles.onlineText, isOnline && styles.onlineTextActive]}>
                            {isOnline ? 'ONLINE' : 'OFFLINE'}
                        </Text>
                    </View>
                    <Switch
                        trackColor={{ false: '#333', true: theme.colors.primary }}
                        thumbColor={'#fff'}
                        onValueChange={handleToggleOnline}
                        value={isOnline}
                    />
                </View>

                {/* Earnings Card */}
                {rideStatus === 'idle' && (
                    <TouchableOpacity 
                        style={styles.earningsCard} 
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('Earnings')}
                    >
                        <View style={styles.earnItem}>
                            <Text style={styles.earnVal}>RS {earnings.today}</Text>
                            <Text style={styles.earnLabel}>Today</Text>
                        </View>
                        <View style={styles.vDivider} />
                        <View style={styles.earnItem}>
                            <Text style={styles.earnVal}>{earnings.trips}</Text>
                            <Text style={styles.earnLabel}>Trips</Text>
                        </View>
                        <View style={styles.vDivider} />
                        <View style={styles.earnItem}>
                            <Text style={styles.earnVal}>⭐ {earnings.rating}</Text>
                            <Text style={styles.earnLabel}>Rating</Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Active Ride Bottom Sheet */}
                {(rideStatus === 'accepted' || rideStatus === 'started') && activeRide && (
                    <View style={styles.activeSheet}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.activeTitle}>
                            {rideStatus === 'accepted' ? '🚗 Head to Pickup' : '🛣️ Ride in Progress'}
                        </Text>
                        <Text style={styles.activeAddr} numberOfLines={1}>
                            {rideStatus === 'accepted'
                                ? activeRide.pickup?.address
                                : activeRide.dropoff?.address}
                        </Text>
                        <View style={styles.activeFareRow}>
                            <Text style={styles.activeFareLabel}>Fare</Text>
                            <Text style={styles.activeFareVal}>RS {activeRide.estimatedPrice}</Text>
                        </View>
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={[styles.chatBtn, { flex: 1 }]}
                                onPress={() => navigation.navigate('Chat', {
                                    rideId: activeRide.rideId,
                                    senderRole: 'driver',
                                    driverName: 'You',
                                })}
                            >
                                <Text style={styles.chatIcon}>💬 Chat</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.rideActionBtn, { flex: 3 }, rideStatus === 'started' && styles.endBtn, actionLoading && { opacity: 0.6 }]}
                                onPress={rideStatus === 'accepted' ? handleStartRide : handleEndRide}
                                disabled={actionLoading}
                            >
                                {actionLoading
                                    ? <ActivityIndicator color={theme.colors.black} />
                                    : <Text style={styles.rideActionText}>
                                        {rideStatus === 'accepted' ? '▶ Start Ride' : '■ End Ride'}
                                      </Text>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {rideStatus === 'completed' && (
                    <View style={styles.activeSheet}>
                        <Text style={styles.completedText}>✅ Ride Completed!</Text>
                        <Text style={styles.completedSub}>Earnings updated</Text>
                    </View>
                )}

                {/* Waiting message */}
                {isOnline && rideStatus === 'idle' && (
                    <View style={styles.waitingSheet}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.waitingTitle}>Waiting for rides...</Text>
                        <Text style={styles.waitingSub}>You'll be notified when a passenger books</Text>
                    </View>
                )}

                {!isOnline && rideStatus === 'idle' && (
                    <View style={styles.waitingSheet}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.waitingTitle}>You are Offline</Text>
                        <Text style={styles.waitingSub}>Toggle the switch above to go online</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    overlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: 'box-none',
    },
    header: {
        position: 'absolute', top: 52, left: 20, right: 20,
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.card,
        borderRadius: 16, padding: 14,
        borderWidth: 1, borderColor: '#222',
    },
    onlineBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    onlineBadgeActive: {},
    onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#666' },
    onlineDotActive: { backgroundColor: '#00e676' },
    onlineText: { fontSize: 13, fontWeight: '800', color: '#666', letterSpacing: 1 },
    onlineTextActive: { color: '#00e676' },
    earningsCard: {
        position: 'absolute', top: 130, left: 20, right: 20,
        flexDirection: 'row', backgroundColor: theme.colors.card,
        borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#222',
    },
    earnItem: { flex: 1, alignItems: 'center' },
    earnVal: { fontSize: 16, fontWeight: '900', color: theme.colors.primary, marginBottom: 2 },
    earnLabel: { fontSize: 10, color: theme.colors.textSecondary, letterSpacing: 1 },
    vDivider: { width: 1, backgroundColor: '#222' },

    // Incoming ride modal
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    rideModal: {
        backgroundColor: theme.colors.card, borderTopLeftRadius: 24,
        borderTopRightRadius: 24, padding: 24, paddingBottom: 40,
    },
    modalHandle: { width: 40, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.text, marginBottom: 16 },
    routeCard: {
        backgroundColor: '#111', borderRadius: 14, padding: 16, marginBottom: 16,
    },
    routeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    dotFrom: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: theme.colors.primary },
    dotTo:   { width: 10, height: 10, borderRadius: 2, backgroundColor: theme.colors.primary },
    routeTexts: { flex: 1 },
    routeLabel: { fontSize: 9, fontWeight: '800', color: theme.colors.textSecondary, letterSpacing: 1.5 },
    routeAddr:  { fontSize: 13, fontWeight: '600', color: theme.colors.text },
    routeDivider: { height: 1, backgroundColor: '#222', marginVertical: 10, marginLeft: 22 },
    statsRow: { flexDirection: 'row', marginBottom: 14 },
    statItem: { flex: 1, alignItems: 'center' },
    statVal:  { fontSize: 16, fontWeight: '900', color: theme.colors.primary, marginBottom: 2 },
    statLabel:{ fontSize: 10, color: theme.colors.textSecondary },
    statDivider: { width: 1, backgroundColor: '#333' },
    pinkBadge: {
        backgroundColor: 'rgba(255,105,180,0.15)', borderRadius: 10,
        padding: 10, marginBottom: 14, alignItems: 'center',
    },
    pinkBadgeText: { fontSize: 12, color: '#FF69B4', fontWeight: '700' },
    actionRow: { flexDirection: 'row', gap: 12 },
    rejectBtn: {
        flex: 1, backgroundColor: '#1a1a1a', borderRadius: 14,
        paddingVertical: 16, alignItems: 'center',
        borderWidth: 1, borderColor: '#e74c3c',
    },
    rejectText: { color: '#e74c3c', fontWeight: '700', fontSize: 15 },
    acceptBtn: {
        flex: 2, backgroundColor: theme.colors.primary, borderRadius: 14,
        paddingVertical: 16, alignItems: 'center',
    },
    acceptText: { color: theme.colors.black, fontWeight: '700', fontSize: 15 },

    // Active ride
    activeSheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: theme.colors.card, borderTopLeftRadius: 24,
        borderTopRightRadius: 24, padding: 24, paddingBottom: 40,
    },
    sheetHandle: { width: 40, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    activeTitle: { fontSize: 16, fontWeight: '900', color: theme.colors.text, marginBottom: 6 },
    activeAddr: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 14 },
    activeFareRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    activeFareLabel: { fontSize: 13, color: theme.colors.textSecondary },
    activeFareVal: { fontSize: 18, fontWeight: '900', color: theme.colors.primary },
    chatBtn: {
        backgroundColor: '#1a1a1a', borderRadius: 14,
        paddingVertical: 16, alignItems: 'center',
        borderWidth: 1, borderColor: '#333',
        marginRight: 10,
    },
    chatIcon: { color: theme.colors.text, fontWeight: '700', fontSize: 15 },
    rideActionBtn: {
        backgroundColor: theme.colors.primary, borderRadius: 14,
        paddingVertical: 16, alignItems: 'center',
    },
    endBtn: { backgroundColor: '#e74c3c' },
    rideActionText: { color: theme.colors.black, fontWeight: '700', fontSize: 15 },
    completedText: { fontSize: 20, fontWeight: '900', color: '#27ae60', textAlign: 'center', marginBottom: 6 },
    completedSub:  { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center' },

    // Waiting
    waitingSheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: theme.colors.card, borderTopLeftRadius: 24,
        borderTopRightRadius: 24, padding: 24, paddingBottom: 40,
    },
    waitingTitle: { fontSize: 16, fontWeight: '900', color: theme.colors.text, textAlign: 'center', marginBottom: 6 },
    waitingSub:   { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center' },
});

export default DriverDashboard;
