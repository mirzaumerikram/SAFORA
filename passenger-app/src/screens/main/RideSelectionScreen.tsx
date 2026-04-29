import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, Dimensions, ActivityIndicator,
    TextInput, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import theme from '../../utils/theme';
import apiService from '../../services/api';

const { width } = Dimensions.get('window');

const rideTypes = [
    { id: 'eco',     name: 'Eco Bike',   price: 120, time: '3 min', icon: '🏍️', desc: 'Fastest for city traffic' },
    { id: 'standard',name: 'Comfort AC', price: 450, time: '5 min', icon: '🚗', desc: 'Sleek dark sedans' },
    { id: 'pink-pass',name: 'Pink Pass', price: 500, time: '6 min', icon: '🎀', desc: 'Female drivers only', promo: true },
];

const RideSelectionScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();

    const [pickup, setPickup]   = useState(route.params?.pickup  || '');
    const [dropoff, setDropoff] = useState(route.params?.dropoff || '');
    const [selected, setSelected] = useState('standard');
    const [booking, setBooking]   = useState(false);

    const selectedRide = rideTypes.find(r => r.id === selected)!;

    const handleConfirm = async () => {
        if (!pickup.trim() || !dropoff.trim()) {
            Alert.alert('Missing Info', 'Please enter pickup and dropoff locations');
            return;
        }
        setBooking(true);
        try {
            const response: any = await apiService.post('/rides/request', {
                pickupLocation:  { address: pickup.trim(),  lat: 32.4945, lng: 74.5229 },
                dropoffLocation: { address: dropoff.trim(), lat: 32.5100, lng: 74.5350 },
                type: selected,
            });

            // Navigate to payment selection before tracking
            navigation.navigate('Payment', {
                rideId:         response.ride?.id,
                estimatedPrice: response.ride?.estimatedPrice || selectedRide.price,
                pickup:         pickup.trim(),
                dropoff:        dropoff.trim(),
                rideType:       selected,
                rideName:       selectedRide.name,
            });
        } catch (err: any) {
            if (err.message?.includes('Network') || err.message?.includes('timeout')) {
                // Backend unreachable — go to payment with static price for demo
                navigation.navigate('Payment', {
                    rideId: null,
                    estimatedPrice: selectedRide.price,
                    pickup: pickup.trim(),
                    dropoff: dropoff.trim(),
                    rideType: selected,
                    rideName: selectedRide.name,
                });
            } else {
                Alert.alert('Booking Failed', err.message || 'Please try again');
            }
        } finally {
            setBooking(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>BOOK A RIDE</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Location Inputs */}
            <View style={styles.locationCard}>
                <View style={styles.locationRow}>
                    <View style={styles.dotStart} />
                    <TextInput
                        style={styles.locationInput}
                        placeholder="Pickup location"
                        placeholderTextColor={theme.colors.placeholder}
                        value={pickup}
                        onChangeText={setPickup}
                    />
                </View>
                <View style={styles.locationDivider} />
                <View style={styles.locationRow}>
                    <View style={styles.dotEnd} />
                    <TextInput
                        style={styles.locationInput}
                        placeholder="Dropoff destination"
                        placeholderTextColor={theme.colors.placeholder}
                        value={dropoff}
                        onChangeText={setDropoff}
                    />
                </View>
            </View>

            <Text style={styles.sectionTitle}>AVAILABLE OPTIONS</Text>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {rideTypes.map((ride) => (
                    <TouchableOpacity
                        key={ride.id}
                        style={[styles.rideCard, selected === ride.id && styles.rideCardActive]}
                        onPress={() => setSelected(ride.id)}
                    >
                        <View style={[styles.iconBg, ride.id === 'pink-pass' && styles.pinkBg]}>
                            <Text style={styles.rideEmoji}>{ride.icon}</Text>
                        </View>
                        <View style={styles.rideInfo}>
                            <View style={styles.rideRow}>
                                <Text style={styles.rideName}>{ride.name}</Text>
                                {ride.promo && (
                                    <View style={styles.promoBadge}>
                                        <Text style={styles.promoText}>WOMEN ONLY</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.rideDesc}>{ride.desc}</Text>
                            <Text style={styles.rideTime}>{ride.time} away</Text>
                        </View>
                        <View style={styles.priceInfo}>
                            <Text style={[styles.price, selected === ride.id && styles.priceActive]}>
                                RS {ride.price}
                            </Text>
                            {selected === ride.id && (
                                <View style={styles.selectedDot} />
                            )}
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Estimated Fare</Text>
                    <Text style={styles.summaryPrice}>RS {selectedRide.price}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.confirmBtn, selected === 'pink-pass' && styles.pinkBtn, booking && { opacity: 0.7 }]}
                    onPress={handleConfirm}
                    disabled={booking}
                >
                    {booking
                        ? <ActivityIndicator color={theme.colors.black} />
                        : <Text style={styles.confirmText}>Choose Payment →</Text>
                    }
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
        paddingTop: 52, paddingHorizontal: 20,
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 16,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: theme.colors.card,
        alignItems: 'center', justifyContent: 'center',
    },
    backText: { color: theme.colors.text, fontSize: 20 },
    headerTitle: { fontSize: 15, fontWeight: '900', color: theme.colors.text, letterSpacing: 2 },
    locationCard: {
        marginHorizontal: 20, backgroundColor: theme.colors.card,
        borderRadius: 16, padding: 16, marginBottom: 20,
        borderWidth: 1.5, borderColor: '#222',
    },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    dotStart: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: theme.colors.primary },
    dotEnd:   { width: 10, height: 10, borderRadius: 2, backgroundColor: theme.colors.primary },
    locationInput: {
        flex: 1, color: theme.colors.text, fontSize: 14,
        fontWeight: '500', paddingVertical: 4,
    },
    locationDivider: { height: 1, backgroundColor: '#222', marginVertical: 10, marginLeft: 22 },
    sectionTitle: {
        fontSize: 11, fontWeight: '900', color: theme.colors.textSecondary,
        letterSpacing: 2, paddingHorizontal: 20, marginBottom: 10,
    },
    scroll: { paddingHorizontal: 20, paddingBottom: 16 },
    rideCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: theme.colors.card, borderRadius: 16,
        padding: 14, marginBottom: 10,
        borderWidth: 1.5, borderColor: 'transparent',
    },
    rideCardActive: { borderColor: theme.colors.primary, backgroundColor: 'rgba(245,197,24,0.05)' },
    iconBg: {
        width: 48, height: 48, borderRadius: 14,
        backgroundColor: '#222', alignItems: 'center', justifyContent: 'center',
    },
    pinkBg: { backgroundColor: 'rgba(255,105,180,0.15)' },
    rideEmoji: { fontSize: 22 },
    rideInfo: { flex: 1 },
    rideRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    rideName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
    promoBadge: {
        backgroundColor: 'rgba(255,105,180,0.2)', borderRadius: 6,
        paddingHorizontal: 6, paddingVertical: 2,
    },
    promoText: { fontSize: 9, fontWeight: '700', color: '#FF69B4' },
    rideDesc: { fontSize: 11, color: theme.colors.textSecondary, marginBottom: 2 },
    rideTime: { fontSize: 11, color: theme.colors.primary, fontWeight: '600' },
    priceInfo: { alignItems: 'flex-end', gap: 4 },
    price: { fontSize: 15, fontWeight: '800', color: theme.colors.textSecondary },
    priceActive: { color: theme.colors.primary },
    selectedDot: {
        width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary,
    },
    footer: {
        padding: 20, paddingBottom: 32,
        borderTopWidth: 1, borderTopColor: '#1a1a1a',
        backgroundColor: theme.colors.background,
    },
    summaryRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 14,
    },
    summaryLabel: { fontSize: 13, color: theme.colors.textSecondary },
    summaryPrice: { fontSize: 18, fontWeight: '900', color: theme.colors.primary },
    confirmBtn: {
        backgroundColor: theme.colors.primary, borderRadius: 14,
        paddingVertical: 16, alignItems: 'center',
    },
    pinkBtn: { backgroundColor: '#FF69B4' },
    confirmText: { color: theme.colors.black, fontSize: 15, fontWeight: '700' },
});

export default RideSelectionScreen;
