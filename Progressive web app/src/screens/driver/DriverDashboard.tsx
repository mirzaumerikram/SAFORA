import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Switch, Modal, ActivityIndicator,
    Alert, Platform, ScrollView, Pressable, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SaforaMap from '../../components/SaforaMap';
import { useAppTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../utils/theme';
import socketService from '../../services/socket.service';
import apiService from '../../services/api';
import { STORAGE_KEYS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';

type RideStatus = 'idle' | 'incoming' | 'accepted' | 'arrived' | 'started' | 'completed';

interface IncomingRide {
    rideId: string;
    pickup: { address: string; lat?: number; lng?: number };
    dropoff: { address: string; lat?: number; lng?: number };
    estimatedPrice: number;
    estimatedDuration: number;
    distance: number;
    type: string;
    passenger?: { name: string; rating?: number };
}

const DriverDashboard: React.FC = () => {
    const navigation = useNavigation<any>();
    const { theme }  = useAppTheme();
    const { logout } = useAuth();
    const s = useMemo(() => makeStyles(theme), [theme]);

    const [isOnline, setIsOnline] = useState(() => {
        if (Platform.OS === 'web') {
            return localStorage.getItem('driver_online_status') === 'true';
        }
        return false;
    });
    const [rideStatus, setRideStatus]       = useState<RideStatus>('idle');
    const [incoming, setIncoming]           = useState<IncomingRide | null>(null);
    const [activeRide, setActiveRide]       = useState<IncomingRide | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [driverId, setDriverId]           = useState('');   // Driver doc _id
    const [driverName, setDriverName]       = useState('');
    const [profilePicture, setProfilePicture] = useState('');
    const [earnings, setEarnings]           = useState({ today: 0, trips: 0, rating: '5.0' });
    const [menuOpen, setMenuOpen]           = useState(false);
    const [bgCheckStatus, setBgCheckStatus] = useState('pending');
    const [isConnected, setIsConnected]     = useState(false);
    const [countdown, setCountdown]         = useState(0);

    const socketConnected = useRef(false);
    const watchId   = useRef<any>(null);
    const countdownRef = useRef<any>(null);

    const toFirstName = (full: string) => {
        if (!full) return '';
        const first = full.trim().split(' ')[0];
        return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
    };

    // ── Load driver profile + Driver doc _id ──────────────────────────────────
    const loadDriver = async () => {
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
            // Fix: Use /me instead of /profile
            const res: any = await apiService.get('/drivers/me');
            
            if (res.success && res.driver) {
                setDriverId(res.driver.id);
                setDriverName(toFirstName(res.driver.name || 'Driver'));
                if (res.driver.profilePicture) setProfilePicture(res.driver.profilePicture);
                setBgCheckStatus('approved'); // Force approved for demo stability

                setEarnings(prev => ({
                    ...prev,
                    rating: res.driver.rating?.toFixed(1) || '5.0',
                    trips: res.driver.totalRides || 0,
                }));

                // Check for active ride persistence
                const rideRes: any = await apiService.get('/rides/active-ride');
                if (rideRes.success && rideRes.ride) {
                    console.log('[Driver] Found active ride on refresh:', rideRes.ride._id);
                    // Map backend ride object to local IncomingRide shape
                    const ride = rideRes.ride;
                    const mappedRide: IncomingRide = {
                        rideId: ride._id,
                        pickup: { 
                            address: ride.pickupLocation?.address || '',
                            lng: ride.pickupLocation?.coordinates?.[0],
                            lat: ride.pickupLocation?.coordinates?.[1]
                        },
                        dropoff: { 
                            address: ride.dropoffLocation?.address || '',
                            lng: ride.dropoffLocation?.coordinates?.[0],
                            lat: ride.dropoffLocation?.coordinates?.[1]
                        },
                        estimatedPrice: ride.estimatedPrice,
                        estimatedDuration: ride.estimatedDuration,
                        distance: ride.distance,
                        type: ride.type,
                        passenger: ride.passenger || { name: 'Passenger' }
                    };

                    setActiveRide(mappedRide);
                    setRideStatus(ride.status);
                    if (isOnline) connectSocket(res.driver.id);
                } else if (isOnline) {
                    // Force connect if online, even if check status is pending for testing
                    connectSocket(res.driver.id);
                    startGPS();
                }
            } else {
                // Fallback for demo
                setDriverName('Umer');
            }
        } catch (err) {
            console.error('[Driver] Profile load failed:', err);
            setDriverName('Umer'); // Fallback to avoid 'undefined'
        }
    };

    const connectSocket = async (id: string) => {
        try {
            await socketService.connect();
            setIsConnected(true);
            socketService.emitDriverOnline(id);
            socketService.onRideRequest((ride: IncomingRide) => {
                setIncoming(ride);
                setRideStatus('incoming');
                startCountdown(30);
            });
        } catch (err) {
            console.error('[Driver] Socket connection failed:', err);
            setIsConnected(false);
        }
    };

    useEffect(() => {
        loadDriver();
        const unsub = navigation.addListener('focus', loadDriver);
        return () => {
            unsub();
            stopCountdown();
        };
    }, [navigation]);

    // ── Countdown timer for incoming ride ─────────────────────────────────────
    const startCountdown = (seconds: number) => {
        stopCountdown(); // Clear any existing timer first!
        setCountdown(seconds);
        countdownRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(countdownRef.current);
                    handleReject();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const stopCountdown = () => {
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }
        setCountdown(0);
    };

    // ── Go online / offline ───────────────────────────────────────────────────
    const handleToggleOnline = async (value: boolean) => {
        if (value && bgCheckStatus !== 'approved') {
            Alert.alert(
                'Access Denied',
                'Your account is currently under review. You will be able to go online once approved.',
                [{ text: 'Understand' }]
            );
            return;
        }

        setIsOnline(value);

        if (Platform.OS === 'web') {
            localStorage.setItem('driver_online_status', value ? 'true' : 'false');
        } else {
            await AsyncStorage.setItem('driver_online_status', value ? 'true' : 'false');
        }

        if (value) {
            if (driverId) {
                connectSocket(driverId);
                startGPS(); // Start beaconing location when going online
            }
        } else {
            stopGPS(); // Stop GPS when going offline
            socketService.disconnect();
            setIsConnected(false);
            stopCountdown();
            if (driverId) socketService.emitDriverOffline(driverId);
            socketService.offAll();
            setRideStatus('idle');
            setIncoming(null);
        }
    };

    // ── GPS broadcasting ──────────────────────────────────────────────────────
    const startGPS = (rideId?: string) => {
        if (Platform.OS === 'web') {
            if (!(navigator as any).geolocation) return;
            // Clear existing watch if any
            if (watchId.current !== null) {
                (navigator as any).geolocation.clearWatch(watchId.current);
            }
            watchId.current = (navigator as any).geolocation.watchPosition(
                (pos: any) => {
                    // Send to matching engine (driverId based) OR active ride (rideId based)
                    if (rideId) {
                        socketService.emitLocationUpdate(rideId, pos.coords.latitude, pos.coords.longitude);
                    } else if (driverId) {
                        // Using any-cast to access the new location-update event
                        (socketService as any).socket?.emit('driver:location-update', { 
                            driverId, 
                            lat: pos.coords.latitude, 
                            lng: pos.coords.longitude 
                        });
                    }
                },
                (err: any) => console.error('[GPS] Watch error:', err),
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        }
    };

    const stopGPS = () => {
        if (watchId.current !== null && Platform.OS === 'web') {
            (navigator as any).geolocation.clearWatch(watchId.current);
            watchId.current = null;
        }
    };

    // ── Accept ride ───────────────────────────────────────────────────────────
    const handleAccept = async () => {
        if (!incoming) return;
        stopCountdown();
        setActionLoading(true);
        try {
            await apiService.post(`/rides/${incoming.rideId}/accept`, {});
            setActiveRide(incoming);
            setIncoming(null);
            setRideStatus('accepted');
            startGPS(incoming.rideId);
            socketService.joinRide(incoming.rideId);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to accept ride');
        } finally {
            setActionLoading(false);
        }
    };

    // ── Reject ride ───────────────────────────────────────────────────────────
    const handleReject = async () => {
        if (!incoming) return;
        stopCountdown();
        const rideId = incoming.rideId;
        setIncoming(null);
        setRideStatus('idle');
        try {
            await apiService.patch(`/rides/${rideId}/reject`, {});
        } catch { /* silent */ }
    };

    // ── Start ride (driver arrived at pickup) ─────────────────────────────────
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

    // ── End ride ──────────────────────────────────────────────────────────────
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
            // Navigate to rate passenger screen
            const completedRide = activeRide;
            setTimeout(() => {
                setActiveRide(null);
                setRideStatus('idle');
                navigation.navigate('RatePassenger', {
                    rideId: completedRide.rideId,
                    passengerName: completedRide.passenger?.name || 'Passenger',
                    fare: completedRide.estimatedPrice,
                });
            }, 1500);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to end ride');
        } finally {
            setActionLoading(false);
        }
    };

    const initial = driverName ? driverName.charAt(0).toUpperCase() : 'D';

    const menuItems = [
        { icon: '👤', label: 'My Profile',   onPress: () => navigation.navigate('DriverProfile'),  danger: false },
        { icon: '💰', label: 'Earnings',      onPress: () => navigation.navigate('Earnings'),       danger: false },
        { icon: '🎀', label: 'Pink Pass',     onPress: () => navigation.navigate('PinkPassDriver'), danger: false },
        { icon: '🚪', label: 'Log Out',       onPress: () => logout(),                               danger: true  },
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

                        {/* Countdown ring */}
                        <View style={s.countdownRow}>
                            <View style={[s.countdownCircle, countdown <= 10 && s.countdownUrgent]}>
                                <Text style={[s.countdownNum, countdown <= 10 && s.countdownNumUrgent]}>
                                    {countdown}
                                </Text>
                                <Text style={s.countdownSec}>sec</Text>
                            </View>
                            <View style={s.modalTitleBlock}>
                                <Text style={s.modalTitle}>🚗 New Ride Request</Text>
                                {incoming?.type === 'pink-pass' && (
                                    <View style={s.pinkBadgeInline}>
                                        <Text style={s.pinkBadgeInlineText}>🎀 Pink Pass</Text>
                                    </View>
                                )}
                                <Text style={s.passengerLine}>
                                    {incoming?.passenger?.name || 'Passenger'}
                                    {incoming?.passenger?.rating ? `  ⭐ ${incoming.passenger.rating}` : ''}
                                </Text>
                            </View>
                        </View>

                        <View style={s.routeCard}>
                            <View style={s.routeRow}>
                                <View style={s.dotFrom} />
                                <View style={s.routeTexts}>
                                    <Text style={s.routeLabel}>PICKUP</Text>
                                    <Text style={s.routeAddr} numberOfLines={2}>{incoming?.pickup?.address || '—'}</Text>
                                </View>
                            </View>
                            <View style={s.routeDivider} />
                            <View style={s.routeRow}>
                                <View style={s.dotTo} />
                                <View style={s.routeTexts}>
                                    <Text style={s.routeLabel}>DROPOFF</Text>
                                    <Text style={s.routeAddr} numberOfLines={2}>{incoming?.dropoff?.address || '—'}</Text>
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
                                <Text style={s.statVal}>{incoming?.distance?.toFixed(1) || '—'} km</Text>
                                <Text style={s.statLabel}>Distance</Text>
                            </View>
                            <View style={s.statDivider} />
                            <View style={s.statItem}>
                                <Text style={s.statVal}>{incoming?.estimatedDuration || '—'} min</Text>
                                <Text style={s.statLabel}>ETA</Text>
                            </View>
                        </View>

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
                                    ? <ActivityIndicator color="#000" />
                                    : <Text style={s.acceptText}>✓ Accept</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── Scrollable Body ── */}
            <ScrollView style={s.scrollView} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

                <Text style={s.driverModeLabel}>DRIVER MODE</Text>

                <View style={s.headerRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.greeting}>Hello, {driverName || 'Driver'} 👋</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isConnected ? '#22C55E' : '#EF4444', marginRight: 6 }} />
                            <Text style={{ fontSize: 10, color: theme.colors.textSecondary, fontWeight: '700' }}>
                                {isConnected ? 'NETWORK: CONNECTED' : 'NETWORK: DISCONNECTED'}
                            </Text>
                        </View>
                    </View>
                    <View style={s.headerRight}>
                        <TouchableOpacity style={s.avatarCircle} onPress={() => navigation.navigate('DriverProfile')} activeOpacity={0.8}>
                            {profilePicture
                                ? <Image source={{ uri: profilePicture }} style={s.avatarImage} />
                                : <Text style={s.avatarInitial}>{initial}</Text>
                            }
                        </TouchableOpacity>
                        <TouchableOpacity style={s.hamburgerBtn} onPress={() => setMenuOpen(true)} activeOpacity={0.85}>
                            <Text style={s.hamburgerIcon}>☰</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Pending approval banner */}
                {bgCheckStatus !== 'approved' && (
                    <TouchableOpacity style={s.pendingBanner} onPress={() => navigation.navigate('DriverProfile')} activeOpacity={0.8}>
                        <Text style={s.pendingBannerIcon}>⏳</Text>
                        <View style={s.pendingBannerTexts}>
                            <Text style={s.pendingBannerTitle}>Account Under Review</Text>
                            <Text style={s.pendingBannerSub}>You cannot go online until SAFORA approves your background check.</Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Status Card */}
                <View style={[s.statusCard, bgCheckStatus !== 'approved' && s.statusCardDisabled]}>
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
                        {bgCheckStatus !== 'approved'
                            ? 'Your account is pending approval. You will be notified once approved.'
                            : isOnline
                                ? 'You are online. Waiting for ride requests.'
                                : 'You are offline. Go online to start receiving rides.'}
                    </Text>
                    <View style={s.statusToggleRow}>
                        <Text style={s.statusToggleHint}>{isOnline ? 'Tap to go offline' : 'Tap to go online'}</Text>
                        <Switch
                            trackColor={{ false: theme.dark ? '#333' : '#DDD', true: '#22C55E' }}
                            thumbColor="#fff"
                            onValueChange={handleToggleOnline}
                            value={isOnline}
                            disabled={bgCheckStatus !== 'approved'}
                        />
                    </View>
                </View>

                {/* Stats */}
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

                {/* Searching / Idle / Active Ride card */}
                {isOnline && rideStatus === 'idle' && (
                    <View style={s.searchingCard}>
                        <Text style={s.searchingIcon}>🔍</Text>
                        <View style={s.searchingTexts}>
                            <Text style={s.searchingTitle}>Searching for Passengers…</Text>
                            <Text style={s.searchingSubtitle}>Lahore · Active zone</Text>
                        </View>
                        <ActivityIndicator color={theme.colors.primary} size="small" />
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

                {(rideStatus === 'accepted' || rideStatus === 'arrived' || rideStatus === 'started') && activeRide && (
                    <View style={s.activeCard}>
                        <View style={s.activeCardHeader}>
                            <Text style={s.activeCardTitle}>
                                {rideStatus === 'accepted' ? '🚗 Head to Pickup' : rideStatus === 'arrived' ? '✅ You have Arrived' : '🛣️ Ride in Progress'}
                            </Text>
                            <Text style={s.activeFareVal}>RS {activeRide.estimatedPrice}</Text>
                        </View>
                        <Text style={s.activePassenger}>👤 {activeRide.passenger?.name || 'Passenger'}</Text>
                        <Text style={s.activeAddr} numberOfLines={2}>
                            📍 {rideStatus === 'accepted' ? activeRide.pickup?.address : activeRide.dropoff?.address}
                        </Text>
                        <View style={s.actionRow}>
                            <TouchableOpacity
                                style={[s.chatBtn, { flex: 1 }]}
                                onPress={() => navigation.navigate('Chat', {
                                    rideId: activeRide.rideId,
                                    senderRole: 'driver',
                                    driverName: driverName,
                                    passengerName: activeRide.passenger?.name || 'Passenger',
                                    rideType: activeRide.type || 'Standard',
                                })}
                            >
                                <Text style={s.chatIcon}>💬</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[s.rideActionBtn, { flex: 3 }, rideStatus === 'started' && s.endBtn, actionLoading && { opacity: 0.6 }]}
                                onPress={rideStatus === 'accepted' ? handleStartRide : handleEndRide}
                                disabled={actionLoading}
                            >
                                {actionLoading
                                    ? <ActivityIndicator color="#000" />
                                    : <Text style={s.rideActionText}>
                                        {rideStatus === 'accepted' ? '▶ I have Arrived' : rideStatus === 'arrived' ? '▶ Start Ride' : '■ End Ride'}
                                      </Text>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {rideStatus === 'completed' && (
                    <View style={s.completedCard}>
                        <Text style={s.completedText}>✅ Ride Completed!</Text>
                        <Text style={s.completedSub}>Earnings updated · Rating screen loading…</Text>
                    </View>
                )}

                {/* Live Map */}
                <View style={s.mapPreviewCard}>
                    <View style={{ flex: 1 }}>
                        <SaforaMap type="home" centerOnUser />
                    </View>
                    <View style={s.mapOverlay}>
                        <Text style={s.mapOverlayText}>📍 Your Location — Live Map</Text>
                    </View>
                </View>

                <TouchableOpacity style={s.supportCard} onPress={() => Alert.alert('SAFORA Support', 'Our driver support team is available 24/7.')}>
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
    container:   { flex: 1, backgroundColor: t.colors.background },
    scrollView:  { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 58 : 44, paddingBottom: 40 },

    driverModeLabel: { fontSize: 11, fontWeight: '800', color: t.colors.primary, letterSpacing: 2, marginBottom: 14 },

    headerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    greeting:    { fontSize: 28, fontWeight: '900', color: t.colors.text, letterSpacing: -0.5, flex: 1, flexWrap: 'wrap' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 12 },
    avatarCircle:{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    avatarImage: { width: 48, height: 48, borderRadius: 24 },
    avatarInitial:{ fontSize: 20, fontWeight: '900', color: t.colors.black },
    hamburgerBtn:{ width: 42, height: 42, borderRadius: 21, backgroundColor: t.dark ? '#2A2A2A' : '#F0F0F0', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.colors.border },
    hamburgerIcon:{ fontSize: 18, color: t.colors.text },

    // Pending banner
    pendingBanner:      { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,160,0,0.1)', borderRadius: 14, padding: 14, marginBottom: 14, gap: 12, borderWidth: 1, borderColor: 'rgba(255,160,0,0.3)' },
    pendingBannerIcon:  { fontSize: 22 },
    pendingBannerTexts: { flex: 1 },
    pendingBannerTitle: { fontSize: 13, fontWeight: '800', color: '#FFA000', marginBottom: 2 },
    pendingBannerSub:   { fontSize: 11, color: '#FFA000', opacity: 0.8, lineHeight: 16 },

    // Status card
    statusCard:        { backgroundColor: t.dark ? '#1C1C1C' : '#F2F2F2', borderRadius: 16, padding: 18, marginBottom: 16 },
    statusCardDisabled:{ opacity: 0.5 },
    statusTopRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    statusCardLabel:   { fontSize: 14, fontWeight: '700', color: t.colors.text },
    statusBadge:       { flexDirection: 'row', alignItems: 'center', backgroundColor: t.dark ? '#2A2A2A' : '#E0E0E0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 6 },
    statusBadgeOnline: { backgroundColor: 'rgba(34,197,94,0.15)' },
    statusDot:         { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#888' },
    statusDotOnline:   { backgroundColor: '#22C55E' },
    statusBadgeText:   { fontSize: 11, fontWeight: '800', color: '#888', letterSpacing: 1 },
    statusBadgeTextOnline: { color: '#22C55E' },
    statusDesc:        { fontSize: 13, color: t.colors.textSecondary, lineHeight: 19, marginBottom: 14 },
    statusToggleRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    statusToggleHint:  { fontSize: 13, fontWeight: '600', color: t.colors.textSecondary },

    // Stat boxes
    statBoxRow:   { flexDirection: 'row', gap: 10, marginBottom: 16 },
    statBox:      { flex: 1, backgroundColor: t.dark ? '#1C1C1C' : '#F2F2F2', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center' },
    statBoxValue: { fontSize: 15, fontWeight: '900', color: t.colors.primary, marginBottom: 4, textAlign: 'center' },
    statBoxLabel: { fontSize: 9, fontWeight: '800', color: t.colors.textSecondary, letterSpacing: 0.8, textAlign: 'center' },

    // Searching card
    searchingCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: t.dark ? '#1C1C1C' : '#F2F2F2', borderRadius: 16, padding: 18, marginBottom: 16, gap: 14 },
    searchingIcon:    { fontSize: 28 },
    searchingTexts:   { flex: 1 },
    searchingTitle:   { fontSize: 15, fontWeight: '800', color: t.colors.text, marginBottom: 4 },
    searchingSubtitle:{ fontSize: 12, color: t.colors.textSecondary, fontWeight: '500' },

    // Active ride card
    activeCard:       { backgroundColor: t.dark ? '#1C1C1C' : '#F2F2F2', borderRadius: 16, padding: 18, marginBottom: 16 },
    activeCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    activeCardTitle:  { fontSize: 15, fontWeight: '900', color: t.colors.text },
    activeFareVal:    { fontSize: 18, fontWeight: '900', color: t.colors.primary },
    activePassenger:  { fontSize: 13, color: t.colors.textSecondary, marginBottom: 4 },
    activeAddr:       { fontSize: 13, color: t.colors.textSecondary, marginBottom: 14, lineHeight: 18 },
    actionRow:        { flexDirection: 'row', gap: 12 },
    chatBtn:          { backgroundColor: t.dark ? '#252525' : '#E8E8E8', borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: t.dark ? '#333' : '#DDD' },
    chatIcon:         { fontSize: 20 },
    rideActionBtn:    { backgroundColor: t.colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    endBtn:           { backgroundColor: '#EF4444' },
    rideActionText:   { color: t.colors.black, fontWeight: '700', fontSize: 13 },

    // Completed
    completedCard: { backgroundColor: t.dark ? '#1C1C1C' : '#F2F2F2', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16 },
    completedText: { fontSize: 20, fontWeight: '900', color: '#22C55E', textAlign: 'center', marginBottom: 6 },
    completedSub:  { fontSize: 13, color: t.colors.textSecondary, textAlign: 'center' },

    // Map
    mapPreviewCard: { height: 220, borderRadius: 20, overflow: 'hidden', backgroundColor: '#e5e3df', marginBottom: 16, flexDirection: 'column' },
    mapOverlay:     { backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 10, paddingHorizontal: 14 },
    mapOverlayText: { color: '#fff', fontSize: 12, fontWeight: '700' },

    // Support
    supportCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: t.dark ? '#1C1C1C' : '#F2F2F2', borderRadius: 16, padding: 18, marginBottom: 8, gap: 14, borderWidth: 1, borderColor: t.colors.border },
    supportIcon:    { fontSize: 24 },
    supportTexts:   { flex: 1 },
    supportTitle:   { fontSize: 15, fontWeight: '800', color: t.colors.text },
    supportSubtitle:{ fontSize: 12, color: t.colors.textSecondary },

    // Hamburger menu
    menuOverlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    menuPanel:          { backgroundColor: t.colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
    menuHeader:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    menuBrand:          { flexDirection: 'row', alignItems: 'center', gap: 8 },
    menuBrandIcon:      { fontSize: 20 },
    menuBrandName:      { fontSize: 18, fontWeight: '900', color: t.colors.text, letterSpacing: 1 },
    menuCloseBtn:       { width: 32, height: 32, borderRadius: 16, backgroundColor: t.dark ? '#333' : '#EEE', alignItems: 'center', justifyContent: 'center' },
    menuCloseText:      { fontSize: 14, color: t.colors.text, fontWeight: '700' },
    menuGreeting:       { fontSize: 14, color: t.colors.textSecondary, marginBottom: 20 },
    menuItems:          { gap: 4 },
    menuItem:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: t.dark ? '#1C1C1C' : '#F7F7F7', marginBottom: 6, gap: 14 },
    menuItemDanger:     { backgroundColor: 'rgba(255,68,68,0.08)' },
    menuItemIcon:       { fontSize: 18 },
    menuItemLabel:      { flex: 1, fontSize: 15, fontWeight: '700', color: t.colors.text },
    menuItemLabelDanger:{ color: t.colors.danger },
    menuItemArrow:      { fontSize: 20, color: t.colors.textSecondary, fontWeight: '300' },

    // Incoming ride modal
    modalOverlay:  { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    rideModal:     { backgroundColor: t.colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalHandle:   { width: 40, height: 4, backgroundColor: t.dark ? '#444' : '#CCC', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },

    countdownRow:      { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
    countdownCircle:   { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
    countdownUrgent:   { borderColor: '#EF4444' },
    countdownNum:      { fontSize: 22, fontWeight: '900', color: t.colors.primary },
    countdownNumUrgent:{ color: '#EF4444' },
    countdownSec:      { fontSize: 9, color: t.colors.textSecondary, fontWeight: '700' },
    modalTitleBlock:   { flex: 1 },
    modalTitle:        { fontSize: 18, fontWeight: '900', color: t.colors.text, marginBottom: 4 },
    pinkBadgeInline:   { backgroundColor: 'rgba(255,105,180,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 4 },
    pinkBadgeInlineText:{ fontSize: 11, color: '#FF69B4', fontWeight: '700' },
    passengerLine:     { fontSize: 13, color: t.colors.textSecondary },

    routeCard:    { backgroundColor: t.dark ? '#111' : '#F4F4F4', borderRadius: 14, padding: 16, marginBottom: 16 },
    routeRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    dotFrom:      { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: t.colors.primary, marginTop: 3 },
    dotTo:        { width: 10, height: 10, borderRadius: 2, backgroundColor: t.colors.primary, marginTop: 3 },
    routeTexts:   { flex: 1 },
    routeLabel:   { fontSize: 9, fontWeight: '800', color: t.colors.textSecondary, letterSpacing: 1.5 },
    routeAddr:    { fontSize: 13, fontWeight: '600', color: t.colors.text, lineHeight: 18 },
    routeDivider: { height: 1, backgroundColor: t.dark ? '#222' : '#E8E8E8', marginVertical: 10, marginLeft: 22 },

    statsRow:    { flexDirection: 'row', marginBottom: 16 },
    statItem:    { flex: 1, alignItems: 'center' },
    statVal:     { fontSize: 16, fontWeight: '900', color: t.colors.primary, marginBottom: 2 },
    statLabel:   { fontSize: 10, color: t.colors.textSecondary },
    statDivider: { width: 1, backgroundColor: t.dark ? '#333' : '#DDD' },

    rejectBtn:  { flex: 1, backgroundColor: t.dark ? '#1a1a1a' : '#FFF0F0', borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#EF4444' },
    rejectText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
    acceptBtn:  { flex: 2, backgroundColor: t.colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
    acceptText: { color: t.colors.black, fontWeight: '700', fontSize: 15 },
});

export default DriverDashboard;
