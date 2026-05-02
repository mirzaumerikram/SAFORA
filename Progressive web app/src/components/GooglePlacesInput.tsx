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
}

const GooglePlacesInput: React.FC<GooglePlacesInputProps> = ({
    placeholder = 'Enter location',
    onPlaceSelected,
    apiKey,
    icon = '📍',
}) => {
    const { theme } = useAppTheme();
    const s = makeStyles(theme);

    const [input, setInput] = useState('');
    const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
    const [loading, setLoading] = useState(false);
    const [showPredictions, setShowPredictions] = useState(false);
    const debounceTimer = useRef<NodeJS.Timeout>();

    // Google Places Autocomplete API
    const fetchPredictions = async (text: string) => {
        if (text.length < 3) {
            setPredictions([]);
            return;
        }

        if (Platform.OS === 'web' && (window as any).google?.maps?.places) {
            try {
                setLoading(true);
                const service = new (window as any).google.maps.places.AutocompleteService();
                service.getPlacePredictions(
                    {
                        input: text,
                        componentRestrictions: { country: 'pk' },
                    },
                    (results: any, status: any) => {
                        if (status !== 'OK' || !results) {
                            setPredictions([]);
                            setLoading(false);
                            return;
                        }
                        const formatted = results.map((p: any) => ({
                            place_id: p.place_id,
                            description: p.description,
                            main_text: p.structured_formatting.main_text,
                            secondary_text: p.structured_formatting.secondary_text,
                        }));
                        setPredictions(formatted);
                        setShowPredictions(true);
                        setLoading(false);
                    }
                );
            } catch (err) {
                console.error('[GooglePlaces] Web Autocomplete error:', err);
                setLoading(false);
            }
            return;
        }

        // Native fallback or Web if API not yet loaded
        setLoading(true);
        try {
            const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${apiKey}&components=country:pk&sessiontoken=SAFORA_SESSION`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Autocomplete failed');

            const data = await response.json();
            if (!data.predictions) {
                setPredictions([]);
                return;
            }
            const formattedPredictions: PlacePrediction[] = data.predictions.map(
                (p: any) => ({
                    place_id: p.place_id,
                    description: p.description,
                    main_text: p.structured_formatting.main_text,
                    secondary_text: p.structured_formatting.secondary_text,
                })
            );

            setPredictions(formattedPredictions);
            setShowPredictions(true);
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
            const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${apiKey}&fields=geometry,formatted_address`;
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
        <View style={s.container}>
            {/* Input field */}
            <View style={s.inputWrapper}>
                <Text style={s.icon}>{icon}</Text>
                <TextInput
                    style={s.input}
                    placeholder={placeholder}
                    placeholderTextColor={theme.colors.textSecondary}
                    value={input}
                    onChangeText={handleInputChange}
                    onFocus={() => predictions.length > 0 && setShowPredictions(true)}
                    editable={true}
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
                                onPress={() =>
                                    handleSelectPlace(item.place_id, item.description)
                                }
                                activeOpacity={0.7}
                            >
                                <Text style={s.predictionMain}>{item.main_text}</Text>
                                {item.secondary_text && (
                                    <Text style={s.predictionSecondary}>
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
        },
        inputWrapper: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.card,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: theme.colors.border,
        },
        icon: {
            fontSize: 20,
            marginRight: 8,
        },
        input: {
            flex: 1,
            fontSize: 16,
            color: theme.colors.text,
            fontFamily: 'Inter-Regular',
        },
        predictionsContainer: {
            backgroundColor: theme.colors.card,
            borderRadius: 12,
            marginTop: 8,
            borderWidth: 1,
            borderColor: theme.colors.border,
            maxHeight: 250,
        },
        predictionItem: {
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
        },
        predictionMain: {
            fontSize: 14,
            fontWeight: '600',
            color: theme.colors.text,
            fontFamily: 'Inter-SemiBold',
        },
        predictionSecondary: {
            fontSize: 12,
            color: theme.colors.textSecondary,
            marginTop: 2,
            fontFamily: 'Inter-Regular',
        },
    });

export default GooglePlacesInput;
