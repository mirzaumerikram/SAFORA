import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, Platform, StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../utils/theme';
import SaforaMap from '../../components/SaforaMap';
import apiService from '../../services/api';
import socketService from '../../services/socket.service';

const COUNTDOWN_SECS = 30;

const RideRequestScreen: React.FC = () => {
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

    const [countdown, setCountdown] = useState(COUNTDOWN_SECS);
    const [loading, setLoading]     = useState(false);
    const timerRef = useRef<any>(null);

    useEffect(() => {
        timerRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleReject(true); // auto-reject
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, []);

    const handleAccept = async () => {
        clearInterval(timerRef.current);
        setLoading(true);
        try {
            await apiService.patch(`/rides/${request.rideId}/accept`, {});
            socketService.joinRide(request.rideId);
            navigation.replace('TripNav', { request });
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not accept ride. Try again.');
            setLoading(false);
        }
    };

    const handleReject = async (auto = false) => {
        clearInterval(timerRef.current);
        if (!auto) setLoading(true);
        try {
            await apiService.patch(`/rides/${request.rideId}/reject`, {});
        } catch { /* silent */ } finally {
            navigation.goBack();
        }
    };

    const pickupCoords = request?.pickup?.lat
        ? { latitude: request.pickup.lat, longitude: request.pickup.lng! }
        : undefined;
    const dropoffCoords = request?.dropoff?.lat
        ? { latitude: request.dropoff.lat, longitude: request.dropoff.lng! }
        : undefined;

    const urgency = countdown <= 10;

    return (
        <View style={s.container}>
            <StatusBar barStyle="dark-content" />

            {/* Full-screen map */}
            <View style={s.mapContainer}>
                <SaforaMap
                    type="tracking"
                    pickupLocation={pickupCoords}
                    dropoffLocation={dropoffCoords}
                />
            </View>

            {/* Bottom sheet */}
            <View style={s.sheet}>
                <View style={s.dragHandle} />

                {/* Countdown + header */}
                <View style={s.topRow}>
                    <View style={[s.countdownCircle, urgency && s.countdownUrgent]}>
                        <Text style={[s.countdownNum, urgency && s.countdownNumUrgent]}>{countdown}</Text>
                        <Text style={s.countdownSec}>sec</Text>
                    </View>
                    <View style={s.headerTexts}>
                        <Text style={s.newRideLabel}>🚗 New Ride Request</Text>
                        {request?.type === 'pink-pass' && (
                            <View style={s.pinkBadge}><Text style={s.pinkBadgeText}>🎀 Pink Pass Ride</Text></View>
                        )}
                    </View>
                </View>

                {/* Passenger info */}
                <View style={s.passengerRow}>
                    <View style={s.passengerAvatar}>
                        <Text style={s.passengerInitial}>
                            {(request?.passenger?.name || 'P').charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View>
                        <Text style={s.passengerName}>{request?.passenger?.name || 'Passenger'}</Text>
                        {request?.passenger?.rating && (
                            <Text style={s.passengerRating}>⭐ {request.passenger.rating} rating</Text>
                        )}
                    </View>
                </View>

                <View style={s.divider} />

                {/* Route */}
                <View style={s.routeContainer}>
                    <View style={s.routeRow}>
                        <View style={s.dotGreen} />
                        <View style={s.routeTextWrap}>
                            <Text style={s.routeLabel}>PICKUP</Text>
                            <Text style={s.routeText} numberOfLines={2}>{request?.pickup?.address || '—'}</Text>
                        </View>
                    </View>
                    <View style={s.routeLine} />
                    <View style={s.routeRow}>
                        <View style={s.dotRed} />
                        <View style={s.routeTextWrap}>
                            <Text style={s.routeLabel}>DROPOFF</Text>
                            <Text style={s.routeText} numberOfLines={2}>{request?.dropoff?.address || '—'}</Text>
                        </View>
                    </View>
                </View>

                <View style={s.divider} />

                {/* Stats */}
                <View style={s.statsRow}>
                    <View style={s.statBlock}>
                        <Text style={s.statVal}>RS {request?.estimatedPrice || '—'}</Text>
                        <Text style={s.statLabel}>FARE</Text>
                    </View>
                    <View style={s.statDivider} />
                    <View style={s.statBlock}>
                        <Text style={s.statVal}>{request?.distance?.toFixed(1) || '—'} km</Text>
                        <Text style={s.statLabel}>DISTANCE</Text>
                    </View>
                    <View style={s.statDivider} />
                    <View style={s.statBlock}>
                        <Text style={s.statVal}>{request?.estimatedDuration || '—'} min</Text>
                        <Text style={s.statLabel}>ETA</Text>
                    </View>
                </View>

                {/* Actions */}
                <View style={s.actions}>
                    <TouchableOpacity
                        style={[s.rejectBtn, loading && { opacity: 0.5 }]}
                        onPress={() => handleReject()}
                        disabled={loading}
                    >
                        <Text style={s.rejectText}>✕ Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[s.acceptBtn, loading && { opacity: 0.5 }]}
                        onPress={handleAccept}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color="#000" />
                            : <Text style={s.acceptText}>✓ Accept</Text>
                        }
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const makeStyles = (t: AppTheme) => StyleSheet.create({
    container:    { flex: 1, backgroundColor: t.colors.background },
    mapContainer: { flex: 1 },

    sheet: {
        backgroundColor: t.colors.card,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 24, paddingTop: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.12, shadowRadius: 18, elevation: 18,
    },
    dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border, alignSelf: 'center', marginBottom: 20 },

    topRow:       { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
    countdownCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
    countdownUrgent: { borderColor: '#EF4444' },
    countdownNum:    { fontSize: 22, fontWeight: '900', color: t.colors.primary },
    countdownNumUrgent: { color: '#EF4444' },
    countdownSec:    { fontSize: 9, color: t.colors.textSecondary, fontWeight: '700' },
    headerTexts:     { flex: 1 },
    newRideLabel:    { fontSize: 18, fontWeight: '900', color: t.colors.text, marginBottom: 4 },
    pinkBadge:       { backgroundColor: 'rgba(255,105,180,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
    pinkBadgeText:   { fontSize: 11, color: '#FF69B4', fontWeight: '700' },

    passengerRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    passengerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
    passengerInitial:{ fontSize: 20, fontWeight: '900', color: t.colors.black },
    passengerName:   { fontSize: 16, fontWeight: '800', color: t.colors.text },
    passengerRating: { fontSize: 12, color: t.colors.textSecondary, marginTop: 2 },

    divider: { height: 1, backgroundColor: t.colors.divider, marginVertical: 14 },

    routeContainer: { gap: 0 },
    routeRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
    dotGreen:       { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E', marginTop: 4 },
    dotRed:         { width: 10, height: 10, borderRadius: 2, backgroundColor: '#EF4444', marginTop: 4 },
    routeLine:      { width: 2, height: 20, backgroundColor: t.colors.border, marginLeft: 4, marginVertical: 4 },
    routeTextWrap:  { flex: 1 },
    routeLabel:     { fontSize: 9, fontWeight: '800', color: t.colors.textSecondary, letterSpacing: 1.5, marginBottom: 2 },
    routeText:      { fontSize: 14, fontWeight: '600', color: t.colors.text, lineHeight: 20 },

    statsRow:    { flexDirection: 'row', marginBottom: 20 },
    statBlock:   { flex: 1, alignItems: 'center' },
    statVal:     { fontSize: 17, fontWeight: '900', color: t.colors.primary, marginBottom: 2 },
    statLabel:   { fontSize: 9, fontWeight: '800', color: t.colors.textSecondary, letterSpacing: 1 },
    statDivider: { width: 1, backgroundColor: t.colors.divider },

    actions:    { flexDirection: 'row', gap: 12 },
    rejectBtn:  { flex: 1, backgroundColor: t.dark ? '#1a1a1a' : '#FFF0F0', borderRadius: 16, paddingVertical: 17, alignItems: 'center', borderWidth: 1, borderColor: '#EF4444' },
    rejectText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
    acceptBtn:  { flex: 2, backgroundColor: t.colors.primary, borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
    acceptText: { color: t.colors.black, fontWeight: '900', fontSize: 15 },
});

export default RideRequestScreen;
