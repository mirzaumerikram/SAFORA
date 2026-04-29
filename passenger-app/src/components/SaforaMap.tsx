import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, Platform } from 'react-native';
import theme from '../utils/theme';

const { width, height } = Dimensions.get('window');

interface Coordinates {
    latitude: number;
    longitude: number;
}

interface SaforaMapProps {
    type?: 'home' | 'tracking';
    driverLocation?: Coordinates;
    pickupLocation?: Coordinates;
    dropoffLocation?: Coordinates;
    onLocationChange?: (location: Coordinates) => void;
}

// Lahore default center
const LAHORE_CENTER: Coordinates = { latitude: 31.5204, longitude: 74.3587 };

const SaforaMap: React.FC<SaforaMapProps> = ({
    type = 'home',
    driverLocation,
    pickupLocation,
    dropoffLocation,
    onLocationChange,
}) => {
    const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const watchRef = useRef<any>(null);

    useEffect(() => {
        let isMounted = true;

        const requestLocation = async () => {
            try {
                // Web platform uses browser Geolocation API
                if (Platform.OS === 'web') {
                    if (!navigator.geolocation) {
                        setLocationError('Geolocation not supported');
                        setLoading(false);
                        return;
                    }

                    // Get initial position
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            if (!isMounted) return;
                            const coords = {
                                latitude: pos.coords.latitude,
                                longitude: pos.coords.longitude,
                            };
                            setUserLocation(coords);
                            setLoading(false);
                            onLocationChange?.(coords);
                        },
                        (err) => {
                            if (!isMounted) return;
                            console.warn('[Map] Location error:', err.message);
                            setUserLocation(LAHORE_CENTER);
                            setLoading(false);
                        },
                        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
                    );

                    // Watch for position changes during tracking
                    if (type === 'tracking') {
                        watchRef.current = navigator.geolocation.watchPosition(
                            (pos) => {
                                if (!isMounted) return;
                                const coords = {
                                    latitude: pos.coords.latitude,
                                    longitude: pos.coords.longitude,
                                };
                                setUserLocation(coords);
                                onLocationChange?.(coords);
                            },
                            (err) => console.warn('[Map] Watch error:', err.message),
                            { enableHighAccuracy: true, distanceFilter: 10 }
                        );
                    }
                }
            } catch (err) {
                if (!isMounted) return;
                setUserLocation(LAHORE_CENTER);
                setLoading(false);
            }
        };

        requestLocation();

        return () => {
            isMounted = false;
            if (watchRef.current && Platform.OS === 'web') {
                navigator.geolocation.clearWatch(watchRef.current);
            }
        };
    }, [type]);

    const activeLocation = userLocation || LAHORE_CENTER;
    const displayDriver = driverLocation || (type === 'tracking' ? { latitude: activeLocation.latitude + 0.002, longitude: activeLocation.longitude + 0.002 } : null);

    if (loading) {
        return (
            <View style={[styles.map, styles.centered]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Getting your location...</Text>
            </View>
        );
    }

    return (
        <View style={styles.map}>
            {/* Map placeholder styled to match SAFORA dark theme */}
            <View style={styles.mapContent}>
                <Text style={styles.coordsText}>
                    {activeLocation.latitude.toFixed(4)}, {activeLocation.longitude.toFixed(4)}
                </Text>
                {locationError && <Text style={styles.errorText}>{locationError}</Text>}

                {type === 'home' && (
                    <View style={styles.markerContainer}>
                        <View style={styles.markerPulse} />
                        <View style={styles.markerInner} />
                        <Text style={styles.markerLabel}>You are here</Text>
                    </View>
                )}

                {type === 'tracking' && displayDriver && (
                    <View style={styles.trackingContainer}>
                        <View style={styles.driverMarker}>
                            <Text style={styles.carEmoji}>🚕</Text>
                        </View>
                        <View style={styles.destMarker}>
                            <View style={styles.destDot} />
                        </View>
                        <Text style={styles.trackingLabel}>
                            Driver: {displayDriver.latitude.toFixed(4)}, {displayDriver.longitude.toFixed(4)}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    map: {
        width: width,
        height: height,
        backgroundColor: '#0a0a0a',
    },
    centered: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    mapContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginTop: 10,
    },
    coordsText: {
        color: theme.colors.primary,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        opacity: 0.6,
        marginBottom: 20,
    },
    errorText: {
        color: '#ff6b6b',
        fontSize: 10,
        marginBottom: 8,
    },
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerPulse: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.primary,
        opacity: 0.2,
        position: 'absolute',
    },
    markerInner: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: theme.colors.primary,
        borderWidth: 3,
        borderColor: theme.colors.white,
    },
    markerLabel: {
        color: theme.colors.textSecondary,
        fontSize: 10,
        marginTop: 8,
    },
    trackingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 200,
        height: 200,
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
        position: 'absolute',
        top: '40%',
        left: '60%',
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
        position: 'absolute',
        top: '60%',
        left: '40%',
    },
    destDot: {
        flex: 1,
    },
    trackingLabel: {
        color: theme.colors.textSecondary,
        fontSize: 9,
        position: 'absolute',
        bottom: 0,
    },
});

export default SaforaMap;
