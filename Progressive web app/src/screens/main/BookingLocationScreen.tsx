import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    SafeAreaView,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { AppTheme } from '../../utils/theme';
import GooglePlacesInput from '../../components/GooglePlacesInput';
import SaforaMap from '../../components/SaforaMap';

interface LocationData {
    address: string;
    lat: number;
    lng: number;
}

const BookingLocationScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { theme } = useAppTheme();
    const { t } = useLanguage();
    const s = useMemo(() => makeStyles(theme), [theme]);

    const [pickupLocation, setPickupLocation] = useState<LocationData | null>(null);
    const [dropoffLocation, setDropoffLocation] = useState<LocationData | null>(null);
    const [loading, setLoading] = useState(false);

    // Get Google Maps API key from environment - you'll set this in your .env file
    const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

    if (!GOOGLE_MAPS_API_KEY) {
        return (
            <SafeAreaView style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={s.errorText}>⚠️ Google Maps API key not configured</Text>
                <Text style={s.errorSubtext}>
                    Please add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to your .env file
                </Text>
            </SafeAreaView>
        );
    }

    const handlePickupSelect = (location: LocationData) => {
        setPickupLocation(location);
    };

    const handleDropoffSelect = (location: LocationData) => {
        setDropoffLocation(location);
    };

    const handleSwapLocations = () => {
        const temp = pickupLocation;
        setPickupLocation(dropoffLocation);
        setDropoffLocation(temp);
    };

    const handleProceed = async () => {
        if (!pickupLocation || !dropoffLocation) {
            alert('Please enter both pickup and destination locations');
            return;
        }

        setLoading(true);
        try {
            // Navigate to RideSelection with the selected locations and coordinates
            navigation.navigate('RideSelection', {
                pickup: pickupLocation.address,
                dropoff: dropoffLocation.address,
                pickupCoords: {
                    latitude: pickupLocation.lat,
                    longitude: pickupLocation.lng,
                },
                dropoffCoords: {
                    latitude: dropoffLocation.lat,
                    longitude: dropoffLocation.lng,
                },
            });
        } catch (err) {
            console.warn('[BookingLocation] Navigation error:', err);
            alert('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={s.root}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* ── Map Background (top 30%) ─── */}
            <View style={s.mapContainer}>
                <SaforaMap
                    type="home"
                    pickupLocation={
                        pickupLocation
                            ? {
                                latitude: pickupLocation.lat,
                                longitude: pickupLocation.lng,
                            }
                            : undefined
                    }
                    dropoffLocation={
                        dropoffLocation
                            ? {
                                latitude: dropoffLocation.lat,
                                longitude: dropoffLocation.lng,
                            }
                            : undefined
                    }
                />

                {/* Back button */}
                <TouchableOpacity
                    style={s.backBtn}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.85}
                >
                    <Text style={s.backArrow}>←</Text>
                </TouchableOpacity>
            </View>

            {/* ── Location Input Panel ─── */}
            <View style={s.panel}>
                <View style={s.dragHandle} />

                {/* Section title */}
                <Text style={s.sectionTitle}>Where to?</Text>

                {/* Scrollable inputs */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={s.inputContainer}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Pickup Location */}
                    <View style={s.locationSection}>
                        <Text style={s.locationLabel}>Pickup Location</Text>
                        <GooglePlacesInput
                            placeholder="Enter pickup location"
                            onPlaceSelected={handlePickupSelect}
                            apiKey={GOOGLE_MAPS_API_KEY}
                            icon="🟢"
                        />
                        {pickupLocation && (
                            <View style={s.selectedLocation}>
                                <Text style={s.selectedText}>{pickupLocation.address}</Text>
                                <Text style={s.coordinates}>
                                    {pickupLocation.lat.toFixed(4)}, {pickupLocation.lng.toFixed(4)}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Swap button */}
                    <TouchableOpacity
                        style={s.swapBtn}
                        onPress={handleSwapLocations}
                        activeOpacity={0.8}
                    >
                        <Text style={s.swapIcon}>⇅</Text>
                    </TouchableOpacity>

                    {/* Dropoff Location */}
                    <View style={s.locationSection}>
                        <Text style={s.locationLabel}>Destination</Text>
                        <GooglePlacesInput
                            placeholder="Enter destination"
                            onPlaceSelected={handleDropoffSelect}
                            apiKey={GOOGLE_MAPS_API_KEY}
                            icon="🔴"
                        />
                        {dropoffLocation && (
                            <View style={s.selectedLocation}>
                                <Text style={s.selectedText}>{dropoffLocation.address}</Text>
                                <Text style={s.coordinates}>
                                    {dropoffLocation.lat.toFixed(4)}, {dropoffLocation.lng.toFixed(4)}
                                </Text>
                            </View>
                        )}
                    </View>
                </ScrollView>

                {/* Action Buttons */}
                <View style={s.actions}>
                    <TouchableOpacity
                        style={s.cancelBtn}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.8}
                    >
                        <Text style={s.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            s.proceedBtn,
                            (!pickupLocation || !dropoffLocation) && s.proceedBtnDisabled,
                        ]}
                        onPress={handleProceed}
                        disabled={!pickupLocation || !dropoffLocation || loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={s.proceedBtnText}>Continue</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const makeStyles = (theme: AppTheme) =>
    StyleSheet.create({
        root: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        mapContainer: {
            height: '30%',
            position: 'relative',
            backgroundColor: theme.colors.background,
        },
        backBtn: {
            position: 'absolute',
            top: 12,
            left: 12,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.colors.card,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10,
        },
        backArrow: {
            fontSize: 20,
            color: theme.colors.text,
            fontWeight: '600',
        },
        panel: {
            flex: 1,
            backgroundColor: theme.colors.card,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 12,
        },
        dragHandle: {
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: theme.colors.border,
            alignSelf: 'center',
            marginBottom: 12,
        },
        sectionTitle: {
            fontSize: 18,
            fontWeight: '700',
            color: theme.colors.text,
            marginBottom: 16,
            fontFamily: 'Inter-Bold',
        },
        inputContainer: {
            paddingBottom: 16,
        },
        locationSection: {
            marginBottom: 12,
        },
        locationLabel: {
            fontSize: 12,
            fontWeight: '600',
            color: theme.colors.textSecondary,
            textTransform: 'uppercase',
            marginBottom: 8,
            fontFamily: 'Inter-SemiBold',
        },
        selectedLocation: {
            marginTop: 8,
            paddingVertical: 10,
            paddingHorizontal: 10,
            backgroundColor: theme.colors.background,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.colors.primary,
        },
        selectedText: {
            fontSize: 13,
            fontWeight: '600',
            color: theme.colors.text,
            fontFamily: 'Inter-SemiBold',
        },
        coordinates: {
            fontSize: 11,
            color: theme.colors.textSecondary,
            marginTop: 4,
            fontFamily: 'Inter-Regular',
        },
        swapBtn: {
            alignSelf: 'center',
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
            marginVertical: 12,
            zIndex: 5,
        },
        swapIcon: {
            fontSize: 18,
            fontWeight: '600',
            color: '#fff',
        },
        actions: {
            flexDirection: 'row',
            gap: 12,
            marginTop: 16,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
        },
        cancelBtn: {
            flex: 1,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: theme.colors.cardSecondary,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: theme.colors.border,
        },
        cancelBtnText: {
            fontSize: 14,
            fontWeight: '600',
            color: theme.colors.text,
            fontFamily: 'Inter-SemiBold',
        },
        proceedBtn: {
            flex: 1,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: theme.colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
        },
        proceedBtnDisabled: {
            opacity: 0.5,
        },
        proceedBtnText: {
            fontSize: 14,
            fontWeight: '600',
            color: '#fff',
            fontFamily: 'Inter-SemiBold',
        },
        errorText: {
            fontSize: 16,
            fontWeight: '600',
            color: theme.colors.danger,
            textAlign: 'center',
            fontFamily: 'Inter-SemiBold',
        },
        errorSubtext: {
            fontSize: 14,
            color: theme.colors.textSecondary,
            textAlign: 'center',
            marginTop: 8,
            fontFamily: 'Inter-Regular',
        },
    });

export default BookingLocationScreen;
