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
        pink: false,
    },
    {
        id: 'rickshaw',
        name: 'Auto Rickshaw',
        icon: '🛺',
        price: 180,
        desc: '3 Seats · 4 min away',
        pink: false,
    },
    {
        id: 'standard',
        name: 'Comfort AC',
        icon: '🚗',
        price: 280,
        desc: 'Sedan · 5 min away',
        pink: false,
    },
    {
        id: 'pink-pass',
        name: 'Pink',
        icon: '🎀',
        price: 250,
        desc: 'Women-Only · Verified Female Driver',
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

const isLocationAllowed = (coords: { latitude: number; longitude: number }) => {
    const { latitude: lat, longitude: lng } = coords;
    // Lahore Boundary (approx)
    const inLahore = (lat >= 31.2 && lat <= 31.7) && (lng >= 74.0 && lng <= 74.7);
    // Sialkot Boundary (approx)
    const inSialkot = (lat >= 32.3 && lat <= 32.7) && (lng >= 74.2 && lng <= 74.8);
    return inLahore || inSialkot;
};

// Resolves a coordinate from either the flat lat/lng route params (used on web,
// since the web build serializes params into the URL and a nested object param
// round trips back as the literal string "[object Object]") or a nested
// coords object (used on native, where params are passed in memory, no URL
// round trip). Falls back to the given default if neither yields real numbers.
const resolveCoords = (
    flatLat: unknown, flatLng: unknown,
    nested: unknown,
    fallback: Coordinates
): Coordinates => {
    const lat = Number(flatLat);
    const lng = Number(flatLng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { latitude: lat, longitude: lng };

    const n = nested as Partial<Coordinates> | undefined;
    if (n && Number.isFinite(Number(n.latitude)) && Number.isFinite(Number(n.longitude))) {
        return { latitude: Number(n.latitude), longitude: Number(n.longitude) };
    }
    return fallback;
};

// Reads the most recent booking stashed by BookingLocationScreen right before it
// navigated here. This is the primary coordinate source, not the URL route params,
// since localStorage survives a stale/bookmarked URL that dropped its query params
// entirely, which route params cannot. Only trusted if saved within the last hour,
// so an old leftover entry from a previous session is not mistaken for this trip.
const readStoredBooking = (): any => {
    try {
        if (typeof window === 'undefined' || !window.localStorage) return null;
        const raw = window.localStorage.getItem('safora_last_booking');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.savedAt || Date.now() - parsed.savedAt > 60 * 60 * 1000) return null;
        return parsed;
    } catch {
        return null;
    }
};

const RideSelectionScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const stored = useState(() => readStoredBooking())[0];

    const [pickup]  = useState<string>(stored?.pickup  || route.params?.pickup  || 'Gulberg II');
    const [dropoff] = useState<string>(stored?.dropoff || route.params?.dropoff || 'DHA Phase 5');

    const DEFAULT_PICKUP: Coordinates  = { latitude: 31.5204, longitude: 74.3587 };
    const DEFAULT_DROPOFF: Coordinates = { latitude: 31.4504, longitude: 74.2667 };

    const [pickupCoords, setPickupCoords] = useState<Coordinates>(() => resolveCoords(
        stored?.pickupLat ?? route.params?.pickupLat, stored?.pickupLng ?? route.params?.pickupLng, route.params?.pickupCoords,
        DEFAULT_PICKUP
    ));
    const [dropoffCoords, setDropoffCoords] = useState<Coordinates>(() => resolveCoords(
        stored?.dropoffLat ?? route.params?.dropoffLat, stored?.dropoffLng ?? route.params?.dropoffLng, route.params?.dropoffCoords,
        DEFAULT_DROPOFF
    ));

    // If real coordinates never arrived from navigation (e.g. an old bookmarked or
    // history URL from before coordinates were passed as route params), silently
    // matching drivers against a fixed fallback point can search an entirely wrong
    // city with no visible error. As a safety net, geocode the typed address text
    // instead once the Maps script is available, so a stale link degrades to a
    // real lookup rather than a wrong, silent default.
    useEffect(() => {
        const pickupIsFallback  = pickupCoords.latitude  === DEFAULT_PICKUP.latitude  && pickupCoords.longitude  === DEFAULT_PICKUP.longitude;
        const dropoffIsFallback = dropoffCoords.latitude === DEFAULT_DROPOFF.latitude && dropoffCoords.longitude === DEFAULT_DROPOFF.longitude;
        if (!pickupIsFallback && !dropoffIsFallback) return;

        let cancelled = false;
        let attempts = 0;

        const tryGeocode = () => {
            if (cancelled) return;
            const g = (window as any).google;
            if (!g?.maps?.Geocoder) {
                attempts += 1;
                if (attempts < 20) setTimeout(tryGeocode, 300);
                return;
            }
            const geocoder = new g.maps.Geocoder();
            if (pickupIsFallback) {
                geocoder.geocode({ address: pickup }, (results: any, status: string) => {
                    if (cancelled || status !== 'OK' || !results?.[0]) return;
                    const loc = results[0].geometry.location;
                    setPickupCoords({ latitude: loc.lat(), longitude: loc.lng() });
                });
            }
            if (dropoffIsFallback) {
                geocoder.geocode({ address: dropoff }, (results: any, status: string) => {
                    if (cancelled || status !== 'OK' || !results?.[0]) return;
                    const loc = results[0].geometry.location;
                    setDropoffCoords({ latitude: loc.lat(), longitude: loc.lng() });
                });
            }
        };
        tryGeocode();

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const [selected, setSelected] = useState<string>('eco');
    const [booking,  setBooking]  = useState<boolean>(false);
    const [isPinkVerified, setIsPinkVerified] = useState<boolean>(false);

    // Dynamic pricing state
    const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);

    // Model-backed price quotes, keyed by ride type id. Fetched for every ride type
    // once the route is known, so the number shown in the list and the number shown
    // on the Confirm button are always the same verified quote, never two different
    // formulas producing two different prices for the same ride type.
    const [verifiedQuotes, setVerifiedQuotes] = useState<Record<string, { price: number; source: string }>>({});
    const [quoteLoading, setQuoteLoading] = useState<boolean>(false);

    useEffect(() => {
        const checkPinkPass = async () => {
            try {
                const res: any = await apiService.get('/pink-pass/status');
                // Strict check: Must be verified AND female
                if (res && res.pinkPassVerified && res.gender === 'female') {
                    setIsPinkVerified(true);
                } else {
                    setIsPinkVerified(false);
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

    // Update rideTypes with dynamic data. Prefer the model-verified quote for each
    // type once it has loaded, so this list always agrees with the Confirm button.
    const dynamicRideTypes = useMemo(() => {
        let list = rideTypes.map(ride => ({
            ...ride,
            price: verifiedQuotes[ride.id]?.price ?? getPricing(ride.id) ?? ride.price
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
    }, [routeInfo, selected, verifiedQuotes]);

    const selectedRide = dynamicRideTypes.find(r => r.id === selected)!;

    // Fetch a model-backed quote for every ride type as soon as the route is known,
    // so the price shown while browsing and the price shown on Confirm are always
    // the same verified number for whichever type is selected.
    useEffect(() => {
        if (!routeInfo) {
            setVerifiedQuotes({});
            return;
        }
        let cancelled = false;
        setQuoteLoading(true);
        Promise.all(
            rideTypes.map((rt) =>
                apiService
                    .post('/rides/estimate', {
                        distance: routeInfo.distance,
                        duration: routeInfo.duration,
                        type: rt.id,
                        pickupLocation: { lat: pickupCoords.latitude, lng: pickupCoords.longitude },
                    })
                    .then((resp: any) => {
                        if (resp?.success && typeof resp.estimatedPrice === 'number') {
                            return [rt.id, { price: Math.round(resp.estimatedPrice), source: resp.source }] as const;
                        }
                        return null;
                    })
                    .catch(() => null)
            )
        ).then((results) => {
            if (cancelled) return;
            const map: Record<string, { price: number; source: string }> = {};
            results.forEach((r) => { if (r) map[r[0]] = r[1]; });
            setVerifiedQuotes(map);
        }).finally(() => {
            if (!cancelled) setQuoteLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [routeInfo]);

    // Final price used for the actual booking: prefer the model-verified quote for
    // whichever type is selected, fall back to the instant local estimate if the
    // pricing model is unreachable.
    const selectedQuote = verifiedQuotes[selected];
    const finalPrice = selectedQuote?.price ?? selectedRide.price;

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
                estimatedPrice: finalPrice,
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

                                {/* Price */}
                                <View style={s.priceCol}>
                                    <Text style={[s.priceText, isSelected && !isPink && s.priceTextActive, isPink && s.priceTextPink]}>
                                        Rs {ride.price}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Confirm button */}
                <View style={s.footer}>
                    {routeInfo && (
                        <View style={s.breakdownRow}>
                            <Text style={s.breakdownText}>
                                {routeInfo.distance.toFixed(1)} km{'  ·  '}
                                {Math.round(routeInfo.duration)} min{'  ·  '}
                                Rs {selectedRide.price}
                            </Text>
                            <Text style={s.breakdownSource}>
                                {quoteLoading
                                    ? 'Verifying price…'
                                    : selectedQuote?.source === 'ai_model'
                                        ? 'AI verified price'
                                        : 'Estimated price'}
                            </Text>
                        </View>
                    )}
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
                            ) : !routeInfo || quoteLoading ? (
                                <ActivityIndicator color={theme.colors.black} />
                            ) : (
                                <Text style={s.confirmText}>
                                    Confirm {selectedRide?.name}{'  '}Rs {finalPrice}
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

        // Footer + confirm button
        footer: {
            paddingTop: 10,
            paddingBottom: Platform.OS === 'ios' ? 30 : 20,
        },
        breakdownRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
            paddingHorizontal: 2,
        },
        breakdownText: {
            fontSize: 12,
            color: t.colors.textSecondary,
        },
        breakdownSource: {
            fontSize: 11,
            fontWeight: t.fontWeight.bold,
            color: t.colors.textSecondary,
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
