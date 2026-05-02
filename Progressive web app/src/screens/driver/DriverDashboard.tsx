import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Switch, Modal, ActivityIndicator,
    Dimensions, Alert, Platform, PermissionsAndroid,
    ScrollView, Pressable, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// react-native-geolocation-service is native-only — use browser API on web
const Geolocation: any = Platform.OS !== 'web'
    ? require('react-native-geolocation-service').default
    : null;
import SaforaMap from '../../components/SaforaMap';
import { useAppTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../utils/theme';
import socketService from '../../services/socket.service';
import apiService from '../../services/api';
import { STORAGE_KEYS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';

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
    const { theme } = useAppTheme();
    const { logout } = useAuth();
    const s = useMemo(() => makeStyles(theme), [theme]);

    const [isOnline, setIsOnline]         = useState(false);
    const [rideStatus, setRideStatus]     = useState<RideStatus>('idle');
    const [incoming, setIncoming]         = useState<IncomingRide | null>(null);
    const [activeRide, setActiveRide]     = useState<IncomingRide | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [driverId, setDriverId]         = useState<string>('');
    const [driverName, setDriverName]     = useState<string>('');
    const [profilePicture, setProfilePicture] = useState<string>('');
    const [earnings, setEarnings]         = useState({ today: 0, trips: 0, rating: '5.0' });
    const [menuOpen, setMenuOpen]         = useState(false);
    const socketConnected = useRef(false);
    const watchId = useRef<number | null>(null);

    const loadDriver = async () => {
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
            if (raw) {
                const user = JSON.parse(raw);
                setDriverId(user.id || user._id || '');
                if (user.name) setDriverName(user.name);
                if (user.profilePicture) setProfilePicture(user.profilePicture);
            }
            // Fetch fresh profile from API
            const res: any = await apiService.get('/drivers/me');
            if (res.success && res.driver) {
                setDriverName(res.driver.name || '');
                setEarnings(prev => ({ ...prev, rating: res.driver.rating?.toFixed(1) || '5.0' }));
                if (res.driver.profilePicture) setProfilePicture(res.driver.profilePicture);
            }
        } catch { /* use cached data */ }
    };

    useEffect(() => {
        loadDriver();
        const unsub = navigation.addListener('focus', loadDriver);
        return unsub;
    }, [navigation]);

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
        if (Platform.OS === 'web') {
            if (!navigator.geolocation) return;
            watchId.current = navigator.geolocation.watchPosition(
                (pos) => socketService.emitLocationUpdate(rideId, pos.coords.latitude, pos.coords.longitude),
                (err) => console.log('[GPS] Web error:', err.message),
                { enableHighAccuracy: true }
            ) as any;
            return;
        }
        const allowed = await requestLocationPermission();
        if (!allowed) return;
        watchId.current = Geolocation.watchPosition(
            (pos: any) => {
                const { latitude, longitude } = pos.coords;
                socketService.emitLocationUpdate(rideId, latitude, longitude);
            },
            (err: any) => console.log('[GPS] Error:', err.message),
            { enableHighAccuracy: true, distanceFilter: 5, interval: 4000, fastestInterval: 2000 }
        );
    };

    const stopGPS = () => {
        if (watchId.current !== null) {
            if (Platform.OS === 'web') {
                navigator.geolocation.clearWatch(watchId.current as any);
            } else {
                Geolocation.clearWatch(watchId.current);
            }
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

    const initial = driverName ? driverName.charAt(0).toUpperCase() : 'D';

    const menuItems = [
        { icon: '👤', label: 'My Profile',   onPress: () => navigation.navigate('DriverProfile'), danger: false },
        { icon: '💰', label: 'Earnings',      onPress: () => navigation.navigate('DriverEarnings'), danger: false },
        { icon: '🎀', label: 'Pink Pass',     onPress: () => navigation.navigate('PinkPassDriver'), danger: false },
        { icon: '🚪', label: 'Log Out',       onPress: () => logout(),                              danger: true  },
    ];

    return (
        <View style={s.container}>
            {/* ── Hamburger Menu Modal ── */}
            <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
                <Pressable style={s.menuOverlay} onPress={() => setMenuOpen(false)}>
                    <Pressable style={s.menuPanel} onPress={e => e.stopPropagation()}>
                        <View style={s.menuHeader}>
                            <View style={s.menuBrand}>
                                <Text style={s.menuBrandIcon}>🛡️</Text>
                                <Text style={s.menuBrandName}>SAFORA</Text>
                            </View>
                            <TouchableOpacity style={s.menuCloseBtn} onPress={() => setMenuOpen(false)}>
                                <Text style={s.menuCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={s.menuGreeting}>Hello, {driverName || 'Driver'} 👋</Text>
                        <View style={s.menuItems}>
                            {menuItems.map((item, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={[s.menuItem, item.danger && s.menuItemDanger]}
                                    onPress={() => { setMenuOpen(false); item.onPress(); }}
                                    activeOpacity={0.75}
                                >
                                    <Text style={s.menuItemIcon}>{item.icon}</Text>
                                    <Text style={[s.menuItemLabel, item.danger && s.menuItemLabelDanger]}>{item.label}</Text>
                                    <Text style={s.menuItemArrow}>›</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* ── Incoming Ride Modal ── */}
            <Modal visible={rideStatus === 'incoming'} transparent animationType="slide">
                <View style={s.modalOverlay}>
                    <View style={s.rideModal}>
                        <View style={s.modalHandle} />
                        <Text style={s.modalTitle}>🚗 Ride Request</Text>

                        <View style={s.routeCard}>
                            <View style={s.routeRow}>
                                <View style={s.dotFrom} />
                                <View style={s.routeTexts}>
                                    <Text style={s.routeLabel}>PICKUP</Text>
                                    <Text style={s.routeAddr} numberOfLines={1}>
                                        {incoming?.pickup?.address || '—'}
                                    </Text>
                                </View>
                            </View>
                            <View style={s.routeDivider} />
                            <View style={s.routeRow}>
                                <View style={s.dotTo} />
                                <View style={s.routeTexts}>
                                    <Text style={s.routeLabel}>DROPOFF</Text>
                                    <Text style={s.routeAddr} numberOfLines={1}>
                                        {incoming?.dropoff?.address || '—'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={s.statsRow}>
                            <View style={s.statItem}>
                                <Text style={s.statVal}>RS {incoming?.estimatedPrice || '—'}</Text>
                                <Text style={s.statLabel}>Fare</Text>
                            </View>
                            <View style={s.statDivider} />
                            <View style={s.statItem}>
                                <Text style={s.statVal}>{incoming?.distance || '—'} km</Text>
                                <Text style={s.statLabel}>Distance</Text>
                            </View>
                            <View style={s.statDivider} />
                            <View style={s.statItem}>
                                <Text style={s.statVal}>{incoming?.estimatedDuration || '—'} min</Text>
                                <Text style={s.statLabel}>Duration</Text>
                            </View>
                        </View>

                        {incoming?.type === 'pink-pass' && (
                            <View style={s.pinkBadge}>
                                <Text style={s.pinkBadgeText}>🎀 Pink Pass — Female passenger</Text>
                            </View>
                        )}

                        <View style={s.actionRow}>
                            <TouchableOpacity
                                style={[s.rejectBtn, actionLoading && { opacity: 0.5 }]}
                                onPress={handleReject}
                                disabled={actionLoading}
                            >
                                <Text style={s.rejectText}>✕ Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[s.acceptBtn, actionLoading && { opacity: 0.5 }]}
                                onPress={handleAccept}
                                disabled={actionLoading}
                            >
                                {actionLoading
                                    ? <ActivityIndicator color={theme.colors.black} />
                                    : <Text style={s.acceptText}>✓ Accept</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── Scrollable Dashboard Body ── */}
            <ScrollView
                style={s.scrollView}
                contentContainerStyle={s.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Driver Mode Label */}
                <Text style={s.driverModeLabel}>DRIVER MODE</Text>

                {/* Header Row */}
                <View style={s.headerRow}>
                    <Text style={s.greeting}>Hello, {driverName || 'Driver'} 👋</Text>
                    <View style={s.headerRight}>
                        <TouchableOpacity
                            style={s.avatarCircle}
                            onPress={() => navigation.navigate('DriverProfile')}
                            activeOpacity={0.8}
                        >
                            {profilePicture ? (
                                <Image source={{ uri: profilePicture }} style={s.avatarImage} />
                            ) : (
                                <Text style={s.avatarInitial}>{initial}</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={s.hamburgerBtn}
                            onPress={() => setMenuOpen(true)}
                            activeOpacity={0.85}
                        >
                            <Text style={s.hamburgerIcon}>☰</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Status Card */}
                <View style={s.statusCard}>
                    <View style={s.statusTopRow}>
                        <Text style={s.statusCardLabel}>Status</Text>
                        <View style={[s.statusBadge, isOnline && s.statusBadgeOnline]}>
                            <View style={[s.statusDot, isOnline && s.statusDotOnline]} />
                            <Text style={[s.statusBadgeText, isOnline && s.statusBadgeTextOnline]}>
                                {isOnline ? 'ONLINE' : 'OFFLINE'}
                            </Text>
                        </View>
                    </View>
                    <Text style={s.statusDesc}>
                        {isOnline
                            ? 'You are currently online. Go offline to stop receiving rides.'
                            : 'You are currently offline. Go online to start receiving rides.'}
                    </Text>
                    <View style={s.statusToggleRow}>
                        <Text style={s.statusToggleHint}>{isOnline ? 'Tap to go offline' : 'Tap to go online'}</Text>
                        <Switch
                            trackColor={{ false: theme.dark ? '#333' : '#DDD', true: '#22C55E' }}
                            thumbColor={'#fff'}
                            onValueChange={handleToggleOnline}
                            value={isOnline}
                        />
                    </View>
                </View>

                {/* 3 Stat Boxes */}
                <View style={s.statBoxRow}>
                    <View style={s.statBox}>
                        <Text style={s.statBoxValue}>RS {earnings.today.toLocaleString()}</Text>
                        <Text style={s.statBoxLabel}>TODAY'S EARN</Text>
                    </View>
                    <View style={s.statBox}>
                        <Text style={s.statBoxValue}>{earnings.trips}</Text>
                        <Text style={s.statBoxLabel}>TOTAL TRIPS</Text>
                    </View>
                    <View style={s.statBox}>
                        <Text style={s.statBoxValue}>{earnings.rating}★</Text>
                        <Text style={s.statBoxLabel}>YOUR RATING</Text>
                    </View>
                </View>

                {/* Searching for Passengers Card */}
                {isOnline && rideStatus === 'idle' && (
                    <View style={s.searchingCard}>
                        <Text style={s.searchingIcon}>🔍</Text>
                        <View style={s.searchingTexts}>
                            <Text style={s.searchingTitle}>Searching for Passengers...</Text>
                            <Text style={s.searchingSubtitle}>Lahore · Active zone</Text>
                        </View>
                    </View>
                )}

                {!isOnline && rideStatus === 'idle' && (
                    <View style={s.searchingCard}>
                        <Text style={s.searchingIcon}>💤</Text>
                        <View style={s.searchingTexts}>
                            <Text style={s.searchingTitle}>You're Offline</Text>
                            <Text style={s.searchingSubtitle}>Toggle the switch above to go online</Text>
                        </View>
                    </View>
                )}

                {/* Active Ride Card */}
                {(rideStatus === 'accepted' || rideStatus === 'started') && activeRide && (
                    <View style={s.activeCard}>
                        <View style={s.activeCardHeader}>
                            <Text style={s.activeCardTitle}>
                                {rideStatus === 'accepted' ? '🚗 Head to Pickup' : '🛣️ Ride in Progress'}
                            </Text>
                            <Text style={s.activeFareVal}>RS {activeRide.estimatedPrice}</Text>
                        </View>
                        <Text style={s.activeAddr} numberOfLines={1}>
                            {rideStatus === 'accepted'
                                ? activeRide.pickup?.address
                                : activeRide.dropoff?.address}
                        </Text>
                        <View style={s.actionRow}>
                            <TouchableOpacity
                                style={[s.chatBtn, { flex: 1 }]}
                                onPress={() => navigation.navigate('Chat', {
                                    rideId: activeRide.rideId,
                                    senderRole: 'driver',
                                    driverName: 'You',
                                })}
                            >
                                <Text style={s.chatIcon}>💬 Chat</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[s.rideActionBtn, { flex: 3 }, rideStatus === 'started' && s.endBtn, actionLoading && { opacity: 0.6 }]}
                                onPress={rideStatus === 'accepted' ? handleStartRide : handleEndRide}
                                disabled={actionLoading}
                            >
                                {actionLoading
                                    ? <ActivityIndicator color={theme.colors.black} />
                                    : <Text style={s.rideActionText}>
                                        {rideStatus === 'accepted' ? '▶ Start Ride' : '■ End Ride'}
                                      </Text>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {rideStatus === 'completed' && (
                    <View style={s.completedCard}>
                        <Text style={s.completedText}>✅ Ride Completed!</Text>
                        <Text style={s.completedSub}>Earnings updated</Text>
                    </View>
                )}

                {/* Mini Map Preview */}
                <View style={s.mapPreviewCard}>
                    <SaforaMap 
                        type="driver" 
                        centerOnUser={true}
                    />
                    <View style={s.mapOverlay}>
                        <Text style={s.mapOverlayText}>📍 Your Location — Live Map</Text>
                    </View>
                </View>

                {/* Support Card (Replaces the big simulation button) */}
                <TouchableOpacity
                    style={s.supportCard}
                    onPress={() => Alert.alert('SAFORA Support', 'Our driver support team is available 24/7. Contact us via the help section.')}
                >
                    <Text style={s.supportIcon}>🎧</Text>
                    <View style={s.supportTexts}>
                        <Text style={s.supportTitle}>Driver Support</Text>
                        <Text style={s.supportSubtitle}>Need help? Contact our team</Text>
                    </View>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const makeStyles = (t: AppTheme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: t.colors.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 58 : 44,
        paddingBottom: 40,
    },

    // ── Driver Mode Label ──
    driverModeLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: t.colors.primary,
        letterSpacing: 2,
        marginBottom: 14,
    },

    // ── Header ──
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    greeting: {
        fontSize: 28,
        fontWeight: '900',
        color: t.colors.text,
        letterSpacing: -0.5,
        flex: 1,
        flexWrap: 'wrap',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginLeft: 12,
    },
    avatarCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: t.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarInitial: {
        fontSize: 20,
        fontWeight: '900',
        color: t.colors.black,
    },
    hamburgerBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: t.dark ? '#2A2A2A' : '#F0F0F0',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: t.colors.border,
    },
    hamburgerIcon: {
        fontSize: 18,
        color: t.colors.text,
    },

    // ── Hamburger Menu ──
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    menuPanel: {
        backgroundColor: t.colors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 48,
    },
    menuHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    menuBrand: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    menuBrandIcon: { fontSize: 20 },
    menuBrandName: {
        fontSize: 18,
        fontWeight: '900',
        color: t.colors.text,
        letterSpacing: 1,
    },
    menuCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: t.dark ? '#333' : '#EEE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuCloseText: { fontSize: 14, color: t.colors.text, fontWeight: '700' },
    menuGreeting: {
        fontSize: 14,
        color: t.colors.textSecondary,
        marginBottom: 20,
    },
    menuItems: { gap: 4 },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        backgroundColor: t.dark ? '#1C1C1C' : '#F7F7F7',
        marginBottom: 6,
        gap: 14,
    },
    menuItemDanger: {
        backgroundColor: 'rgba(255,68,68,0.08)',
    },
    menuItemIcon: { fontSize: 18 },
    menuItemLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '700',
        color: t.colors.text,
    },
    menuItemLabelDanger: { color: t.colors.danger },
    menuItemArrow: {
        fontSize: 20,
        color: t.colors.textSecondary,
        fontWeight: '300',
    },

    // ── Status Card ──
    statusCard: {
        backgroundColor: t.dark ? '#1C1C1C' : '#F2F2F2',
        borderRadius: 16,
        padding: 18,
        marginBottom: 16,
    },
    statusTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    statusCardLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: t.colors.text,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: t.dark ? '#2A2A2A' : '#E0E0E0',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 6,
    },
    statusBadgeOnline: {
        backgroundColor: 'rgba(34,197,94,0.15)',
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#888',
    },
    statusDotOnline: {
        backgroundColor: '#22C55E',
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#888',
        letterSpacing: 1,
    },
    statusBadgeTextOnline: {
        color: '#22C55E',
    },
    statusDesc: {
        fontSize: 13,
        color: t.colors.textSecondary,
        lineHeight: 19,
        marginBottom: 14,
    },
    statusToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statusToggleHint: {
        fontSize: 13,
        fontWeight: '600',
        color: t.colors.textSecondary,
    },

    // ── 3 Stat Boxes ──
    statBoxRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    statBox: {
        flex: 1,
        backgroundColor: t.dark ? '#1C1C1C' : '#F2F2F2',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 8,
        alignItems: 'center',
    },
    statBoxValue: {
        fontSize: 15,
        fontWeight: '900',
        color: t.colors.primary,
        marginBottom: 4,
        textAlign: 'center',
    },
    statBoxLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: t.colors.textSecondary,
        letterSpacing: 0.8,
        textAlign: 'center',
    },

    // ── Searching Card ──
    searchingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: t.dark ? '#1C1C1C' : '#F2F2F2',
        borderRadius: 16,
        padding: 18,
        marginBottom: 16,
        gap: 14,
    },
    searchingIcon: {
        fontSize: 28,
    },
    searchingTexts: {
        flex: 1,
    },
    searchingTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: t.colors.text,
        marginBottom: 4,
    },
    searchingSubtitle: {
        fontSize: 12,
        color: t.colors.textSecondary,
        fontWeight: '500',
    },

    // ── Active Ride Card ──
    activeCard: {
        backgroundColor: t.dark ? '#1C1C1C' : '#F2F2F2',
        borderRadius: 16,
        padding: 18,
        marginBottom: 16,
    },
    activeCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    activeCardTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: t.colors.text,
    },
    activeFareVal: {
        fontSize: 18,
        fontWeight: '900',
        color: t.colors.primary,
    },
    activeAddr: {
        fontSize: 13,
        color: t.colors.textSecondary,
        marginBottom: 14,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
    },
    chatBtn: {
        backgroundColor: t.dark ? '#252525' : '#E8E8E8',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: t.dark ? '#333' : '#DDD',
    },
    chatIcon: {
        color: t.colors.text,
        fontWeight: '700',
        fontSize: 14,
    },
    rideActionBtn: {
        backgroundColor: t.colors.primary,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
    },
    endBtn: {
        backgroundColor: '#EF4444',
    },
    rideActionText: {
        color: t.colors.black,
        fontWeight: '700',
        fontSize: 14,
    },

    // ── Completed Card ──
    completedCard: {
        backgroundColor: t.dark ? '#1C1C1C' : '#F2F2F2',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 16,
    },
    completedText: {
        fontSize: 20,
        fontWeight: '900',
        color: '#22C55E',
        textAlign: 'center',
        marginBottom: 6,
    },
    completedSub: {
        fontSize: 13,
        color: t.colors.textSecondary,
        textAlign: 'center',
    },

    // ── Mini Map Preview ──
    mapPreviewCard: {
        height: 180,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#1A1A2E',
        marginBottom: 16,
        position: 'relative',
    },
    mapOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.55)',
        paddingVertical: 10,
        paddingHorizontal: 14,
    },
    mapOverlayText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },

    supportCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: t.dark ? '#1C1C1C' : '#F2F2F2',
        borderRadius: 16,
        padding: 18,
        marginBottom: 8,
        gap: 14,
        borderWidth: 1,
        borderColor: t.colors.border,
    },
    supportIcon: {
        fontSize: 24,
    },
    supportTexts: {
        flex: 1,
    },
    supportTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: t.colors.text,
    },
    supportSubtitle: {
        fontSize: 12,
        color: t.colors.textSecondary,
    },

    // ── Incoming Ride Modal ──
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    rideModal: {
        backgroundColor: t.colors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    modalHandle: {
        width: 40, height: 4,
        backgroundColor: t.dark ? '#444' : '#CCC',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: t.colors.text,
        marginBottom: 16,
    },
    routeCard: {
        backgroundColor: t.dark ? '#111' : '#F4F4F4',
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
    },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dotFrom: {
        width: 10, height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: t.colors.primary,
    },
    dotTo: {
        width: 10, height: 10,
        borderRadius: 2,
        backgroundColor: t.colors.primary,
    },
    routeTexts: { flex: 1 },
    routeLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: t.colors.textSecondary,
        letterSpacing: 1.5,
    },
    routeAddr: {
        fontSize: 13,
        fontWeight: '600',
        color: t.colors.text,
    },
    routeDivider: {
        height: 1,
        backgroundColor: t.dark ? '#222' : '#E8E8E8',
        marginVertical: 10,
        marginLeft: 22,
    },
    statsRow: {
        flexDirection: 'row',
        marginBottom: 14,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statVal: {
        fontSize: 16,
        fontWeight: '900',
        color: t.colors.primary,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 10,
        color: t.colors.textSecondary,
    },
    statDivider: {
        width: 1,
        backgroundColor: t.dark ? '#333' : '#DDD',
    },
    pinkBadge: {
        backgroundColor: 'rgba(255,105,180,0.15)',
        borderRadius: 10,
        padding: 10,
        marginBottom: 14,
        alignItems: 'center',
    },
    pinkBadgeText: {
        fontSize: 12,
        color: '#FF69B4',
        fontWeight: '700',
    },
    rejectBtn: {
        flex: 1,
        backgroundColor: t.dark ? '#1a1a1a' : '#FFF0F0',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EF4444',
    },
    rejectText: {
        color: '#EF4444',
        fontWeight: '700',
        fontSize: 15,
    },
    acceptBtn: {
        flex: 2,
        backgroundColor: t.colors.primary,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
    },
    acceptText: {
        color: t.colors.black,
        fontWeight: '700',
        fontSize: 15,
    },
});

export default DriverDashboard;
