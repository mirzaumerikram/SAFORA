import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Platform,
    Keyboard,
} from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import { AppTheme } from '../utils/theme';

interface PlacePrediction {
    place_id: string;
    description: string;
    main_text: string;
    secondary_text?: string;
}

interface PlaceDetails {
    lat: number;
    lng: number;
    address: string;
}

interface GooglePlacesInputProps {
    placeholder?: string;
    onPlaceSelected: (place: PlaceDetails) => void;
    apiKey: string;
    icon?: string;
    initialValue?: string;
}

const GooglePlacesInput: React.FC<GooglePlacesInputProps> = ({
    placeholder = 'Enter location',
    onPlaceSelected,
    apiKey,
    icon = '📍',
    initialValue = '',
}) => {
    const { theme } = useAppTheme();
    const s = makeStyles(theme);

    const [input, setInput] = useState(initialValue);

    // Sync input if initialValue changes externally
    useEffect(() => {
        setInput(initialValue);
    }, [initialValue]);
    const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
    const [loading, setLoading] = useState(false);
    const [showPredictions, setShowPredictions] = useState(false);
    const debounceTimer = useRef<NodeJS.Timeout>();

    const fetchPredictions = async (text: string) => {
        if (text.length < 3) {
            setPredictions([]);
            return;
        }

        setLoading(true);
        
        // Try Fetch with Proxy first on Web - often more reliable than JS API for some keys
        if (Platform.OS === 'web') {
            try {
                let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${apiKey}&components=country:pk&sessiontoken=SAFORA_SESSION`;
                url = `https://corsproxy.io/?${encodeURIComponent(url)}`;

                const response = await fetch(url);
                const data = await response.json();

                if (data.status === 'OK' && data.predictions) {
                    const formatted = data.predictions.map((p: any) => ({
                        place_id: p.place_id,
                        description: p.description,
                        main_text: p.structured_formatting.main_text,
                        secondary_text: p.structured_formatting.secondary_text,
                    }));
                    setPredictions(formatted);
                    setShowPredictions(true);
                    setLoading(false);
                    return;
                } else if (data.status === 'REQUEST_DENIED') {
                    console.error('[GooglePlaces] API Key error or restricted:', data.error_message);
                } else if (data.status && data.status !== 'ZERO_RESULTS') {
                    console.warn('[GooglePlaces] Proxy Fetch Status:', data.status);
                }
            } catch (err) {
                console.warn('[GooglePlaces] Proxy Fetch error:', err);
            }
        }

        // Try JS API
        if (Platform.OS === 'web' && (window as any).google?.maps?.places) {
            try {
                const service = new (window as any).google.maps.places.AutocompleteService();
                service.getPlacePredictions(
                    {
                        input: text,
                        componentRestrictions: { country: 'pk' },
                    },
                    (results: any, status: any) => {
                        if (status === 'OK' && results) {
                            const formatted = results.map((p: any) => ({
                                place_id: p.place_id,
                                description: p.description,
                                main_text: p.structured_formatting.main_text,
                                secondary_text: p.structured_formatting.secondary_text,
                            }));
                            setPredictions(formatted);
                            setShowPredictions(true);
                        } else {
                            if (status !== 'ZERO_RESULTS') {
                                // alert('[DEBUG] Google Places Status: ' + status);
                            }
                            setPredictions([]);
                        }
                        setLoading(false);
                    }
                );
                return;
            } catch (err) {
                console.error('[GooglePlaces] Web Autocomplete error:', err);
            }
        }

        // Native fallback (iOS/Android)
        try {
            const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${apiKey}&components=country:pk&sessiontoken=SAFORA_SESSION`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.status === 'OK' && data.predictions) {
                const formatted = data.predictions.map((p: any) => ({
                    place_id: p.place_id,
                    description: p.description,
                    main_text: p.structured_formatting.main_text,
                    secondary_text: p.structured_formatting.secondary_text,
                }));
                setPredictions(formatted);
                setShowPredictions(true);
            } else {
                setPredictions([]);
            }
        } catch (err) {
            console.warn('[GooglePlaces] Native Autocomplete error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Debounced search handler
    const handleInputChange = (text: string) => {
        setInput(text);

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(() => {
            fetchPredictions(text);
        }, 300);
    };

    // Get place details (coordinates + formatted address)
    const handleSelectPlace = async (placeId: string, description: string) => {
        if (Platform.OS === 'web' && (window as any).google?.maps?.places) {
            try {
                // We need a dummy div for PlacesService on web
                const dummy = document.createElement('div');
                const service = new (window as any).google.maps.places.PlacesService(dummy);
                
                service.getDetails(
                    { placeId, fields: ['geometry', 'formatted_address'] },
                    (result: any, status: any) => {
                        if (status !== 'OK' || !result) return;
                        
                        onPlaceSelected({
                            lat: result.geometry.location.lat(),
                            lng: result.geometry.location.lng(),
                            address: description || result.formatted_address,
                        });

                        setInput(description || result.formatted_address);
                        setPredictions([]);
                        setShowPredictions(false);
                        Keyboard.dismiss();
                    }
                );
            } catch (err) {
                console.error('[GooglePlaces] Web Details error:', err);
            }
            return;
        }

        try {
            let url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${apiKey}&fields=geometry,formatted_address`;
            
            if (Platform.OS === 'web') {
                url = `https://corsproxy.io/?${encodeURIComponent(url)}`;
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error('Place details failed');

            const data = await response.json();
            const { geometry, formatted_address } = data.result;

            onPlaceSelected({
                lat: geometry.location.lat,
                lng: geometry.location.lng,
                address: description || formatted_address,
            });

            setInput(description || formatted_address);
            setPredictions([]);
            setShowPredictions(false);
            Keyboard.dismiss();
        } catch (err) {
            console.warn('[GooglePlaces] Native Place details error:', err);
        }
    };

    return (
        <View style={[s.container, (showPredictions && predictions.length > 0) && { zIndex: 9999 }]}>
            {/* Input field */}
            <View style={s.inputWrapper}>
                <Text style={s.icon}>{icon}</Text>
                <TextInput
                    style={s.input}
                    placeholder={placeholder}
                    placeholderTextColor={theme.colors.placeholder}
                    value={input}
                    onChangeText={handleInputChange}
                    onFocus={() => {
                        if (predictions.length > 0) setShowPredictions(true);
                    }}
                    onBlur={() => {
                        // Small delay to allow onPress of prediction items to fire
                        setTimeout(() => setShowPredictions(false), 200);
                    }}
                    editable={true}
                    autoCorrect={false}
                />
                {loading && <ActivityIndicator size="small" color={theme.colors.primary} />}
            </View>

            {/* Predictions dropdown */}
            {showPredictions && predictions.length > 0 && (
                <View style={s.predictionsContainer}>
                    <FlatList
                        data={predictions}
                        keyExtractor={(item) => item.place_id}
                        scrollEnabled={true}
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={s.predictionItem}
                                onPress={() => {
                                    handleSelectPlace(item.place_id, item.description);
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={s.predictionMain} numberOfLines={1}>{item.main_text}</Text>
                                {item.secondary_text && (
                                    <Text style={s.predictionSecondary} numberOfLines={1}>
                                        {item.secondary_text}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}
        </View>
    );
};

const makeStyles = (theme: AppTheme) =>
    StyleSheet.create({
        container: {
            width: '100%',
            position: 'relative',
        },
        inputWrapper: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.cardSecondary,
            borderRadius: 14,
            paddingHorizontal: 16,
            height: 52,
            borderWidth: 1.5,
            borderColor: theme.colors.border,
        },
        icon: {
            fontSize: 18,
            marginRight: 10,
        },
        input: {
            flex: 1,
            fontSize: 15,
            color: theme.colors.text,
            fontWeight: '500',
        },
        predictionsContainer: {
            position: 'absolute',
            top: 56,
            left: 0,
            right: 0,
            backgroundColor: theme.colors.card,
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: theme.colors.border,
            maxHeight: 280,
            zIndex: 9999,
            // Shadow for web
            ...Platform.select({
                web: {
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                },
                default: {
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 10,
                }
            })
        },
        predictionItem: {
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
        },
        predictionMain: {
            fontSize: 14,
            fontWeight: '700',
            color: theme.colors.text,
        },
        predictionSecondary: {
            fontSize: 12,
            color: theme.colors.textSecondary,
            marginTop: 2,
        },
    });

export default GooglePlacesInput;
