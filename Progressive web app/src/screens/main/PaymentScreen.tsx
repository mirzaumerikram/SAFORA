import React, { useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../utils/theme';
import apiService from '../../services/api';

type PayMethod = 'cash' | 'card';

const PaymentScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { rideId, estimatedPrice, pickup, dropoff, rideType, rideName } = route.params || {};

    const theme = useAppTheme();
    const s = useMemo(() => makeStyles(theme), [theme]);

    const [method, setMethod] = useState<PayMethod>('cash');
    const [loading, setLoading] = useState(false);

    // Fare breakdown derived from estimatedPrice (fallback to design values)
    const total = estimatedPrice || 185;
    const baseFare = 140;
    const timeCharge = 54;
    const safetyFee = 9;
    const promoDiscount = 18;

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
        <View style={s.container}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Text style={s.backText}>←</Text>
                </TouchableOpacity>
                <Text style={s.headerTitle}>PAYMENT SUMMARY</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

                {/* Large Amount Hero */}
                <View style={s.heroBlock}>
                    <Text style={s.heroAmount}>RS {total}</Text>
                    <Text style={s.tripMeta}>
                        Trip #{rideId ? `SF-${rideId}` : 'SF-2024-00843'} · Cash Payment
                    </Text>
                </View>

                {/* Fare Breakdown */}
                <Text style={s.sectionLabel}>FARE BREAKDOWN</Text>
                <View style={s.breakdownCard}>
                    <View style={s.breakRow}>
                        <Text style={s.breakLabel}>Base Fare (5.8 km)</Text>
                        <Text style={s.breakValue}>Rs {baseFare}</Text>
                    </View>
                    <View style={s.breakRow}>
                        <Text style={s.breakLabel}>Time Charge (18 min)</Text>
                        <Text style={s.breakValue}>Rs {timeCharge}</Text>
                    </View>
                    <View style={s.breakRow}>
                        <Text style={s.breakLabel}>🛡️ SAFORA Safety Fee</Text>
                        <Text style={s.breakValue}>Rs {safetyFee}</Text>
                    </View>
                    <View style={s.breakRow}>
                        <Text style={s.promoLabel}>Promo Code SAF10</Text>
                        <Text style={s.promoValue}>-Rs {promoDiscount}</Text>
                    </View>
                    <View style={s.breakDivider} />
                    <View style={s.breakRow}>
                        <Text style={s.totalLabel}>Total</Text>
                        <Text style={s.totalValue}>Rs {total}</Text>
                    </View>
                </View>

                {/* Payment Method */}
                <Text style={s.sectionLabel}>PAYMENT METHOD</Text>
                <View style={s.payMethodCard}>
                    <View style={s.payMethodLeft}>
                        <View style={s.payIconBg}>
                            <Text style={s.payEmoji}>💵</Text>
                        </View>
                        <View>
                            <Text style={s.payMethodName}>Cash Payment</Text>
                            <Text style={s.payMethodSub}>Paid directly to driver</Text>
                        </View>
                    </View>
                    <View style={s.paidBadge}>
                        <Text style={s.paidBadgeText}>PAID</Text>
                    </View>
                </View>

                {method === 'card' && (
                    <View style={s.cardNote}>
                        <Text style={s.cardNoteText}>
                            💡 Test card: 4242 4242 4242 4242 · Any future date · Any CVV
                        </Text>
                    </View>
                )}

                <View style={{ height: 24 }} />
            </ScrollView>

            {/* Confirm Button */}
            <View style={s.footer}>
                <TouchableOpacity
                    style={[s.confirmBtn, loading && { opacity: 0.6 }]}
                    onPress={handleConfirm}
                    disabled={loading}
                >
                    {loading
                        ? <ActivityIndicator color={theme.colors.black} />
                        : <Text style={s.confirmText}>✓  Ride Completed - Cash Paid</Text>
                    }
                </TouchableOpacity>
            </View>
        </View>
    );
};

const makeStyles = (t: AppTheme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: t.colors.background,
    },
    header: {
        paddingTop: 52,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: t.colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: t.colors.border,
    },
    backText: {
        color: t.colors.text,
        fontSize: 20,
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: t.colors.text,
        letterSpacing: 2,
    },
    scroll: {
        paddingHorizontal: 20,
        paddingTop: 12,
    },

    // Hero amount block
    heroBlock: {
        alignItems: 'center',
        paddingVertical: 28,
        marginBottom: 8,
    },
    heroAmount: {
        fontSize: 64,
        fontWeight: '900',
        color: t.colors.primary,
        letterSpacing: 1,
        lineHeight: 68,
    },
    tripMeta: {
        fontSize: 12,
        color: t.colors.textSecondary,
        marginTop: 6,
        letterSpacing: 0.3,
    },

    // Section label
    sectionLabel: {
        fontSize: 11,
        fontWeight: '900',
        color: t.colors.textSecondary,
        letterSpacing: 2,
        marginBottom: 12,
        marginTop: 4,
    },

    // Fare breakdown card
    breakdownCard: {
        backgroundColor: t.dark ? t.colors.card : '#F7F7F7',
        borderRadius: 16,
        padding: 18,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: t.colors.border,
    },
    breakRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    breakLabel: {
        fontSize: 13,
        color: t.colors.textSecondary,
        flex: 1,
    },
    breakValue: {
        fontSize: 13,
        fontWeight: '700',
        color: t.colors.text,
    },
    promoLabel: {
        fontSize: 13,
        color: t.colors.success,
        fontWeight: '600',
        flex: 1,
    },
    promoValue: {
        fontSize: 13,
        fontWeight: '900',
        color: t.colors.success,
    },
    breakDivider: {
        height: 1,
        backgroundColor: t.colors.divider,
        marginVertical: 10,
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: '900',
        color: t.colors.text,
        flex: 1,
    },
    totalValue: {
        fontSize: 16,
        fontWeight: '900',
        color: t.colors.text,
    },

    // Payment method card
    payMethodCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: t.colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1.5,
        borderColor: t.colors.border,
    },
    payMethodLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    payIconBg: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: t.dark ? '#1a2a1a' : '#EEFAEE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    payEmoji: {
        fontSize: 20,
    },
    payMethodName: {
        fontSize: 14,
        fontWeight: '700',
        color: t.colors.text,
        marginBottom: 2,
    },
    payMethodSub: {
        fontSize: 11,
        color: t.colors.textSecondary,
    },
    paidBadge: {
        backgroundColor: t.colors.success,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    paidBadgeText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 1,
    },

    // Card test note
    cardNote: {
        backgroundColor: 'rgba(245,197,24,0.08)',
        borderRadius: 10,
        padding: 12,
        marginTop: 4,
    },
    cardNoteText: {
        fontSize: 12,
        color: t.colors.primary,
        lineHeight: 18,
    },

    // Footer
    footer: {
        padding: 20,
        paddingBottom: 36,
        borderTopWidth: 1,
        borderTopColor: t.colors.divider,
        backgroundColor: t.colors.background,
    },
    confirmBtn: {
        backgroundColor: t.colors.success,
        borderRadius: 14,
        paddingVertical: 17,
        alignItems: 'center',
    },
    confirmText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
});

export default PaymentScreen;
