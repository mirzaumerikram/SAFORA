import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, Platform, StatusBar, Modal, Pressable,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../utils/theme';
import SaforaMap from '../../components/SaforaMap';
import apiService from '../../services/api';
import socketService from '../../services/socket.service';

type TripPhase = 'to_pickup' | 'to_dropoff' | 'completing';

const TripNavScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route      = useRoute<any>();
    const { theme }  = useAppTheme();
    const s          = useMemo(() => makeStyles(theme), [theme]);

    const request = route.params?.request as {
        rideId: string;
        passenger: { name: string; rating?: number };
        pickup: { address: string; lat?: number; lng?: number };
        dropoff: { address: string; lat?: number; lng?: number };
        estimatedPrice: number;
        estimatedDuration: number;
        distance: number;
        type: string;
    };

    const [phase, setPhase]         = useState<TripPhase>('to_pickup');
    const [loading, setLoading]     = useState(false);
    const [elapsed, setElapsed]     = useState(0); // seconds since trip started
    const [sosOpen, setSosOpen]     = useState(false);
    const [driverCoords, setDriverCoords] = useState<{ latitude: number; longitude: number } | null>(null);

    const watchId   = useRef<any>(null);
    const timerRef  = useRef<any>(null);

    // ── Start GPS broadcasting + elapsed timer ────────────────────────────────
    useEffect(() => {
        startGPS();
        timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
        return () => {
            stopGPS();
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const startGPS = () => {
        if (Platform.OS !== 'web' || !(navigator as any).geolocation) return;
        watchId.current = (navigator as any).geolocation.watchPosition(
            (pos: any) => {
                const { latitude, longitude } = pos.coords;
                setDriverCoords({ latitude, longitude });
                socketService.emitLocationUpdate(request.rideId, latitude, longitude);
            },
            () => {},
            { enableHighAccuracy: true }
        );
    };

    const stopGPS = () => {
        if (watchId.current !== null && Platform.OS === 'web') {
            (navigator as any).geolocation.clearWatch(watchId.current);
            watchId.current = null;
        }
    };

    // ── Arrived at pickup — start ride ────────────────────────────────────────
    const handleArrived = async () => {
        setLoading(true);
        try {
            await apiService.patch(`/rides/${request.rideId}/status`, { status: 'started' });
            setPhase('to_dropoff');
            setElapsed(0);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not start ride.');
        } finally {
            setLoading(false);
        }
    };

    // ── Complete ride ─────────────────────────────────────────────────────────
    const handleComplete = async () => {
        Alert.alert(
            'Complete Ride?',
            `Drop off ${request.passenger?.name || 'passenger'} and end the trip.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Complete', style: 'default',
                    onPress: async () => {
                        setPhase('completing');
                        setLoading(true);
                        try {
                            await apiService.patch(`/rides/${request.rideId}/status`, { status: 'completed' });
                            stopGPS();
                            navigation.replace('RatePassenger', {
                                rideId: request.rideId,
                                passengerName: request.passenger?.name || 'Passenger',
                                fare: request.estimatedPrice,
                                distance: request.distance,
                            });
                        } catch (e: any) {
                            Alert.alert('Error', e.message || 'Could not complete ride.');
                            setPhase('to_dropoff');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    // ── SOS ───────────────────────────────────────────────────────────────────
    const handleSOS = () => {
        setSosOpen(false);
        socketService.emitSOS(request.rideId);
        Alert.alert('🆘 SOS Triggered', 'Emergency services and SAFORA safety team have been alerted. Stay safe.');
    };

    // ── Cancel ride ───────────────────────────────────────────────────────────
    const handleCancel = () => {
        Alert.alert(
            'Cancel Ride?',
            'Are you sure you want to cancel this ride? This may affect your rating.',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel', style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiService.post(`/rides/${request.rideId}/cancel`, { cancelledBy: 'driver' });
                            stopGPS();
                            navigation.goBack();
                        } catch {
                            navigation.goBack();
                        }
                    },
                },
            ]
        );
    };

    const formatElapsed = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const pickupCoords  = request?.pickup?.lat  ? { latitude: request.pickup.lat,  longitude: request.pickup.lng!  } : undefined;
    const dropoffCoords = request?.dropoff?.lat ? { latitude: request.dropoff.lat, longitude: request.dropoff.lng! } : undefined;

    const currentDestAddr = phase === 'to_pickup' ? request?.pickup?.address : request?.dropoff?.address;
    const phaseLabel      = phase === 'to_pickup'  ? 'Heading to Pickup' : 'On Trip · Heading to Dropoff';
    const phaseIcon       = phase === 'to_pickup'  ? '🟢' : '🔴';

    return (
        <View style={s.container}>
            <StatusBar barStyle="light-content" />

            {/* Full-screen map */}
            <View style={s.mapContainer}>
                <SaforaMap
                    type="tracking"
                    pickupLocation={pickupCoords}
                    dropoffLocation={dropoffCoords}
                    driverLocation={driverCoords ?? undefined}
                />
            </View>

            {/* Top banner */}
            <View style={s.topBanner}>
                <View style={s.topBannerLeft}>
                    <Text style={s.topBannerPhase}>{phaseIcon} {phaseLabel}</Text>
                    <Text style={s.topBannerAddr} numberOfLines={1}>{currentDestAddr}</Text>
                </View>
                <View style={s.timerBadge}>
                    <Text style={s.timerText}>{formatElapsed(elapsed)}</Text>
                </View>
            </View>

            {/* Floating controls */}
            <View style={s.floatingRight}>
                <TouchableOpacity
                    style={s.floatBtn}
                    onPress={() => navigation.navigate('Chat', {
                        rideId: request.rideId,
                        senderRole: 'driver',
                        driverName: 'You',
                        passengerName: request.passenger?.name || 'Passenger',
                    })}
                >
                    <Text style={s.floatIcon}>💬</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.floatBtn, s.floatSOS]} onPress={() => setSosOpen(true)}>
                    <Text style={s.floatSOSText}>SOS</Text>
                </TouchableOpacity>
            </View>

            {/* Bottom footer */}
            <View style={s.footer}>
                {/* Passenger info strip */}
                <View style={s.passengerStrip}>
                    <View style={s.passengerAvatar}>
                        <Text style={s.passengerInitial}>
                            {(request?.passenger?.name || 'P').charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View style={s.passengerInfo}>
                        <Text style={s.passengerName}>{request?.passenger?.name || 'Passenger'}</Text>
                        <Text style={s.passengerMeta}>
                            RS {request?.estimatedPrice} · {request?.distance?.toFixed(1)} km
                            {request?.passenger?.rating ? `  ⭐ ${request.passenger.rating}` : ''}
                        </Text>
                    </View>
                    <TouchableOpacity style={s.cancelLinkBtn} onPress={handleCancel}>
                        <Text style={s.cancelLinkText}>Cancel</Text>
                    </TouchableOpacity>
                </View>

                <View style={s.footerDivider} />

                {/* Main action */}
                {phase === 'to_pickup' && (
                    <TouchableOpacity
                        style={[s.mainActionBtn, loading && { opacity: 0.6 }]}
                        onPress={handleArrived}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color="#000" />
                            : <>
                                <Text style={s.mainActionIcon}>✅</Text>
                                <Text style={s.mainActionText}>I've Arrived at Pickup</Text>
                              </>
                        }
                    </TouchableOpacity>
                )}

                {phase === 'to_dropoff' && (
                    <TouchableOpacity
                        style={[s.mainActionBtn, s.mainActionBtnEnd, loading && { opacity: 0.6 }]}
                        onPress={handleComplete}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <>
                                <Text style={s.mainActionIcon}>🏁</Text>
                                <Text style={[s.mainActionText, { color: '#fff' }]}>Complete Ride</Text>
                              </>
                        }
                    </TouchableOpacity>
                )}

                {phase === 'completing' && (
                    <View style={s.completingRow}>
                        <ActivityIndicator color={theme.colors.primary} />
                        <Text style={s.completingText}>Completing ride…</Text>
                    </View>
                )}
            </View>

            {/* SOS Confirmation Modal */}
            <Modal visible={sosOpen} transparent animationType="fade" onRequestClose={() => setSosOpen(false)}>
                <Pressable style={s.sosOverlay} onPress={() => setSosOpen(false)}>
                    <Pressable style={s.sosModal} onPress={e => e.stopPropagation()}>
                        <Text style={s.sosTitle}>🆘 Send SOS?</Text>
                        <Text style={s.sosSub}>
                            This will alert SAFORA's safety team and share your location. Only use in a real emergency.
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
    container:    { flex: 1, backgroundColor: t.colors.background },
    mapContainer: { flex: 1 },

    topBanner: {
        position: 'absolute', top: Platform.OS === 'ios' ? 54 : 40,
        left: 16, right: 16,
        backgroundColor: t.colors.card,
        borderRadius: 16, padding: 14,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8,
    },
    topBannerLeft:  { flex: 1, marginRight: 12 },
    topBannerPhase: { fontSize: 12, fontWeight: '800', color: t.colors.primary, marginBottom: 2 },
    topBannerAddr:  { fontSize: 14, fontWeight: '600', color: t.colors.text },
    timerBadge:     { backgroundColor: t.colors.primary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    timerText:      { fontSize: 14, fontWeight: '900', color: t.colors.black },

    floatingRight: { position: 'absolute', right: 16, top: 150, gap: 10 },
    floatBtn: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: t.colors.card, alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 5,
    },
    floatIcon:    { fontSize: 22 },
    floatSOS:     { backgroundColor: '#EF4444' },
    floatSOSText: { fontSize: 11, fontWeight: '900', color: '#fff' },

    footer: {
        backgroundColor: t.colors.card,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 12,
    },
    passengerStrip:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
    passengerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
    passengerInitial:{ fontSize: 18, fontWeight: '900', color: t.colors.black },
    passengerInfo:   { flex: 1 },
    passengerName:   { fontSize: 15, fontWeight: '800', color: t.colors.text },
    passengerMeta:   { fontSize: 12, color: t.colors.textSecondary, marginTop: 2 },
    cancelLinkBtn:   { padding: 4 },
    cancelLinkText:  { fontSize: 12, color: t.colors.danger, fontWeight: '600' },

    footerDivider: { height: 1, backgroundColor: t.colors.divider, marginBottom: 16 },

    mainActionBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: t.colors.primary, borderRadius: 16, paddingVertical: 16, gap: 10,
    },
    mainActionBtnEnd: { backgroundColor: '#22C55E' },
    mainActionIcon:   { fontSize: 20 },
    mainActionText:   { fontSize: 16, fontWeight: '900', color: t.colors.black },

    completingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 16 },
    completingText:{ fontSize: 15, color: t.colors.textSecondary, fontWeight: '600' },

    // SOS Modal
    sosOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
    sosModal:       { backgroundColor: t.colors.card, borderRadius: 24, padding: 28, alignItems: 'center', borderWidth: 2, borderColor: '#EF4444' },
    sosTitle:       { fontSize: 24, fontWeight: '900', color: '#EF4444', marginBottom: 12 },
    sosSub:         { fontSize: 14, color: t.colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    sosConfirmBtn:  { width: '100%', backgroundColor: '#EF4444', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
    sosConfirmText: { color: '#fff', fontWeight: '900', fontSize: 15 },
    sosCancelBtn:   { paddingVertical: 10 },
    sosCancelText:  { color: t.colors.textSecondary, fontSize: 14 },
});

export default TripNavScreen;
