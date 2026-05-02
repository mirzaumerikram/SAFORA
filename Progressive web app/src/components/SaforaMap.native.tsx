import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
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
}

const SIALKOT: Coordinates = { latitude: 32.4945, longitude: 74.5229 };

const darkMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#212121' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
    { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c2c2c' }] },
];

const SaforaMap: React.FC<SaforaMapProps> = ({
    type = 'home',
    driverLocation,
    pickupLocation,
    dropoffLocation,
}) => {
    const mapRef = useRef<MapView>(null);

    const center = pickupLocation || SIALKOT;

    // Animate map to follow driver when location updates
    useEffect(() => {
        if (driverLocation && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: driverLocation.latitude,
                longitude: driverLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }, 1000);
        }
    }, [driverLocation]);

    if (type === 'home') {
        return (
            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{ ...center, latitudeDelta: 0.015, longitudeDelta: 0.0121 }}
                customMapStyle={darkMapStyle}
            >
                <Marker coordinate={center}>
                    <View style={styles.markerContainer}>
                        <View style={styles.markerPulse} />
                        <View style={styles.markerInner} />
                    </View>
                </Marker>
            </MapView>
        );
    }

    // Tracking mode — show driver marker, destination marker, and route line
    const driverCoord  = driverLocation  || { latitude: center.latitude + 0.004, longitude: center.longitude + 0.004 };
    const dropoffCoord = dropoffLocation || { latitude: center.latitude - 0.004, longitude: center.longitude - 0.004 };

    return (
        <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{ ...driverCoord, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
            customMapStyle={darkMapStyle}
        >
            {/* Driver marker — moves in real-time */}
            <Marker coordinate={driverCoord} tracksViewChanges={false}>
                <View style={styles.driverMarker}>
                    <Text style={styles.carEmoji}>🚕</Text>
                </View>
            </Marker>

            {/* Passenger pickup */}
            <Marker coordinate={center} tracksViewChanges={false}>
                <View style={styles.pickupMarker}>
                    <View style={styles.pickupDot} />
                </View>
            </Marker>

            {/* Dropoff destination */}
            <Marker coordinate={dropoffCoord} tracksViewChanges={false}>
                <View style={styles.destMarker}>
                    <View style={styles.destDot} />
                </View>
            </Marker>

            {/* Route line: driver → pickup → dropoff */}
            <Polyline
                coordinates={[driverCoord, center, dropoffCoord]}
                strokeColor={theme.colors.primary}
                strokeWidth={4}
                lineDashPattern={[8, 4]}
            />
        </MapView>
    );
};

const styles = StyleSheet.create({
    map: { width, height },
    markerContainer: { alignItems: 'center', justifyContent: 'center' },
    markerPulse: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: theme.colors.primary, opacity: 0.2, position: 'absolute',
    },
    markerInner: {
        width: 14, height: 14, borderRadius: 7,
        backgroundColor: theme.colors.primary, borderWidth: 3, borderColor: '#fff',
    },
    driverMarker: {
        width: 40, height: 40, backgroundColor: theme.colors.primary,
        borderRadius: 12, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#fff',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4, shadowRadius: 4, elevation: 5,
    },
    carEmoji: { fontSize: 20 },
    pickupMarker: {
        width: 16, height: 16, borderRadius: 8,
        backgroundColor: '#00e676', borderWidth: 3, borderColor: '#fff',
        alignItems: 'center', justifyContent: 'center',
    },
    pickupDot: { flex: 1 },
    destMarker: {
        width: 16, height: 16, borderRadius: 3,
        backgroundColor: theme.colors.primary, borderWidth: 3, borderColor: '#fff',
        alignItems: 'center', justifyContent: 'center',
    },
    destDot: { flex: 1 },
});

export default SaforaMap;
