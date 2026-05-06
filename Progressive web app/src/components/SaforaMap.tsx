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

// Maps API key — also in app.json for native builds (already public in the bundle)
const MAPS_KEY: string =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    'AIzaSyBbF5mP1xMstQI68UcyTS2JX9hibnafHRU';

// ── Types ────────────────────────────────────────────────────────────────────

interface Coordinates {
    latitude: number;
    longitude: number;
}

interface SaforaMapProps {
    type?:             'home' | 'tracking' | 'driver';
    centerOnUser?:     boolean;
    driverLocation?:   Coordinates;
    pickupLocation?:   Coordinates;
    dropoffLocation?:  Coordinates;
    onLocationChange?: (location: Coordinates) => void;
    onRouteInfo?:      (info: { distance: number; duration: number }) => void;
    onStatusChange?:   (status: string) => void;
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
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
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
    centerOnUser = false,
    driverLocation,
    pickupLocation,
    dropoffLocation,
    onLocationChange,
    onRouteInfo,
    onStatusChange,
}) => {
    const mapDivRef   = useRef<HTMLDivElement | null>(null);
    const mapObjRef   = useRef<google.maps.Map | null>(null);
    const markersRef  = useRef<google.maps.Marker[]>([]);
    const directionsServiceRef  = useRef<google.maps.DirectionsService | null>(null);
    const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

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

        // Final safety check: if the script is "loaded" but the object isn't ready
        if (typeof google === 'undefined' || !google.maps || !google.maps.Map) {
            console.warn('[SaforaMap] Google Maps API not fully initialized yet.');
            return;
        }

        const map = new google.maps.Map(mapDivRef.current, {
            center:    { lat: center.latitude, lng: center.longitude },
            zoom:      15,
            mapTypeControl:      false,
            streetViewControl:   false,
            fullscreenControl:   false,
            zoomControlOptions:  { 
                position: (google.maps.ControlPosition && google.maps.ControlPosition.RIGHT_CENTER) 
                          ? google.maps.ControlPosition.RIGHT_CENTER 
                          : 7 // Fallback to 7 (RIGHT_CENTER's value)
            },
            gestureHandling: 'greedy', // Unlock manual pan and zoom
            clickableIcons: false,
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

        // Init directions
        directionsServiceRef.current  = new google.maps.DirectionsService();
        directionsRendererRef.current = new google.maps.DirectionsRenderer({
            map,
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: '#F5C518',
                strokeWeight: 5,
                strokeOpacity: 0.8,
            }
        });
    }, [mapReady, loading, userLocation]);

    // ── 4. Update markers whenever props change ───────────────────────────────
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        const map = mapObjRef.current;
        if (!map) return;

        // Final safety check
        if (typeof google === 'undefined' || !google.maps || !google.maps.Marker) {
            return;
        }

        // Clear old markers
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];

        const addMarker = (coords: Coordinates, label: string, color: string) => {
            const m = new google.maps.Marker({
                position: { lat: coords.latitude, lng: coords.longitude },
                map,
                title: label,
                icon: `https://maps.google.com/mapfiles/ms/icons/${color}-dot.png`
            });
            markersRef.current.push(m);
            return m;
        };

        const center = userLocation || LAHORE;
        const hasCustomPoints = pickupLocation || dropoffLocation || driverLocation;

        if (type === 'home' || type === 'driver' || centerOnUser) {
            if (!hasCustomPoints) {
                addMarker(center, 'You', 'yellow');
                map.panTo({ lat: center.latitude, lng: center.longitude });
                // If it's a fresh load and we just found user, maybe zoom in
                if (userLocation && map.getZoom()! < 12) {
                    map.setZoom(15);
                }
            }
        }
        
        if (pickupLocation) {
            console.log('[SaforaMap] Adding Pickup Marker:', pickupLocation);
            addMarker(pickupLocation, 'Pickup', 'green');
        }
        if (dropoffLocation) {
            console.log('[SaforaMap] Adding Dropoff Marker:', dropoffLocation);
            addMarker(dropoffLocation, 'Dropoff', 'red');
        }
        if (driverLocation) {
            console.log('[SaforaMap] Adding Driver Marker:', driverLocation);
            addMarker(driverLocation, 'Driver', 'blue');
        }

        // Auto-fit bounds if we have multiple points
        if (map && (pickupLocation || dropoffLocation || driverLocation)) {
            const bounds = new google.maps.LatLngBounds();
            if (pickupLocation)  bounds.extend({ lat: pickupLocation.latitude,  lng: pickupLocation.longitude });
            if (dropoffLocation) bounds.extend({ lat: dropoffLocation.latitude, lng: dropoffLocation.longitude });
            if (driverLocation)  bounds.extend({ lat: driverLocation.latitude,  lng: driverLocation.longitude });
            
            // Only fit if we have more than one point or it's a tracking type
            if (type === 'tracking') {
                map.fitBounds(bounds, { top: 50, bottom: 250, left: 50, right: 50 });
            }
        }

        // Clear previous directions
        if (directionsRendererRef.current) {
            try {
                directionsRendererRef.current.setDirections({ routes: [] } as any);
            } catch (e) {
                // Fallback clear
                directionsRendererRef.current.setMap(null);
                directionsRendererRef.current.setMap(map);
            }
        }

        // Draw actual road route between pickup and dropoff
        if (pickupLocation && dropoffLocation && directionsServiceRef.current && directionsRendererRef.current) {
            console.log('[SaforaMap] Requesting route...', pickupLocation, dropoffLocation);
            
            directionsServiceRef.current.route({
                origin:      { lat: pickupLocation.latitude,  lng: pickupLocation.longitude },
                destination: { lat: dropoffLocation.latitude, lng: dropoffLocation.longitude },
                travelMode:  google.maps.TravelMode.DRIVING,
            }, (result, status) => {
                if (status === google.maps.DirectionsStatus.OK && result) {
                    console.log('[SaforaMap] Route found successfully');
                    directionsRendererRef.current?.setDirections(result);

                    // Send distance/duration back to parent for pricing
                    if (onRouteInfo && result.routes[0]?.legs[0]) {
                        const leg = result.routes[0].legs[0];
                        const distanceKm = (leg.distance?.value || 0) / 1000;
                        const durationMins = (leg.duration?.value || 0) / 60;
                        
                        console.log(`[SaforaMap] Route: ${distanceKm.toFixed(2)}km, ${durationMins.toFixed(1)}mins`);
                        onRouteInfo({
                            distance: distanceKm,
                            duration: durationMins
                        });
                    }
                } else {
                    console.error('[SaforaMap] Directions request failed. Status:', status);
                    
                    if (status === 'REQUEST_DENIED') {
                        console.warn('[SaforaMap] Hint: Check if Directions API is enabled for THIS specific API key in Google Cloud Console.');
                    }

                    // Fallback to straight line if directions fail
                    const line = new google.maps.Polyline({
                        path: [
                            { lat: pickupLocation.latitude,  lng: pickupLocation.longitude },
                            { lat: dropoffLocation.latitude, lng: dropoffLocation.longitude },
                        ],
                        strokeColor: '#F5C518',
                        strokeOpacity: 0.7,
                        strokeWeight: 4,
                        map,
                    });
                    (markersRef.current as any[]).push({ setMap: (m: any) => line.setMap(m) });
                }
            });
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
    container: { width: '100%', height: '100%', backgroundColor: '#e5e3df' },
    loading: {
        width: '100%', height: '100%',
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
