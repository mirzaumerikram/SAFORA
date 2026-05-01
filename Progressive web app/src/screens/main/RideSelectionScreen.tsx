import React, { useState, useMemo } from 'react';
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
const RideSelectionScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();

    const [pickup]  = useState<string>(route.params?.pickup  || 'Gulberg II');
    const [dropoff] = useState<string>(route.params?.dropoff || 'DHA Phase 5');
    const [selected, setSelected] = useState<string>('eco');
    const [booking,  setBooking]  = useState<boolean>(false);

    const theme = useAppTheme();
    const s = useMemo(() => makeStyles(theme), [theme]);

    const selectedRide = rideTypes.find(r => r.id === selected)!;

    // -----------------------------------------------------------------------
    // Confirm handler
    // -----------------------------------------------------------------------
    const handleConfirm = async () => {
        setBooking(true);
        try {
            await apiService.post('/rides/book', {
                pickupLocation:  { address: pickup,  lat: 31.5204, lng: 74.3587 },
                dropoffLocation: { address: dropoff, lat: 31.4504, lng: 74.2667 },
                type: selected,
            });

            navigation.navigate('Searching', {
                pickup,
                dropoff,
                distance: '8.2 km',
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
                    distance: '8.2 km',
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
                <SaforaMap type="home" />

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
                    </View>
                </View>

                {/* Section label */}
                <Text style={s.sectionLabel}>CHOOSE RIDE TYPE</Text>

                {/* Ride type list */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={s.rideList}
                >
                    {rideTypes.map((ride) => {
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
                    <TouchableOpacity
                        style={[
                            s.confirmBtn,
                            selectedRide?.pink && s.confirmBtnPink,
                            booking && s.confirmBtnDisabled,
                        ]}
                        onPress={handleConfirm}
                        disabled={booking}
                        activeOpacity={0.88}
                    >
                        {booking ? (
                            <ActivityIndicator color={theme.colors.black} />
                        ) : (
                            <Text style={s.confirmText}>
                                Confirm {selectedRide?.name}{'  '}Rs {selectedRide?.price}
                            </Text>
                        )}
                    </TouchableOpacity>
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
