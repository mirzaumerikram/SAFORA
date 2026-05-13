import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image, Animated, Platform, Modal, Alert } from 'react-native';
import SaforaMap from '../../components/SaforaMap';
import { useNavigation, useRoute, useNavigationState } from '@react-navigation/native';
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

    // Passenger-facing phase labels matching driver phases
    // Backend status → display status
    const STATUS_MAP: Record<string, string> = {
        accepted:  'EN ROUTE',
        arrived:   'ARRIVED',
        started:   'ONBOARD',
        completed: 'DROPPED',
    };
    const PASSENGER_PHASES = ['EN ROUTE', 'ARRIVED', 'ONBOARD', 'DROPPED'];

    const [status, setStatus]               = useState('EN ROUTE');
    const [socketStatus, setSocketStatus]   = useState<'connecting' | 'live' | 'offline'>('connecting');
    // Track whether a child screen (e.g. Chat) is open — don't navigate away if so
    const isChatOpenRef = useRef(false);
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
        let pollInterval: ReturnType<typeof setInterval> | null = null;

        // Phase priority — higher index = further along. Never go backwards.
        const PHASE_ORDER = ['EN ROUTE', 'ARRIVED', 'ONBOARD', 'DROPPING', 'DROPPED'];

        const handleStatusUpdate = (newStatus: string) => {
            if (!mounted) return;
            const map: Record<string, string> = {
                accepted:  'EN ROUTE',
                arrived:   'ARRIVED',
                started:   'ONBOARD',
                completed: 'DROPPED',
            };
            const mapped = map[newStatus];
            if (!mapped) return;
            // Only update if the new status is ahead of or equal to current status
            setStatus(prev => {
                const currentIdx = PHASE_ORDER.indexOf(prev);
                const newIdx     = PHASE_ORDER.indexOf(mapped);
                return newIdx >= currentIdx ? mapped : prev;
            });
            if (newStatus === 'completed' && mounted) {
                if (pollInterval) clearInterval(pollInterval);
                // Wait until chat is closed before navigating away
                const doNavigate = () => {
                    if (isChatOpenRef.current) {
                        // Retry in 1 second if chat is still open
                        setTimeout(doNavigate, 1000);
                        return;
                    }
                    navigation.replace('Feedback', { rideId });
                };
                setTimeout(doNavigate, 1500);
            }
        };

        const joinRoom = () => {
            if (rideId && rideId !== 'demo') {
                socketService.joinRide(rideId);
            }
        };

        const initSocket = async () => {
            try {
                await socketService.connect();
                joinRoom();
                if (mounted) setSocketStatus('live');

                socketService.onRideStatus(({ status: newStatus }) => handleStatusUpdate(newStatus));

                // Driver arrived at pickup — update passenger phase bar (never downgrade)
                socketService.onDriverArrived(() => {
                    if (!mounted) return;
                    setStatus(prev => {
                        const currentIdx = PHASE_ORDER.indexOf(prev);
                        const arrivedIdx = PHASE_ORDER.indexOf('ARRIVED');
                        return arrivedIdx >= currentIdx ? 'ARRIVED' : prev;
                    });
                });

                // Re-join ride room on reconnect so we never miss events
                (socketService as any).socket?.on('connect', () => {
                    console.log('[Tracking] Socket reconnected — re-joining ride room');
                    joinRoom();
                });

                socketService.onDriverLocation(({ lat, lng }) => {
                    if (!mounted) return;
                    setDriverLocation({ latitude: lat, longitude: lng });
                });

                socketService.onDeviationAlert((alert) => {
                    if (!mounted) return;
                    setDeviationAlert(alert);
                    setCountdown(30);
                    if (countdownRef.current) clearInterval(countdownRef.current);
                    countdownRef.current = setInterval(() => {
                        setCountdown(c => {
                            if (c <= 1) {
                                clearInterval(countdownRef.current!);
                                handleAutoSOS(alert.rideId);
                                return 0;
                            }
                            return c - 1;
                        });
                    }, 1000);
                });

                socketService.onChatMessage((msg) => {
                    if (!mounted) return;
                    if (msg.sender !== 'passenger') setHasNewMessage(true);
                });

            } catch {
                if (mounted) setSocketStatus('offline');
            }
        };

        initSocket();

        // Polling fallback: check ride status every 5s in case socket misses the event
        if (rideId && rideId !== 'demo') {
            pollInterval = setInterval(async () => {
                if (!mounted) return;
                try {
                    const res: any = await apiService.get(`/rides/${rideId}`);
                    if (res.success && res.ride) {
                        handleStatusUpdate(res.ride.status);
                    }
                } catch { /* silent */ }
            }, 5000);
        }

        return () => {
            mounted = false;
            if (countdownRef.current) clearInterval(countdownRef.current);
            if (pollInterval) clearInterval(pollInterval);
            socketService.offTracking(); // Only remove tracking listeners, not chat
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
                        <Text style={styles.statusText}>{status === 'DROPPED' ? 'COMPLETED' : status}</Text>
                        {socketStatus === 'live' && <View style={styles.liveDot} />}
                    </View>
                    <TouchableOpacity style={styles.sosBtn} onPress={handleSOS}>
                        <Text style={styles.sosText}>SOS</Text>
                    </TouchableOpacity>
                </View>

                {/* Driver Info Card */}
                <View style={styles.driverCard}>

                    {/* 4-phase progress bar — inside card, above driver info */}
                    <View style={styles.phaseBar}>
                        {PASSENGER_PHASES.map((p, i) => {
                            const currentIndex = PASSENGER_PHASES.indexOf(status);
                            const isActive = i === currentIndex;
                            const isDone   = i < currentIndex;
                            const isFuture = i > currentIndex;
                            return (
                                <View key={p} style={styles.phaseItem}>
                                    <View style={[
                                        styles.phaseDot,
                                        isDone   && styles.phaseDotDone,
                                        isActive && styles.phaseDotActive,
                                        isFuture && styles.phaseDotFuture,
                                    ]}>
                                        {isDone && <Text style={styles.phaseDotCheck}>✓</Text>}
                                    </View>
                                    <Text style={[
                                        styles.phaseLabel,
                                        isActive && styles.phaseLabelActive,
                                        isDone   && styles.phaseLabelDone,
                                        isFuture && styles.phaseLabelFuture,
                                    ]}>{p}</Text>
                                    {i < PASSENGER_PHASES.length - 1 && (
                                        <View style={[styles.phaseLine, isDone && styles.phaseLineDone]} />
                                    )}
                                </View>
                            );
                        })}
                    </View>

                    <View style={styles.cardDivider} />

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
                                isChatOpenRef.current = true;
                                navigation.navigate('Chat', {
                                    rideId,
                                    senderRole: 'passenger',
                                    driverName: driverData?.name || 'Driver',
                                    passengerName: 'Me',
                                    rideType: route.params?.type || 'Standard',
                                });
                                // Clear flag when user comes back from chat
                                const unsubscribe = navigation.addListener('focus', () => {
                                    isChatOpenRef.current = false;
                                    unsubscribe();
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
    // ── 4-phase progress bar (inside driver card) ────────────────────────────
    phaseBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 4,
        marginBottom: 0,
    },
    phaseItem: {
        flex: 1, alignItems: 'center', position: 'relative',
    },
    phaseDot: {
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: theme.dark ? '#333' : '#E0E0E0',
        alignItems: 'center', justifyContent: 'center', marginBottom: 4,
    },
    phaseDotActive: {
        backgroundColor: theme.colors.primary,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5, shadowRadius: 4, elevation: 4,
    },
    phaseDotDone:   { backgroundColor: '#22C55E' },
    phaseDotFuture: { backgroundColor: theme.dark ? '#2A2A2A' : '#EFEFEF' },
    phaseDotCheck:  { fontSize: 10, color: '#fff', fontWeight: '900' },
    phaseLabel:       { fontSize: 8, fontWeight: '700', color: theme.colors.textSecondary, letterSpacing: 0.5 },
    phaseLabelActive: { color: theme.colors.primary, fontWeight: '900' },
    phaseLabelDone:   { color: '#22C55E' },
    phaseLabelFuture: { color: theme.dark ? '#444' : '#CCC' },
    phaseLine: {
        position: 'absolute', top: 9, right: '-50%',
        width: '100%', height: 2,
        backgroundColor: theme.dark ? '#333' : '#E0E0E0',
        zIndex: -1,
    },
    phaseLineDone: { backgroundColor: '#22C55E' },
    cardDivider: {
        height: 1,
        backgroundColor: theme.dark ? '#222' : '#EEEEEE',
        marginBottom: 16,
    },
    // ─────────────────────────────────────────────────────────────────────────

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
