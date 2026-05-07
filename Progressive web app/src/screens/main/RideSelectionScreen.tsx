import React, { useState, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../utils/theme';
import SaforaMap from '../../components/SaforaMap';
import SaforaAlert from '../../utils/alert';
import apiService from '../../services/api';
import socketService from '../../services/socket.service';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Ride type data
// ---------------------------------------------------------------------------
const rideTypes = [
    {
        id: 'eco',
        name: 'Eco Bike',
        icon: '🏍️',
        price: 120,
        desc: 'Fastest · 3 min away',
        badge: '+6 min',
        pink: false,
    },
    {
        id: 'rickshaw',
        name: 'Auto Rickshaw',
        icon: '🛺',
        price: 180,
        desc: '3 Seats · 4 min away',
        badge: '-1 min',
        pink: false,
    },
    {
        id: 'standard',
        name: 'Comfort AC',
        icon: '🚗',
        price: 280,
        desc: 'Sedan · 5 min away',
        badge: '-2 min',
        pink: false,
    },
    {
        id: 'pink-pass',
        name: 'Pink',
        icon: '🎀',
        price: 250,
        desc: 'Women-Only · Verified Female Driver',
        badge: '+10 min',
        pink: true,
    },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface Coordinates {
    latitude: number;
    longitude: number;
}

const RideSelectionScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();

    const [pickup]  = useState<string>(route.params?.pickup  || 'Gulberg II');
    const [dropoff] = useState<string>(route.params?.dropoff || 'DHA Phase 5');
    const [pickupCoords] = useState<Coordinates>(route.params?.pickupCoords || { latitude: 31.5204, longitude: 74.3587 });
    const [dropoffCoords] = useState<Coordinates>(route.params?.dropoffCoords || { latitude: 31.4504, longitude: 74.2667 });
    const [selected, setSelected] = useState<string>('eco');
    const [booking,  setBooking]  = useState<boolean>(false);
    const [isPinkVerified, setIsPinkVerified] = useState<boolean>(false);

    // Dynamic pricing state
    const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);

    useEffect(() => {
        const checkPinkPass = async () => {
            try {
                const res: any = await apiService.get('/pink-pass/status');
                if (res && res.pinkPassVerified) {
                    setIsPinkVerified(true);
                }
            } catch (e) {
                console.log('Failed to check pink pass status', e);
            }
        };
        checkPinkPass();
    }, []);

    const { theme } = useAppTheme();
    const s = useMemo(() => makeStyles(theme), [theme]);

    // -----------------------------------------------------------------------
    // Pricing Logic (Predefined SAFORA Model)
    // -----------------------------------------------------------------------
    const getPricing = (typeId: string) => {
        if (!routeInfo) return null;

        const { distance, duration } = routeInfo;
        
        // Base SAFORA Linear AI Formula: (Distance * 35) + (Duration * 4) + 30
        const baseFare = (distance * 35) + (duration * 4) + 30;
        
        // Multipliers (Scientific Scaling)
        let multiplier = 0.8; // Eco Bike (Cheap)
        if (typeId === 'rickshaw') multiplier = 1.5;
        if (typeId === 'standard') multiplier = 2.0;
        if (typeId === 'pink-pass') multiplier = 2.0;

        // Surge (Dynamic Demand Factor)
        const hour = new Date().getHours();
        const isRushHour = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19);
        const surge = isRushHour ? 1.4 : 1.0;

        const finalPrice = Math.round(baseFare * multiplier * surge);
        
        // Minimum price protection (Realistic Pakistan rates)
        return Math.max(finalPrice, typeId === 'eco' ? 50 : typeId === 'rickshaw' ? 80 : 150);
    };

    // Update rideTypes with dynamic data
    const dynamicRideTypes = useMemo(() => {
        let list = rideTypes.map(ride => ({
            ...ride,
            price: getPricing(ride.id) || ride.price
        }));

        // Restriction: Bikes only allowed for within-city (distance < 40km)
        if (routeInfo && routeInfo.distance > 40) {
            list = list.filter(r => r.id !== 'eco');
            
            // If Eco was selected but now hidden, auto-select Standard
            if (selected === 'eco') {
                setSelected('standard');
            }
        }

        return list;
    }, [routeInfo, selected]);

    const selectedRide = dynamicRideTypes.find(r => r.id === selected)!;

    // -----------------------------------------------------------------------
    // Geofencing Check (Lahore & Sialkot Restriction)
    // -----------------------------------------------------------------------
    const isLocationAllowed = (coords: Coordinates) => {
        const { latitude: lat, longitude: lng } = coords;
        
        // Lahore Boundary (approx)
        const inLahore = (lat >= 31.2 && lat <= 31.7) && (lng >= 74.0 && lng <= 74.7);
        // Sialkot Boundary (approx)
        const inSialkot = (lat >= 32.3 && lat <= 32.7) && (lng >= 74.2 && lng <= 74.8);
        
        return inLahore || inSialkot;
    };

    // -----------------------------------------------------------------------
    // Confirm handler
    // -----------------------------------------------------------------------
    const handleConfirm = async () => {
        // Validate City Restriction
        if (!isLocationAllowed(pickupCoords) || !isLocationAllowed(dropoffCoords)) {
            SaforaAlert(
                'Service Unavailable', 
                'SAFORA is currently only operational in Lahore and Sialkot. Please select a location within these cities.'
            );
            return;
        }

        setBooking(true);
        try {
            const resp = await apiService.post('/rides/request', {
                pickupLocation:  { address: pickup,  lat: pickupCoords.latitude, lng: pickupCoords.longitude },
                dropoffLocation: { address: dropoff, lat: dropoffCoords.latitude, lng: dropoffCoords.longitude },
                type: selected,
                estimatedPrice: selectedRide.price,
                distance: routeInfo?.distance,
                estimatedDuration: routeInfo?.duration,
            });

            const rideId = resp.data?.ride?._id || resp.data?.ride?.id;
            
            // Join the ride room to receive socket updates
            if (rideId) {
                socketService.joinRide(rideId);
            }

            navigation.navigate('Searching', {
                rideId,
                pickup,
                dropoff,
                pickupCoords,
                dropoffCoords,
            });
        } catch (err: any) {
            // Network / backend unreachable — still proceed for demo
            if (
                err.message?.includes('Network') ||
                err.message?.includes('timeout') ||
                err.message?.includes('fetch')
            ) {
                navigation.navigate('Searching', {
                    pickup,
                    dropoff,
                    pickupCoords,
                    dropoffCoords,
                });
            } else {
                SaforaAlert('Booking Failed', err.message || 'Please try again.');
            }
        } finally {
            setBooking(false);
        }
    };

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (
        <View style={s.root}>
            {/* ── MAP (top ~45%) ─────────────────────────────────────── */}
            <View style={s.mapWrapper}>
                <SaforaMap 
                    type="home"
                    pickupLocation={pickupCoords}
                    dropoffLocation={dropoffCoords}
                    onRouteInfo={(info) => {
                        console.log('[RideSelection] Received route info:', info);
                        setRouteInfo(info);
                    }}
                />

                {/* Back button floating over map */}
                <TouchableOpacity
                    style={s.backBtn}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.85}
                >
                    <Text style={s.backArrow}>←</Text>
                </TouchableOpacity>
            </View>

            {/* ── BOTTOM PANEL ────────────────────────────────────────── */}
            <View style={s.panel}>
                {/* Route summary card */}
                <View style={s.routeCard}>
                    <View style={s.routeRow}>
                        <View style={s.yellowDot} />
                        <View style={s.routeTextCol}>
                            <Text style={s.routeFrom}>{pickup}</Text>
                            <View style={s.routeLine} />
                            <Text style={s.routeTo}>{dropoff}</Text>
                        </View>
                        {routeInfo && (
                            <View style={s.distanceBadge}>
                                <Text style={s.distanceText}>{routeInfo.distance.toFixed(1)} km</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Section label */}
                <Text style={s.sectionLabel}>CHOOSE RIDE TYPE</Text>

                {/* Ride type list */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={s.rideList}
                >
                    {dynamicRideTypes.map((ride) => {
                        const isSelected = selected === ride.id;
                        const isPink = ride.pink;

                        return (
                            <TouchableOpacity
                                key={ride.id}
                                style={[
                                    s.rideCard,
                                    isSelected && (isPink ? s.rideCardPinkActive : s.rideCardActive),
                                    !isSelected && s.rideCardInactive,
                                ]}
                                onPress={() => setSelected(ride.id)}
                                activeOpacity={0.8}
                            >
                                {/* Icon */}
                                <View style={[s.iconBox, isPink && s.iconBoxPink]}>
                                    <Text style={s.rideIcon}>{ride.icon}</Text>
                                </View>

                                {/* Info */}
                                <View style={s.rideInfo}>
                                    <Text style={[s.rideName, isPink && s.rideNamePink]}>
                                        {ride.name}
                                    </Text>
                                    <Text style={s.rideDesc}>{ride.desc}</Text>
                                </View>

                                {/* Price + badge */}
                                <View style={s.priceCol}>
                                    <Text style={[s.priceText, isSelected && !isPink && s.priceTextActive, isPink && s.priceTextPink]}>
                                        Rs {ride.price}
                                    </Text>
                                    <View style={[s.badge, isPink && s.badgePink]}>
                                        <Text style={[s.badgeText, isPink && s.badgeTextPink]}>
                                            {ride.badge}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Confirm button */}
                <View style={s.footer}>
                    {selected === 'pink-pass' && !isPinkVerified ? (
                        <TouchableOpacity
                            style={[s.confirmBtn, s.confirmBtnPink]}
                            onPress={() => navigation.navigate('PinkPass')}
                            activeOpacity={0.88}
                        >
                            <Text style={[s.confirmText, { color: '#FFF' }]}>Verify Pink Pass to Unlock 🎀</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[
                                s.confirmBtn,
                                selectedRide?.pink && s.confirmBtnPink,
                                booking && s.confirmBtnDisabled,
                            ]}
                            onPress={handleConfirm}
                            disabled={booking || !routeInfo}
                            activeOpacity={0.88}
                        >
                            {booking ? (
                                <ActivityIndicator color={theme.colors.black} />
                            ) : !routeInfo ? (
                                <ActivityIndicator color={theme.colors.black} />
                            ) : (
                                <Text style={s.confirmText}>
                                    Confirm {selectedRide?.name}{'  '}Rs {selectedRide?.price}
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
};

// ---------------------------------------------------------------------------
// Styles factory
// ---------------------------------------------------------------------------
const makeStyles = (t: AppTheme) => {
    const MAP_HEIGHT = SCREEN_HEIGHT * 0.45;
    const PANEL_RADIUS = 24;
    const PINK = '#FF69B4';
    const PINK_BG = 'rgba(255,105,180,0.12)';
    const PINK_BORDER = 'rgba(255,105,180,0.55)';

    return StyleSheet.create({
        // Root
        root: {
            flex: 1,
            backgroundColor: t.colors.background,
        },

        // Map section
        mapWrapper: {
            height: MAP_HEIGHT,
            overflow: 'hidden',
        },

        // Back button
        backBtn: {
            position: 'absolute',
            top: Platform.OS === 'ios' ? 56 : 44,
            left: 16,
            width: 42,
            height: 42,
            borderRadius: 14,
            backgroundColor: t.colors.white,
            alignItems: 'center',
            justifyContent: 'center',
            // shadow
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.18,
            shadowRadius: 8,
            elevation: 6,
        },
        backArrow: {
            fontSize: 20,
            color: t.colors.black,
            lineHeight: 22,
        },

        // Bottom panel
        panel: {
            flex: 1,
            backgroundColor: t.colors.card,
            borderTopLeftRadius: PANEL_RADIUS,
            borderTopRightRadius: PANEL_RADIUS,
            marginTop: -PANEL_RADIUS,
            paddingTop: 20,
            paddingHorizontal: 16,
            // shadow upward
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 10,
        },

        // Route summary card
        routeCard: {
            backgroundColor: t.colors.cardSecondary,
            borderRadius: t.borderRadius.md,
            padding: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: t.colors.border,
        },
        routeRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        yellowDot: {
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: t.colors.primary,
            marginTop: 2,
            alignSelf: 'flex-start',
        },
        routeTextCol: {
            flex: 1,
        },
        routeFrom: {
            fontSize: t.fontSize.sm,
            fontWeight: t.fontWeight.bold,
            color: t.colors.text,
            marginBottom: 4,
        },
        routeLine: {
            height: 1,
            backgroundColor: t.colors.divider,
            marginVertical: 5,
        },
        routeTo: {
            fontSize: t.fontSize.sm,
            fontWeight: t.fontWeight.medium,
            color: t.colors.textSecondary,
        },
        distanceBadge: {
            backgroundColor: 'rgba(245,197,24,0.15)',
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: t.colors.primary,
        },
        distanceText: {
            fontSize: 13,
            fontWeight: t.fontWeight.heavy,
            color: t.colors.primary,
        },

        // Section label
        sectionLabel: {
            fontSize: 11,
            fontWeight: t.fontWeight.heavy,
            color: t.colors.textSecondary,
            letterSpacing: 2,
            marginBottom: 10,
        },

        // Ride list
        rideList: {
            paddingBottom: 8,
            gap: 10,
        },

        // Ride card base
        rideCard: {
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: t.borderRadius.md,
            padding: 13,
            borderWidth: 1.5,
            gap: 12,
        },
        rideCardInactive: {
            backgroundColor: t.colors.cardSecondary,
            borderColor: t.colors.border,
        },
        rideCardActive: {
            backgroundColor: 'rgba(245,197,24,0.06)',
            borderColor: t.colors.primary,
        },
        rideCardPinkActive: {
            backgroundColor: PINK_BG,
            borderColor: PINK_BORDER,
        },

        // Icon box
        iconBox: {
            width: 48,
            height: 48,
            borderRadius: 14,
            backgroundColor: t.dark ? '#2A2A2A' : '#F0F0F0',
            alignItems: 'center',
            justifyContent: 'center',
        },
        iconBoxPink: {
            backgroundColor: PINK_BG,
        },
        rideIcon: {
            fontSize: 22,
        },

        // Ride info
        rideInfo: {
            flex: 1,
        },
        rideName: {
            fontSize: t.fontSize.sm,
            fontWeight: t.fontWeight.bold,
            color: t.colors.text,
            marginBottom: 3,
        },
        rideNamePink: {
            color: PINK,
        },
        rideDesc: {
            fontSize: 11,
            color: t.colors.textSecondary,
            lineHeight: 15,
        },

        // Price column
        priceCol: {
            alignItems: 'flex-end',
            gap: 5,
        },
        priceText: {
            fontSize: 15,
            fontWeight: t.fontWeight.heavy,
            color: t.colors.textSecondary,
        },
        priceTextActive: {
            color: t.colors.primary,
        },
        priceTextPink: {
            color: PINK,
        },

        // Badge
        badge: {
            backgroundColor: t.dark ? '#2A2A2A' : '#EFEFEF',
            borderRadius: 6,
            paddingHorizontal: 7,
            paddingVertical: 2,
        },
        badgePink: {
            backgroundColor: PINK_BG,
        },
        badgeText: {
            fontSize: 10,
            fontWeight: t.fontWeight.bold,
            color: t.colors.textSecondary,
        },
        badgeTextPink: {
            color: PINK,
        },

        // Footer + confirm button
        footer: {
            paddingTop: 10,
            paddingBottom: Platform.OS === 'ios' ? 30 : 20,
        },
        confirmBtn: {
            backgroundColor: t.colors.primary,
            borderRadius: t.borderRadius.md,
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'center',
        },
        confirmBtnPink: {
            backgroundColor: PINK,
        },
        confirmBtnDisabled: {
            opacity: 0.65,
        },
        confirmText: {
            color: t.colors.black,
            fontSize: t.fontSize.sm,
            fontWeight: t.fontWeight.bold,
            letterSpacing: 0.3,
        },
    });
};

export default RideSelectionScreen;
