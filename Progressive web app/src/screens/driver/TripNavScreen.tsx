import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Platform, Modal, Pressable, Animated,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../utils/theme';
import SaforaMap from '../../components/SaforaMap';
import apiService from '../../services/api';
import socketService from '../../services/socket.service';

// Phase order: en_route → arrived → onboard → dropping → done
type TripPhase = 'en_route' | 'arrived' | 'onboard' | 'dropping' | 'done';

const PHASES: TripPhase[] = ['en_route', 'arrived', 'onboard', 'dropping'];

const PHASE_LABELS: Record<TripPhase, string> = {
    en_route: 'EN ROUTE',
    arrived:  'ARRIVED',
    onboard:  'ONBOARD',
    dropping: 'DROPPING',
    done:     'DONE',
};

const PHASE_TURN: Record<TripPhase, string> = {
    en_route: 'Head to pickup location',
    arrived:  'You have arrived — wait for passenger',
    onboard:  'Head to dropoff location',
    dropping: 'Almost there — approaching dropoff',
    done:     'Ride complete',
};

const PHASE_ICON: Record<TripPhase, string> = {
    en_route: '🚗',
    arrived:  '📍',
    onboard:  '🧭',
    dropping: '🏁',
    done:     '✅',
};

const showAlert = (title: string, msg: string) => {
    if (Platform.OS === 'web') {
        window.alert(`${title}\n${msg}`);
    } else {
        const { Alert } = require('react-native');
        Alert.alert(title, msg);
    }
};

const TripNavScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route      = useRoute<any>();
    const { theme }  = useAppTheme();
    const s          = useMemo(() => makeStyles(theme), [theme]);

    // Request data loaded from AsyncStorage (avoids [object Object] URL serialisation)
    const [request, setRequest] = useState<{
        rideId: string;
        passenger: { name: string; rating?: number };
        pickup:  { address: string; lat?: number; lng?: number };
        dropoff: { address: string; lat?: number; lng?: number };
        estimatedPrice: number;
        estimatedDuration: number;
        distance: number;
        type: string;
    } | null>(null);

    const [phase, setPhase]               = useState<TripPhase>('en_route');
    const [loading, setLoading]           = useState(false);
    const [sosOpen, setSosOpen]           = useState(false);
    const [completeOpen, setCompleteOpen] = useState(false);
    const [hasNewMessage, setHasNewMessage] = useState(false);
    const [driverCoords, setDriverCoords] = useState<{ latitude: number; longitude: number } | null>(null);

    // Live stats — derive fare directly from request so it updates after async load
    const [distanceLeft, setDistanceLeft] = useState<number>(0);
    const [etaMinutes, setEtaMinutes]     = useState<number>(0);
    const fare = request?.estimatedPrice || 0;


    const [turnDistance, setTurnDistance] = useState('');

    const watchId  = useRef<any>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Pulse animation for the active phase dot
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.4, duration: 700, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1.0, duration: 700, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    // Load request from AsyncStorage on mount — also try fetching fresh data from backend
    useEffect(() => {
        const loadRequest = async () => {
            // First try AsyncStorage for instant render
            const raw = await AsyncStorage.getItem('trip_nav_request');
            if (raw) {
                const parsed = JSON.parse(raw);
                setRequest(parsed);
                setDistanceLeft(parseFloat((parsed.distance || 0).toFixed(1)));
                setEtaMinutes(Math.round(parsed.estimatedDuration || 0));
            }
            // Then fetch fresh data from backend to get accurate fare/distance
            const rideId = route.params?.rideId;
            if (rideId) {
                try {
                    const res: any = await apiService.get(`/rides/${rideId}`);
                    if (res.success && res.ride) {
                        const ride = res.ride;
                        const freshRequest = {
                            rideId: ride._id,
                            passenger: ride.passenger || { name: 'Passenger' },
                            pickup: {
                                address: ride.pickupLocation?.address || '',
                                lat: ride.pickupLocation?.coordinates?.[1],
                                lng: ride.pickupLocation?.coordinates?.[0],
                            },
                            dropoff: {
                                address: ride.dropoffLocation?.address || '',
                                lat: ride.dropoffLocation?.coordinates?.[1],
                                lng: ride.dropoffLocation?.coordinates?.[0],
                            },
                            estimatedPrice: ride.estimatedPrice || 0,
                            estimatedDuration: ride.estimatedDuration || 0,
                            distance: ride.distance || 0,
                            type: ride.type || 'standard',
                        };
                        setRequest(freshRequest);
                        setDistanceLeft(parseFloat((freshRequest.distance).toFixed(1)));
                        setEtaMinutes(Math.round(freshRequest.estimatedDuration));
                        await AsyncStorage.setItem('trip_nav_request', JSON.stringify(freshRequest));
                    }
                } catch { /* use cached data */ }
            }
        };
        loadRequest();
    }, []);

    // GPS broadcasting
    useEffect(() => {
        startGPS();
        socketService.onChatMessage((msg) => {
            if (msg.sender !== 'driver') setHasNewMessage(true);
        });
        return () => {
            stopGPS();
            socketService.offChat();
        };
    }, []);

    const startGPS = () => {
        if (Platform.OS !== 'web' || !(navigator as any).geolocation) return;
        const rideId = route.params?.rideId; // Use route params to avoid stale closure on `request`
        if (watchId.current !== null) {
            (navigator as any).geolocation.clearWatch(watchId.current);
        }
        watchId.current = (navigator as any).geolocation.watchPosition(
            (pos: any) => {
                const { latitude, longitude } = pos.coords;
                setDriverCoords({ latitude, longitude });
                if (rideId) {
                    socketService.emitLocationUpdate(rideId, latitude, longitude);
                }
            },
            () => {},
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
    };

    const stopGPS = () => {
        if (watchId.current !== null && Platform.OS === 'web') {
            (navigator as any).geolocation.clearWatch(watchId.current);
            watchId.current = null;
        }
    };

    // When SaforaMap returns route info, update live stats
    const handleRouteInfo = (info: { distance: number; duration: number }) => {
        setDistanceLeft(parseFloat(info.distance.toFixed(1)));
        setEtaMinutes(Math.round(info.duration));
    };

    // ── Phase actions ──────────────────────────────────────────────────────────

    // EN ROUTE → tap "I have Arrived" → update local state + notify passenger via Socket.io
    const handleArrivedAtPickup = () => {
        setPhase('arrived');
        if (request?.rideId) {
            socketService.emitDriverArrived(request.rideId);
        }
    };

    // ARRIVED → tap "Passenger Boarded" → start ride on backend → ONBOARD
    const handlePassengerBoarded = async () => {
        if (!request) return;
        setLoading(true);
        try {
            await apiService.patch(`/rides/${request.rideId}/status`, { status: 'started' });
            setPhase('onboard');
        } catch (e: any) {
            showAlert('Error', e.message || 'Could not start ride.');
        } finally {
            setLoading(false);
        }
    };

    // ONBOARD → tap "Approaching Dropoff" → local state only → DROPPING
    const handleApproachingDropoff = () => {
        setPhase('dropping');
    };

    // DROPPING → tap "Complete Ride" → show styled confirmation modal
    const handleComplete = () => {
        if (!request) return;
        setCompleteOpen(true);
    };

    // Confirmed complete ride
    const confirmComplete = async () => {
        if (!request) return;
        setCompleteOpen(false);
        setPhase('done');
        setLoading(true);
        try {
            await apiService.patch(`/rides/${request.rideId}/status`, { status: 'completed' });
            stopGPS();
            await AsyncStorage.removeItem('trip_nav_request');
            setTimeout(() => {
                navigation.replace('RatePassenger', {
                    rideId: request.rideId,
                    passengerName: request.passenger?.name || 'Passenger',
                    fare: request.estimatedPrice,
                    distance: distanceLeft,
                });
            }, 1200);
        } catch (e: any) {
            showAlert('Error', e.message || 'Could not complete ride.');
            setPhase('dropping');
        } finally {
            setLoading(false);
        }
    };

    const handleSOS = () => {
        setSosOpen(false);
        if (request?.rideId) socketService.emitSOS(request.rideId);
        showAlert('🆘 SOS Triggered', 'SAFORA safety team and your emergency contacts have been alerted.');
    };

    const handleCancel = () => {
        const confirmed = Platform.OS === 'web'
            ? window.confirm('Cancel this ride? This may affect your rating.')
            : true;
        if (!confirmed) return;
        if (request?.rideId) {
            apiService.post(`/rides/${request.rideId}/cancel`, { cancelledBy: 'driver' }).catch(() => {});
        }
        stopGPS();
        navigation.goBack();
    };

    // Show loading until request is loaded from AsyncStorage
    if (!request) {
        return (
            <View style={s.loadingScreen}>
                <ActivityIndicator size="large" color="#F5C518" />
                <Text style={s.loadingText}>Loading ride…</Text>
            </View>
        );
    }

    const phaseIndex = PHASES.indexOf(phase);

    const pickupCoords  = request?.pickup?.lat  ? { latitude: request.pickup.lat,  longitude: request.pickup.lng!  } : undefined;
    const dropoffCoords = request?.dropoff?.lat ? { latitude: request.dropoff.lat, longitude: request.dropoff.lng! } : undefined;

    // Show pickup address while heading to passenger, dropoff after they board
    const currentDest = (phase === 'en_route' || phase === 'arrived')
        ? request?.pickup?.address
        : request?.dropoff?.address;

    const turnInstruction = PHASE_TURN[phase];
    const turnIcon        = PHASE_ICON[phase];

    return (
        <View style={s.container}>

            {/* Full-screen map */}
            <View style={s.mapWrap}>
                <SaforaMap
                    type="tracking"
                    pickupLocation={pickupCoords}
                    dropoffLocation={dropoffCoords}
                    driverLocation={driverCoords ?? undefined}
                    onRouteInfo={handleRouteInfo}
                />
            </View>

            {/* Turn instruction banner */}
            <View style={s.turnBanner}>
                <View style={s.turnIconBox}>
                    <Text style={s.turnIcon}>{turnIcon}</Text>
                </View>
                <View style={s.turnTexts}>
                    <Text style={s.turnMain} numberOfLines={1}>{turnInstruction}</Text>
                    {turnDistance
                        ? <Text style={s.turnSub}>{turnDistance} · {distanceLeft} km remaining</Text>
                        : <Text style={s.turnSub}>{distanceLeft} km remaining</Text>}
                </View>
            </View>

            {/* Right floating buttons */}
            <View style={s.floatRight}>
                <TouchableOpacity
                    style={s.floatBtn}
                    onPress={() => {
                        setHasNewMessage(false);
                        navigation.navigate('Chat', {
                            rideId: request.rideId,
                            senderRole: 'driver',
                            driverName: 'You',
                            passengerName: request.passenger?.name || 'Passenger',
                        });
                    }}
                >
                    <Text style={s.floatIcon}>💬</Text>
                    {hasNewMessage && <View style={s.floatBadge} />}
                </TouchableOpacity>
                <TouchableOpacity style={[s.floatBtn, s.floatSOS]} onPress={() => setSosOpen(true)}>
                    <Text style={s.floatSOSText}>SOS</Text>
                </TouchableOpacity>
            </View>

            {/* Bottom card */}
            <View style={s.card}>

                {/* 4-tab progress bar */}
                <View style={s.tabRow}>
                    {PHASES.map((p, i) => {
                        const isActive   = i === phaseIndex;
                        const isDone     = i < phaseIndex;
                        const isFuture   = i > phaseIndex;
                        return (
                            <View key={p} style={s.tabItem}>
                                <View style={[
                                    s.tabDot,
                                    isDone   && s.tabDotDone,
                                    isActive && s.tabDotActive,
                                    isFuture && s.tabDotFuture,
                                ]}>
                                    {isDone && <Text style={s.tabDotCheck}>✓</Text>}
                                    {isActive && (
                                        <Animated.View style={[s.tabDotPulse, { transform: [{ scale: pulseAnim }] }]} />
                                    )}
                                </View>
                                <Text style={[
                                    s.tabLabel,
                                    isActive && s.tabLabelActive,
                                    isDone   && s.tabLabelDone,
                                    isFuture && s.tabLabelFuture,
                                ]}>
                                    {PHASE_LABELS[p]}
                                </Text>
                                {i < PHASES.length - 1 && (
                                    <View style={[s.tabLine, isDone && s.tabLineDone]} />
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* Stats row */}
                <View style={s.statsRow}>
                    <View style={s.statItem}>
                        <Text style={s.statVal}>{etaMinutes > 0 ? `${etaMinutes}:00` : '—'}</Text>
                        <Text style={s.statLabel}>ETA</Text>
                    </View>
                    <View style={s.statDivider} />
                    <View style={s.statItem}>
                        <Text style={s.statVal}>{distanceLeft}</Text>
                        <Text style={s.statLabel}>KM LEFT</Text>
                    </View>
                    <View style={s.statDivider} />
                    <View style={s.statItem}>
                        <Text style={[s.statVal, { color: theme.colors.primary }]}>RS{fare}</Text>
                        <Text style={s.statLabel}>FARE</Text>
                    </View>
                </View>

                {/* Destination strip */}
                <View style={s.destStrip}>
                    <Text style={s.destIcon}>
                        {(phase === 'en_route' || phase === 'arrived') ? '🟢' : '🔴'}
                    </Text>
                    <Text style={s.destText} numberOfLines={1}>{currentDest || 'Loading…'}</Text>
                    {phase !== 'done' && (
                        <TouchableOpacity onPress={handleCancel} style={s.cancelBtn}>
                            <Text style={s.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Main action button — changes at each phase */}
                {phase === 'en_route' && (
                    <TouchableOpacity
                        style={[s.actionBtn, loading && s.actionBtnDisabled]}
                        onPress={handleArrivedAtPickup}
                        disabled={loading}
                    >
                        <Text style={s.actionBtnText}>📍  I have Arrived at Pickup</Text>
                    </TouchableOpacity>
                )}

                {phase === 'arrived' && (
                    <TouchableOpacity
                        style={[s.actionBtn, s.actionBtnArrived, loading && s.actionBtnDisabled]}
                        onPress={handlePassengerBoarded}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color="#000" />
                            : <Text style={s.actionBtnText}>✅  Passenger Boarded — Start Ride</Text>
                        }
                    </TouchableOpacity>
                )}

                {phase === 'onboard' && (
                    <TouchableOpacity
                        style={[s.actionBtn, s.actionBtnOnboard, loading && s.actionBtnDisabled]}
                        onPress={handleApproachingDropoff}
                        disabled={loading}
                    >
                        <Text style={[s.actionBtnText, { color: '#fff' }]}>🧭  Approaching Dropoff</Text>
                    </TouchableOpacity>
                )}

                {phase === 'dropping' && (
                    <TouchableOpacity
                        style={[s.actionBtn, s.actionBtnEnd, loading && s.actionBtnDisabled]}
                        onPress={handleComplete}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={[s.actionBtnText, { color: '#fff' }]}>🏁  Complete Ride</Text>
                        }
                    </TouchableOpacity>
                )}

                {phase === 'done' && (
                    <View style={s.doneRow}>
                        <ActivityIndicator color={theme.colors.primary} />
                        <Text style={s.doneText}>Completing ride…</Text>
                    </View>
                )}
            </View>

            {/* Complete Ride Confirmation Modal */}
            <Modal visible={completeOpen} transparent animationType="fade" onRequestClose={() => setCompleteOpen(false)}>
                <Pressable style={s.sosOverlay} onPress={() => setCompleteOpen(false)}>
                    <Pressable style={s.completeModal} onPress={e => e.stopPropagation()}>
                        <Text style={s.completeEmoji}>🏁</Text>
                        <Text style={s.completeTitle}>Complete Ride?</Text>
                        <Text style={s.completeSub}>
                            Drop off {request?.passenger?.name || 'passenger'} and end the trip.
                        </Text>
                        <View style={s.completeStats}>
                            <View style={s.completeStat}>
                                <Text style={s.completeStatVal}>RS {request?.estimatedPrice || 0}</Text>
                                <Text style={s.completeStatLabel}>FARE EARNED</Text>
                            </View>
                            <View style={s.completeStatDivider} />
                            <View style={s.completeStat}>
                                <Text style={s.completeStatVal}>{distanceLeft} km</Text>
                                <Text style={s.completeStatLabel}>DISTANCE</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={s.completeConfirmBtn} onPress={confirmComplete}>
                            <Text style={s.completeConfirmText}>✓  Yes, Complete Ride</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.completeCancelBtn} onPress={() => setCompleteOpen(false)}>
                            <Text style={s.completeCancelText}>Not yet</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* SOS Modal */}
            <Modal visible={sosOpen} transparent animationType="fade" onRequestClose={() => setSosOpen(false)}>
                <Pressable style={s.sosOverlay} onPress={() => setSosOpen(false)}>
                    <Pressable style={s.sosModal} onPress={e => e.stopPropagation()}>
                        <Text style={s.sosTitle}>🆘 Send SOS?</Text>
                        <Text style={s.sosSub}>
                            This will alert the SAFORA safety team and share your current location.
                            Only use in a real emergency.
                        </Text>
                        <TouchableOpacity style={s.sosConfirmBtn} onPress={handleSOS}>
                            <Text style={s.sosConfirmText}>Yes, Send SOS Alert</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.sosCancelBtn} onPress={() => setSosOpen(false)}>
                            <Text style={s.sosCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
};

const makeStyles = (t: AppTheme) => StyleSheet.create({
    container:     { flex: 1, backgroundColor: t.colors.background },
    mapWrap:       { flex: 1 },
    loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.background, gap: 16 },
    loadingText:   { color: t.colors.textSecondary, fontSize: 14, fontWeight: '600' },

    // Turn banner
    turnBanner: {
        position: 'absolute', top: Platform.OS === 'ios' ? 54 : 40,
        left: 16, right: 72,
        backgroundColor: t.colors.card,
        borderRadius: 18, padding: 14,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18, shadowRadius: 10, elevation: 10,
    },
    turnIconBox: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: t.colors.primary,
        alignItems: 'center', justifyContent: 'center',
    },
    turnIcon:  { fontSize: 22 },
    turnTexts: { flex: 1 },
    turnMain:  { fontSize: 14, fontWeight: '800', color: t.colors.text, marginBottom: 2 },
    turnSub:   { fontSize: 11, color: t.colors.textSecondary, fontWeight: '500' },

    // Floating buttons
    floatRight: { position: 'absolute', right: 16, top: 50, gap: 10 },
    floatBtn: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: t.colors.card, alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15, shadowRadius: 6, elevation: 5,
    },
    floatIcon:    { fontSize: 20 },
    floatBadge: {
        position: 'absolute', top: 8, right: 8,
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: '#ef4444', borderWidth: 1.5, borderColor: t.colors.card,
    },
    floatSOS:     { backgroundColor: '#EF4444' },
    floatSOSText: { fontSize: 11, fontWeight: '900', color: '#fff' },

    // Bottom card
    card: {
        backgroundColor: t.colors.card,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingTop: 20, paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.12, shadowRadius: 14, elevation: 14,
    },

    // 4-tab progress bar
    tabRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 18,
    },
    tabItem: {
        flex: 1, alignItems: 'center', position: 'relative',
    },
    tabDot: {
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: t.dark ? '#333' : '#E0E0E0',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 5,
    },
    tabDotActive: {
        backgroundColor: t.colors.primary,
        shadowColor: t.colors.primary, shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6, shadowRadius: 6, elevation: 6,
    },
    tabDotDone:   { backgroundColor: '#22C55E' },
    tabDotFuture: { backgroundColor: t.dark ? '#2A2A2A' : '#EFEFEF' },
    tabDotCheck:  { fontSize: 11, color: '#fff', fontWeight: '900' },
    tabDotPulse: {
        position: 'absolute', width: 22, height: 22, borderRadius: 11,
        backgroundColor: t.colors.primary, opacity: 0.35,
    },
    tabLabel:       { fontSize: 9, fontWeight: '700', color: t.colors.textSecondary, letterSpacing: 0.5 },
    tabLabelActive: { color: t.colors.primary, fontWeight: '900' },
    tabLabelDone:   { color: '#22C55E' },
    tabLabelFuture: { color: t.dark ? '#444' : '#CCC' },
    tabLine: {
        position: 'absolute', top: 10, right: '-50%',
        width: '100%', height: 2,
        backgroundColor: t.dark ? '#333' : '#E0E0E0',
        zIndex: -1,
    },
    tabLineDone: { backgroundColor: '#22C55E' },

    // Stats row
    statsRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: t.dark ? '#1A1A1A' : '#F5F5F5',
        borderRadius: 16, padding: 14, marginBottom: 14,
    },
    statItem:   { flex: 1, alignItems: 'center' },
    statVal:    { fontSize: 20, fontWeight: '900', color: t.colors.text, marginBottom: 2 },
    statLabel:  { fontSize: 9, fontWeight: '800', color: t.colors.textSecondary, letterSpacing: 1 },
    statDivider:{ width: 1, height: 36, backgroundColor: t.dark ? '#333' : '#DDD' },

    // Destination strip
    destStrip: {
        flexDirection: 'row', alignItems: 'center',
        gap: 10, marginBottom: 14,
    },
    destIcon: { fontSize: 14 },
    destText: { flex: 1, fontSize: 12, color: t.colors.textSecondary, fontWeight: '500' },
    cancelBtn: { paddingHorizontal: 8, paddingVertical: 4 },
    cancelText: { fontSize: 12, color: t.colors.danger, fontWeight: '700' },

    // Action buttons
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: t.colors.primary, borderRadius: 16,
        paddingVertical: 16, gap: 10,
    },
    actionBtnArrived: { backgroundColor: '#F59E0B' },
    actionBtnOnboard: { backgroundColor: '#3B82F6' },
    actionBtnEnd:     { backgroundColor: '#22C55E' },
    actionBtnDisabled:{ opacity: 0.6 },
    actionBtnText:    { fontSize: 15, fontWeight: '900', color: t.colors.black },

    // Done state
    doneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 16 },
    doneText:{ fontSize: 15, color: t.colors.textSecondary, fontWeight: '600' },

    // SOS Modal
    // Complete Ride Modal
    completeModal:      { backgroundColor: t.colors.card, borderRadius: 28, padding: 28, alignItems: 'center', borderWidth: 2, borderColor: '#22C55E' },
    completeEmoji:      { fontSize: 48, marginBottom: 12 },
    completeTitle:      { fontSize: 22, fontWeight: '900', color: t.colors.text, marginBottom: 8 },
    completeSub:        { fontSize: 14, color: t.colors.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
    completeStats:      { flexDirection: 'row', alignItems: 'center', backgroundColor: t.dark ? '#1A1A1A' : '#F5F5F5', borderRadius: 16, padding: 16, width: '100%', marginBottom: 24 },
    completeStat:       { flex: 1, alignItems: 'center' },
    completeStatVal:    { fontSize: 20, fontWeight: '900', color: t.colors.primary, marginBottom: 2 },
    completeStatLabel:  { fontSize: 9, fontWeight: '800', color: t.colors.textSecondary, letterSpacing: 1 },
    completeStatDivider:{ width: 1, height: 36, backgroundColor: t.dark ? '#333' : '#DDD' },
    completeConfirmBtn: { width: '100%', backgroundColor: '#22C55E', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
    completeConfirmText:{ color: '#fff', fontWeight: '900', fontSize: 16 },
    completeCancelBtn:  { paddingVertical: 10 },
    completeCancelText: { color: t.colors.textSecondary, fontSize: 14 },

    sosOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 24 },
    sosModal:      { backgroundColor: t.colors.card, borderRadius: 24, padding: 28, alignItems: 'center', borderWidth: 2, borderColor: '#EF4444' },
    sosTitle:      { fontSize: 22, fontWeight: '900', color: '#EF4444', marginBottom: 10 },
    sosSub:        { fontSize: 13, color: t.colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    sosConfirmBtn: { width: '100%', backgroundColor: '#EF4444', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
    sosConfirmText:{ color: '#fff', fontWeight: '900', fontSize: 15 },
    sosCancelBtn:  { paddingVertical: 10 },
    sosCancelText: { color: t.colors.textSecondary, fontSize: 14 },
});

export default TripNavScreen;
