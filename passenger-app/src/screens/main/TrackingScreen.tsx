import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image, Animated, Platform } from 'react-native';
import SaforaMap from '../../components/SaforaMap';
import { useNavigation, useRoute } from '@react-navigation/native';
import theme from '../../utils/theme';
import socketService from '../../services/socket.service';

const { width, height } = Dimensions.get('window');

interface Coordinates { latitude: number; longitude: number; }

const TrackingScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { rideId, estimatedPrice, pickup, dropoff } = route.params || {};

    const [status, setStatus]               = useState('ARRIVING');
    const [socketStatus, setSocketStatus]   = useState<'connecting' | 'live' | 'offline'>('connecting');
    const [driverLocation, setDriverLocation] = useState<Coordinates | null>(null);
    const pulseAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
        ).start();
    }, []);

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
                        started: 'ONBOARD',
                        completed: 'DROPPED',
                    };
                    if (map[newStatus]) setStatus(map[newStatus]);
                });

                // Listen for driver's live GPS location
                socketService.onDriverLocation(({ lat, lng }) => {
                    if (!mounted) return;
                    setDriverLocation({ latitude: lat, longitude: lng });
                });
            } catch {
                if (mounted) setSocketStatus('offline');
            }
        };

        initSocket();

        return () => {
            mounted = false;
            socketService.offAll();
        };
    }, [rideId]);

    const initialRegion = {
        latitude: 32.4945,
        longitude: 74.5229,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    };

    return (
        <View style={styles.container}>
            <SaforaMap type="tracking" driverLocation={driverLocation ?? undefined} />

            <View style={styles.overlay}>
                <View style={styles.topHeader}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Text style={styles.backText}>←</Text>
                    </TouchableOpacity>
                    <View style={styles.statusBadge}>
                        <Animated.View style={[styles.statusPulse, { opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }] }]} />
                        <Text style={styles.statusText}>{status}</Text>
                        {socketStatus === 'live' && <View style={styles.liveDot} />}
                    </View>
                    <TouchableOpacity style={styles.sosBtn}>
                        <Text style={styles.sosText}>SOS</Text>
                    </TouchableOpacity>
                </View>

                {/* Driver Info Card */}
                <View style={styles.driverCard}>
                    <View style={styles.driverHeader}>
                        <View style={styles.driverDetails}>
                            <Image 
                                source={{ uri: 'https://via.placeholder.com/60' }} 
                                style={styles.driverImg} 
                            />
                            <View>
                                <View style={styles.nameRow}>
                                    <Text style={styles.driverName}>Ahmed Khan</Text>
                                    <View style={styles.ratingBadge}>
                                        <Text style={styles.ratingText}>⭐ 4.9</Text>
                                    </View>
                                </View>
                                <Text style={styles.carInfo}>White Toyota Corolla • LEC-405</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.chatBtn}>
                            <Text style={styles.chatIcon}>💬</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.tripMeta}>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>ETA</Text>
                            <Text style={styles.metaValue}>3 MIN</Text>
                        </View>
                        <View style={styles.vDivider} />
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>FEE</Text>
                            <Text style={styles.metaValue}>RS {estimatedPrice || '—'}</Text>
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
