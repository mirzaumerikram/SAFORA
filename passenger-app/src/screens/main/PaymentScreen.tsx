import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import theme from '../../utils/theme';
import apiService from '../../services/api';

type PayMethod = 'cash' | 'card';

const PaymentScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { rideId, estimatedPrice, pickup, dropoff, rideType, rideName } = route.params || {};

    const [method, setMethod] = useState<PayMethod>('cash');
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            if (method === 'cash') {
                if (rideId) {
                    await apiService.post('/payment/cash', { rideId });
                }
                navigation.navigate('Tracking', { rideId, paymentMethod: 'cash' });
            } else {
                // Card — create Stripe payment intent
                if (rideId) {
                    const res: any = await apiService.post('/payment/create-intent', { rideId });
                    navigation.navigate('Tracking', {
                        rideId,
                        paymentMethod: 'card',
                        clientSecret: res.clientSecret,
                    });
                } else {
                    // Demo mode
                    navigation.navigate('Tracking', { rideId: null, paymentMethod: 'card' });
                }
            }
        } catch (err: any) {
            Alert.alert('Payment Error', err.message || 'Please try again');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>PAYMENT</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Ride Summary */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Ride Summary</Text>
                    <View style={styles.routeRow}>
                        <View style={styles.dotFrom} />
                        <Text style={styles.routeText} numberOfLines={1}>{pickup || 'Pickup'}</Text>
                    </View>
                    <View style={styles.routeLine} />
                    <View style={styles.routeRow}>
                        <View style={styles.dotTo} />
                        <Text style={styles.routeText} numberOfLines={1}>{dropoff || 'Dropoff'}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.fareRow}>
                        <Text style={styles.fareLabel}>{rideName || 'Ride'}</Text>
                        <Text style={styles.fareAmt}>RS {estimatedPrice || '—'}</Text>
                    </View>
                </View>

                {/* Payment Methods */}
                <Text style={styles.sectionLabel}>SELECT PAYMENT METHOD</Text>

                <TouchableOpacity
                    style={[styles.methodCard, method === 'cash' && styles.methodActive]}
                    onPress={() => setMethod('cash')}
                >
                    <View style={styles.methodLeft}>
                        <View style={[styles.methodIcon, { backgroundColor: '#1a2a1a' }]}>
                            <Text style={styles.methodEmoji}>💵</Text>
                        </View>
                        <View>
                            <Text style={styles.methodName}>Cash</Text>
                            <Text style={styles.methodDesc}>Pay the driver directly</Text>
                        </View>
                    </View>
                    <View style={[styles.radio, method === 'cash' && styles.radioActive]}>
                        {method === 'cash' && <View style={styles.radioDot} />}
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.methodCard, method === 'card' && styles.methodActive]}
                    onPress={() => setMethod('card')}
                >
                    <View style={styles.methodLeft}>
                        <View style={[styles.methodIcon, { backgroundColor: '#1a1a2a' }]}>
                            <Text style={styles.methodEmoji}>💳</Text>
                        </View>
                        <View>
                            <Text style={styles.methodName}>Card (Stripe)</Text>
                            <Text style={styles.methodDesc}>Secure online payment</Text>
                        </View>
                    </View>
                    <View style={[styles.radio, method === 'card' && styles.radioActive]}>
                        {method === 'card' && <View style={styles.radioDot} />}
                    </View>
                </TouchableOpacity>

                {method === 'card' && (
                    <View style={styles.cardNote}>
                        <Text style={styles.cardNoteText}>
                            💡 Test card: 4242 4242 4242 4242 · Any future date · Any CVV
                        </Text>
                    </View>
                )}

                <View style={{ height: 20 }} />
            </ScrollView>

            {/* Confirm Button */}
            <View style={styles.footer}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalAmt}>RS {estimatedPrice || '—'}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.confirmBtn, loading && { opacity: 0.6 }]}
                    onPress={handleConfirm}
                    disabled={loading}
                >
                    {loading
                        ? <ActivityIndicator color={theme.colors.black} />
                        : <Text style={styles.confirmText}>
                            {method === 'cash' ? '🚗 Confirm & Find Driver' : '💳 Pay RS ' + estimatedPrice}
                          </Text>
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
        justifyContent: 'space-between', marginBottom: 20,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: theme.colors.card,
        alignItems: 'center', justifyContent: 'center',
    },
    backText: { color: theme.colors.text, fontSize: 20 },
    headerTitle: { fontSize: 15, fontWeight: '900', color: theme.colors.text, letterSpacing: 2 },
    scroll: { paddingHorizontal: 20 },
    summaryCard: {
        backgroundColor: theme.colors.card, borderRadius: 16,
        padding: 18, marginBottom: 24,
        borderWidth: 1.5, borderColor: '#222',
    },
    summaryTitle: {
        fontSize: 11, fontWeight: '900', color: theme.colors.textSecondary,
        letterSpacing: 2, marginBottom: 14,
    },
    routeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    dotFrom: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: theme.colors.primary },
    dotTo:   { width: 10, height: 10, borderRadius: 2, backgroundColor: theme.colors.primary },
    routeLine: { width: 1.5, height: 14, backgroundColor: '#333', marginLeft: 4, marginVertical: 3 },
    routeText: { flex: 1, fontSize: 13, color: theme.colors.text, fontWeight: '500' },
    divider: { height: 1, backgroundColor: '#222', marginVertical: 14 },
    fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    fareLabel: { fontSize: 13, color: theme.colors.textSecondary },
    fareAmt:   { fontSize: 18, fontWeight: '900', color: theme.colors.primary },
    sectionLabel: {
        fontSize: 11, fontWeight: '900', color: theme.colors.textSecondary,
        letterSpacing: 2, marginBottom: 12,
    },
    methodCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: theme.colors.card, borderRadius: 16, padding: 16,
        marginBottom: 10, borderWidth: 1.5, borderColor: 'transparent',
    },
    methodActive: { borderColor: theme.colors.primary, backgroundColor: 'rgba(245,197,24,0.05)' },
    methodLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    methodIcon: {
        width: 44, height: 44, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
    },
    methodEmoji: { fontSize: 20 },
    methodName: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 2 },
    methodDesc: { fontSize: 11, color: theme.colors.textSecondary },
    radio: {
        width: 20, height: 20, borderRadius: 10,
        borderWidth: 2, borderColor: '#444',
        alignItems: 'center', justifyContent: 'center',
    },
    radioActive: { borderColor: theme.colors.primary },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary },
    cardNote: {
        backgroundColor: 'rgba(245,197,24,0.08)', borderRadius: 10,
        padding: 12, marginTop: 4,
    },
    cardNoteText: { fontSize: 12, color: theme.colors.primary, lineHeight: 18 },
    footer: {
        padding: 20, paddingBottom: 32,
        borderTopWidth: 1, borderTopColor: '#1a1a1a',
        backgroundColor: theme.colors.background,
    },
    totalRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 14,
    },
    totalLabel: { fontSize: 13, color: theme.colors.textSecondary },
    totalAmt:   { fontSize: 20, fontWeight: '900', color: theme.colors.primary },
    confirmBtn: {
        backgroundColor: theme.colors.primary, borderRadius: 14,
        paddingVertical: 16, alignItems: 'center',
    },
    confirmText: { color: theme.colors.black, fontSize: 15, fontWeight: '700' },
});

export default PaymentScreen;
