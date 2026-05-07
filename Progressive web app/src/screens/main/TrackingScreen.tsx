import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image, Animated, Platform, Modal, Alert } from 'react-native';
import SaforaMap from '../../components/SaforaMap';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme as theme } from '../../utils/theme';
import socketService from '../../services/socket.service';
import apiService from '../../services/api';
import { SAFETY_ENDPOINTS } from '../../utils/constants';

const { width, height } = Dimensions.get('window');

interface Coordinates { latitude: number; longitude: number; }

const TrackingScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { theme: liveTheme } = useAppTheme();
    const { rideId, estimatedPrice, pickup, dropoff, pickupCoords, dropoffCoords } = route.params || {};

    const [status, setStatus]               = useState('ARRIVING');
    const [socketStatus, setSocketStatus]   = useState<'connecting' | 'live' | 'offline'>('connecting');
    const [driverData, setDriverData] = useState<any>(null);
    const [price, setPrice] = useState<number | null>(estimatedPrice);
    const [driverLocation, setDriverLocation] = useState<Coordinates | null>(null);
    const [pCoords, setPCoords] = useState<Coordinates | null>(pickupCoords || null);
    const [dCoords, setDCoords] = useState<Coordinates | null>(dropoffCoords || null);
    const pulseAnim = useRef(new Animated.Value(0)).current;

    // SafetySentinel deviation alert state
    const [deviationAlert, setDeviationAlert] = useState<{ description: string; distance?: number } | null>(null);
    const [countdown, setCountdown]           = useState(30);
    const countdownRef                        = useRef<ReturnType<typeof setInterval> | null>(null);
    const [hasNewMessage, setHasNewMessage]   = useState(false);

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    useEffect(() => {
        const fetchRide = async () => {
            if (!rideId || rideId === 'demo') return;
            try {
                const res: any = await apiService.get(`/rides/${rideId}`);
                if (res.success && res.ride) {
                    setDriverData(res.ride.driver?.user || null);
                    setPrice(res.ride.estimatedPrice);
                    
                    if (res.ride.driver?.currentLocation?.coordinates) {
                        setDriverLocation({
                            longitude: res.ride.driver.currentLocation.coordinates[0],
                            latitude: res.ride.driver.currentLocation.coordinates[1]
                        });
                    }
                    
                    if (!pCoords && res.ride.pickupLocation?.coordinates) {
                        setPCoords({ 
                            latitude: res.ride.pickupLocation.coordinates[1], 
                            longitude: res.ride.pickupLocation.coordinates[0] 
                        });
                    }
                    if (!dCoords && res.ride.dropoffLocation?.coordinates) {
                        setDCoords({ 
                            latitude: res.ride.dropoffLocation.coordinates[1], 
                            longitude: res.ride.dropoffLocation.coordinates[0] 
                        });
                    }
                }
            } catch (err) {
                console.error('[Tracking] Fetch ride failed:', err);
            }
        };
        fetchRide();
    }, [rideId]);

    // Socket.io: connect and join ride room for real-time updates
    useEffect(() => {
        let mounted = true;

        const initSocket = async () => {
            try {
                await socketService.connect();
                if (rideId && rideId !== 'demo') {
                    socketService.joinRide(rideId);
                }
                if (mounted) setSocketStatus('live');

                socketService.onRideStatus(({ status: newStatus }) => {
                    if (!mounted) return;
                    const map: Record<string, string> = {
                        accepted: 'ARRIVING',
                        arrived: 'ARRIVED',
                        started: 'ONBOARD',
                        completed: 'DROPPED',
                    };
                    if (map[newStatus]) setStatus(map[newStatus]);

                    // Auto-navigate to Feedback when ride completes
                    if (newStatus === 'completed' && mounted) {
                        setTimeout(() => navigation.replace('Feedback', { rideId }), 1500);
                    }
                });

                // Listen for driver's live GPS location
                socketService.onDriverLocation(({ lat, lng }) => {
                    if (!mounted) return;
                    setDriverLocation({ latitude: lat, longitude: lng });
                });

                // SafetySentinel — listen for route deviation alert
                socketService.onDeviationAlert((alert) => {
                    if (!mounted) return;
                    setDeviationAlert(alert);
                    setCountdown(30);
                    // Start 30-second countdown → auto-SOS if no response
                    if (countdownRef.current) clearInterval(countdownRef.current);
                    countdownRef.current = setInterval(() => {
                        setCountdown(c => {
                            if (c <= 1) {
                                clearInterval(countdownRef.current!);
                                // Auto-trigger SOS
                                handleAutoSOS(alert.rideId);
                                return 0;
                            }
                            return c - 1;
                        });
                    }, 1000);
                });

                // Chat notifications
                socketService.onChatMessage((msg) => {
                    if (!mounted) return;
                    // Only show badge if it's from the OTHER person
                    if (msg.sender !== 'passenger') {
                        setHasNewMessage(true);
                    }
                });

            } catch {
                if (mounted) setSocketStatus('offline');
            }
        };

        initSocket();

        return () => {
            mounted = false;
            if (countdownRef.current) clearInterval(countdownRef.current);
            socketService.offAll();
        };
    }, [rideId]);

    // Dismiss deviation alert (passenger is safe)
    const dismissAlert = () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
        setDeviationAlert(null);
    };

    const handleCancelRide = async () => {
        try {
            // Robust ID check: use param or state
            const targetId = rideId || ride?.id || ride?._id;
            if (targetId && targetId !== 'demo') {
                await apiService.post(`/rides/${targetId}/cancel`, { cancelledBy: 'passenger' });
            }
            // Always navigate home to "un-stuck" the user
            navigation.navigate('Home');
        } catch (err) {
            console.error('[Cancel] Error:', err);
            // Even on error, force go home to let user retry
            navigation.navigate('Home');
        }
    };

    // Manual SOS press
    const handleSOS = async () => {
        dismissAlert();
        try {
            await apiService.post(SAFETY_ENDPOINTS.SOS, {
                location: driverLocation
                    ? { lat: driverLocation.latitude, lng: driverLocation.longitude }
                    : undefined,
                message: 'Manual SOS triggered from tracking screen',
            });
            if (rideId) socketService.emitSOS(rideId);
            Alert.alert('SOS Sent', 'Your emergency alert has been sent to the SAFORA safety team and your emergency contacts.');
        } catch {
            Alert.alert('SOS Failed', 'Could not send SOS. Please call emergency services directly.');
        }
    };

    // Auto-SOS after 30s of no response
    const handleAutoSOS = async (activeRideId: string) => {
        setDeviationAlert(null);
        try {
            await apiService.post(SAFETY_ENDPOINTS.SOS, {
                message: 'Auto-SOS: Passenger did not respond to deviation alert within 30 seconds.',
            });
            if (activeRideId) socketService.emitSOS(activeRideId);
        } catch { /* silent fail */ }
    };


    const initialRegion = {
        latitude: 32.4945,
        longitude: 74.5229,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    };

    return (
        <View style={styles.container}>
            <SaforaMap 
                type="tracking" 
                driverLocation={driverLocation ?? undefined}
                pickupLocation={pCoords ?? undefined}
                dropoffLocation={dCoords ?? undefined}
            />

            {/* SafetySentinel Deviation Alert Modal */}
            <Modal visible={!!deviationAlert} transparent animationType="slide">
                <View style={styles.alertOverlay}>
                    <View style={styles.alertCard}>
                        <Text style={styles.alertEmoji}>⚠️</Text>
                        <Text style={styles.alertTitle}>Route Deviation Detected</Text>
                        <Text style={styles.alertDesc}>
                            {deviationAlert?.description || 'Your driver has deviated from the planned route.'}
                        </Text>
                        <View style={styles.countdownCircle}>
                            <Text style={styles.countdownNum}>{countdown}</Text>
                            <Text style={styles.countdownLabel}>Auto-SOS in</Text>
                        </View>
                        <TouchableOpacity style={styles.safeBtn} onPress={dismissAlert}>
                            <Text style={styles.safeBtnText}>✅  I Am Safe</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.sosModalBtn} onPress={handleSOS}>
                            <Text style={styles.sosModalBtnText}>🆘  Send SOS Now</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <View style={styles.overlay} pointerEvents="box-none">
                <View style={styles.topHeader}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Text style={styles.backText}>←</Text>
                    </TouchableOpacity>
                    <View style={styles.statusBadge}>
                        <Animated.View style={[styles.statusPulse, { opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }] }]} />
                        <Text style={styles.statusText}>{status}</Text>
                        {socketStatus === 'live' && <View style={styles.liveDot} />}
                    </View>
                    <TouchableOpacity style={styles.sosBtn} onPress={handleSOS}>
                        <Text style={styles.sosText}>SOS</Text>
                    </TouchableOpacity>
                </View>

                {/* Driver Info Card */}
                <View style={styles.driverCard}>
                    <View style={styles.driverHeader}>
                        <View style={styles.driverDetails}>
                            <Image 
                                source={{ uri: driverData?.profilePicture || 'https://via.placeholder.com/60' }} 
                                style={styles.driverImg} 
                            />
                            <View>
                                <View style={styles.nameRow}>
                                    <Text style={styles.driverName}>{driverData?.name || 'Driver'}</Text>
                                    <View style={styles.ratingBadge}>
                                        <Text style={styles.ratingText}>⭐ 4.9</Text>
                                    </View>
                                </View>
                                <Text style={styles.carInfo}>White Toyota Corolla • LEC-405</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.chatBtn}
                            onPress={() => {
                                setHasNewMessage(false);
                                navigation.navigate('Chat', {
                                    rideId,
                                    senderRole: 'passenger',
                                    driverName: driverData?.name || 'Driver',
                                    passengerName: 'Me',
                                    rideType: route.params?.type || 'Standard',
                                });
                            }}
                        >
                            <Text style={styles.chatIcon}>💬</Text>
                            {hasNewMessage && <View style={styles.chatBadge} />}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.tripMeta}>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>ETA</Text>
                            <Text style={styles.metaValue}>
                                {status === 'ONBOARD' ? 'IN TRIP' : (status === 'ARRIVED' ? 'READY' : '3 MIN')}
                            </Text>
                        </View>
                        <View style={styles.vDivider} />
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>FEE</Text>
                            <Text style={styles.metaValue}>RS {price || '—'}</Text>
                        </View>
                        <View style={styles.vDivider} />
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>SECURITY</Text>
                            <Text style={[styles.metaValue, { color: theme.colors.success }]}>ACTIVE</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.shareBtn}>
                        <Text style={styles.shareText}>Share Live Location with Family</Text>
                    </TouchableOpacity>

                    {status !== 'ONBOARD' && (
                        <TouchableOpacity 
                            style={[styles.cancelBtn, { marginTop: 16, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: theme.colors.danger }]}
                            onPress={() => {
                                const confirmed = Platform.OS === 'web' 
                                    ? window.confirm("Are you sure you want to cancel this ride?")
                                    : true; 
                                
                                if (confirmed) {
                                    handleCancelRide();
                                }
                            }}
                        >
                            <Text style={[styles.cancelText, { color: theme.colors.danger, fontSize: 16 }]}>Cancel Ride</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
};

const darkMapStyle = [
    { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
    { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
    { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
];

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    // ── Deviation Alert Modal ──────────────────────────────────
    alertOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.75)',
    },
    alertCard: {
        backgroundColor: theme.colors.card,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 28,
        paddingBottom: 44,
        alignItems: 'center',
        borderTopWidth: 3,
        borderTopColor: '#e74c3c',
    },
    alertEmoji: { fontSize: 48, marginBottom: 12 },
    alertTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#e74c3c',
        marginBottom: 10,
        textAlign: 'center',
    },
    alertDesc: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    countdownCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#e74c3c',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    countdownNum: { fontSize: 28, fontWeight: '900', color: '#fff' },
    countdownLabel: { fontSize: 9, color: 'rgba(255,255,255,0.8)', fontWeight: '700' },
    safeBtn: {
        width: '100%',
        backgroundColor: '#27ae60',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 10,
    },
    safeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    sosModalBtn: {
        width: '100%',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: '#e74c3c',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    sosModalBtnText: { color: '#e74c3c', fontSize: 15, fontWeight: '700' },
    // ── End Modal ─────────────────────────────────────────────
    map: {
        width: width,
        height: height,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'space-between',
        padding: 20,
        paddingTop: 50,
        paddingBottom: 40,
    },
    topHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: theme.colors.card,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backText: {
        color: theme.colors.text,
        fontSize: 20,
    },
    statusBadge: {
        backgroundColor: theme.colors.card,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    statusPulse: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.primary,
        marginRight: 8,
    },
    statusText: {
        color: theme.colors.text,
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 2,
    },
    sosBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: theme.colors.danger,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sosText: {
        color: theme.colors.white,
        fontSize: 10,
        fontWeight: '900',
    },
    driverMarker: {
        width: 36,
        height: 36,
        backgroundColor: theme.colors.primary,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: theme.colors.white,
    },
    carEmoji: {
        fontSize: 18,
    },
    destMarker: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: theme.colors.primary,
        borderWidth: 3,
        borderColor: theme.colors.white,
    },
    destDot: {
        flex: 1,
    },
    driverCard: {
        backgroundColor: theme.colors.card,
        borderRadius: 30,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 15,
    },
    driverHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    driverDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    driverImg: {
        width: 54,
        height: 54,
        borderRadius: 16,
        backgroundColor: '#333',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    driverName: {
        fontSize: 17,
        fontWeight: '900',
        color: theme.colors.text,
    },
    ratingBadge: {
        backgroundColor: 'rgba(245,197,24,0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    ratingText: {
        fontSize: 10,
        color: theme.colors.primary,
        fontWeight: '700',
    },
    carInfo: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    chatBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: theme.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#222',
    },
    chatIcon: {
        fontSize: 18,
    },
    chatBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ef4444',
        borderWidth: 1.5,
        borderColor: theme.colors.card,
    },
    divider: {
        height: 1,
        backgroundColor: '#222',
        marginBottom: 20,
    },
    tripMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    metaItem: {
        flex: 1,
        alignItems: 'center',
    },
    metaLabel: {
        fontSize: 9,
        color: theme.colors.textSecondary,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 4,
    },
    metaValue: {
        fontSize: 16,
        fontWeight: '900',
        color: theme.colors.text,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.success,
        marginLeft: 6,
    },
    vDivider: {
        width: 1,
        height: '80%',
        backgroundColor: '#333',
        alignSelf: 'center',
    },
    shareBtn: {
        backgroundColor: 'rgba(245,197,24,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(245,197,24,0.2)',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
    },
    shareText: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: '700',
    },
});

export default TrackingScreen;
