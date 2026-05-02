/**
 * SaforaMap — Real Google Maps on web, placeholder on native.
 *
 * Web:    Injects the Maps JS API once, then renders a <div> map with markers.
 * Native: Falls back to a styled placeholder (react-native-maps can be added later).
 */
import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, Dimensions,
    ActivityIndicator, Platform,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// ── Env key (must be EXPO_PUBLIC_ prefix to be bundled) ─────────────────────
const MAPS_KEY: string =
    (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY as string) || '';

// ── Types ────────────────────────────────────────────────────────────────────

interface Coordinates {
    latitude: number;
    longitude: number;
}

interface SaforaMapProps {
    type?:             'home' | 'tracking';
    driverLocation?:   Coordinates;
    pickupLocation?:   Coordinates;
    dropoffLocation?:  Coordinates;
    onLocationChange?: (location: Coordinates) => void;
}

const LAHORE: Coordinates = { latitude: 31.5204, longitude: 74.3587 };

// ── Web Google Maps loader (singleton) ──────────────────────────────────────

let _mapsLoaded = false;
let _mapsLoading = false;
const _mapsCallbacks: (() => void)[] = [];

function loadGoogleMapsScript(apiKey: string): Promise<void> {
    return new Promise((resolve) => {
        if (_mapsLoaded) { resolve(); return; }
        _mapsCallbacks.push(resolve);
        if (_mapsLoading) return;

        _mapsLoading = true;
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            _mapsLoaded = true;
            _mapsLoading = false;
            _mapsCallbacks.forEach(cb => cb());
            _mapsCallbacks.length = 0;
        };
        document.head.appendChild(script);
    });
}

// ── Component ────────────────────────────────────────────────────────────────

const SaforaMap: React.FC<SaforaMapProps> = ({
    type = 'home',
    driverLocation,
    pickupLocation,
    dropoffLocation,
    onLocationChange,
}) => {
    const mapDivRef   = useRef<HTMLDivElement | null>(null);
    const mapObjRef   = useRef<google.maps.Map | null>(null);
    const markersRef  = useRef<google.maps.Marker[]>([]);

    const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
    const [loading,      setLoading]      = useState(true);
    const [mapReady,     setMapReady]     = useState(false);

    // ── 1. Get user location ──────────────────────────────────────────────────
    useEffect(() => {
        if (Platform.OS !== 'web') { setLoading(false); return; }
        if (!navigator.geolocation) { setUserLocation(LAHORE); setLoading(false); return; }

        navigator.geolocation.getCurrentPosition(
            pos => {
                const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
                setUserLocation(c);
                onLocationChange?.(c);
                setLoading(false);
            },
            () => { setUserLocation(LAHORE); setLoading(false); },
            { enableHighAccuracy: true, timeout: 8000 }
        );

        let watchId: number | null = null;
        if (type === 'tracking') {
            watchId = navigator.geolocation.watchPosition(
                pos => {
                    const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
                    setUserLocation(c);
                    onLocationChange?.(c);
                },
                () => {},
                { enableHighAccuracy: true }
            );
        }
        return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); };
    }, [type]);

    // ── 2. Load Maps JS API ───────────────────────────────────────────────────
    useEffect(() => {
        if (Platform.OS !== 'web' || !MAPS_KEY) return;
        loadGoogleMapsScript(MAPS_KEY).then(() => setMapReady(true));
    }, []);

    // ── 3. Initialise the map once div + api + location are all ready ─────────
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        if (!mapReady || !mapDivRef.current || loading) return;
        if (mapObjRef.current) return; // already created

        const center = userLocation || LAHORE;

        const map = new google.maps.Map(mapDivRef.current, {
            center:    { lat: center.latitude, lng: center.longitude },
            zoom:      15,
            mapTypeControl:      false,
            streetViewControl:   false,
            fullscreenControl:   false,
            zoomControlOptions:  { position: google.maps.ControlPosition.RIGHT_CENTER },
            styles: [
                { elementType: 'geometry',          stylers: [{ color: '#f5f5f5' }] },
                { elementType: 'labels.icon',        stylers: [{ visibility: 'off' }] },
                { featureType: 'road',               elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
                { featureType: 'road.arterial',      elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
                { featureType: 'water',              elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
                { featureType: 'poi',                stylers: [{ visibility: 'off' }] },
            ],
        });
        mapObjRef.current = map;
    }, [mapReady, loading, userLocation]);

    // ── 4. Update markers whenever props change ───────────────────────────────
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        const map = mapObjRef.current;
        if (!map) return;

        // Clear old markers
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];

        const addMarker = (coords: Coordinates, label: string, color: string) => {
            const m = new google.maps.Marker({
                position: { lat: coords.latitude, lng: coords.longitude },
                map,
                label: { text: label, color: '#fff', fontWeight: '700', fontSize: '12px' },
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 14,
                    fillColor: color,
                    fillOpacity: 1,
                    strokeColor: '#fff',
                    strokeWeight: 2,
                },
            });
            markersRef.current.push(m);
            return m;
        };

        const center = userLocation || LAHORE;

        if (type === 'home') {
            addMarker(center, '●', '#F5C518');
            map.panTo({ lat: center.latitude, lng: center.longitude });
        }
        if (pickupLocation)  addMarker(pickupLocation,  'P', '#22C55E');
        if (dropoffLocation) addMarker(dropoffLocation, 'D', '#EF4444');
        if (driverLocation)  addMarker(driverLocation,  '🚗', '#F5C518');

        // Draw route line between pickup and dropoff
        if (pickupLocation && dropoffLocation) {
            const line = new google.maps.Polyline({
                path: [
                    { lat: pickupLocation.latitude,  lng: pickupLocation.longitude },
                    { lat: dropoffLocation.latitude, lng: dropoffLocation.longitude },
                ],
                geodesic:    true,
                strokeColor: '#F5C518',
                strokeOpacity: 0.9,
                strokeWeight: 4,
                map,
            });
            // Store it so we can clear it later (piggyback on markersRef)
            (markersRef.current as any[]).push({ setMap: (m: any) => line.setMap(m) });

            // Fit bounds
            const bounds = new google.maps.LatLngBounds();
            bounds.extend({ lat: pickupLocation.latitude,  lng: pickupLocation.longitude });
            bounds.extend({ lat: dropoffLocation.latitude, lng: dropoffLocation.longitude });
            map.fitBounds(bounds, 80);
        }
    }, [mapReady, userLocation, type, pickupLocation, dropoffLocation, driverLocation]);

    // ── Native fallback ───────────────────────────────────────────────────────
    if (Platform.OS !== 'web') {
        return (
            <View style={styles.fallback}>
                <Text style={styles.fallbackText}>🗺 Map</Text>
                <Text style={styles.fallbackSub}>Install react-native-maps for native</Text>
            </View>
        );
    }

    // ── Web loading state ─────────────────────────────────────────────────────
    if (loading || !mapReady) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color="#F5C518" />
                <Text style={styles.loadingText}>Loading map…</Text>
            </View>
        );
    }

    // ── Render the map div ────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            {/* @ts-ignore — ref on div, only rendered on web */}
            <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { width, height, backgroundColor: '#e5e3df' },
    loading: {
        width, height,
        backgroundColor: '#e5e3df',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: { color: '#666', fontSize: 13 },
    fallback: {
        width, height,
        backgroundColor: '#1a1a2e',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fallbackText: { fontSize: 32, marginBottom: 8 },
    fallbackSub: { color: '#888', fontSize: 12 },
});

export default SaforaMap;
