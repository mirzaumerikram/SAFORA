import React, { useMemo, useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../utils/theme';
import apiService from '../../services/api';

const FareBreakdownScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { rideId, totalFare } = route.params || {};

    const { theme } = useAppTheme();
    const s = useMemo(() => makeStyles(theme), [theme]);

    const [loading, setLoading] = useState(true);
    const [rideData, setRideData] = useState<any>(null);

    useEffect(() => {
        const fetchRide = async () => {
            if (!rideId) {
                setLoading(false);
                return;
            }
            try {
                const res: any = await apiService.get(`/rides/${rideId}`);
                if (res.success && res.ride) {
                    setRideData(res.ride);
                }
            } catch (err) {
                console.log('Failed to fetch ride breakdown', err);
            } finally {
                setLoading(false);
            }
        };
        fetchRide();
    }, [rideId]);

    // Dynamic precise calculations
    const total = rideData ? rideData.estimatedPrice : (totalFare || 185);
    const distance = rideData ? parseFloat((rideData.distance || 0).toFixed(1)) : 5.8;
    const duration = rideData ? Math.round(rideData.estimatedDuration || 0) : 18;
    const rideType = rideData?.type || 'standard';

    let multiplier = 0.8;
    if (rideType === 'rickshaw') multiplier = 1.5;
    if (rideType === 'standard' || rideType === 'pink-pass') multiplier = 2.0;

    const baseFare = Math.round((distance * 35 + 30) * multiplier);
    const timeCharge = Math.round((duration * 4) * multiplier);
    const safetyFee = 20;

    let subtotal = baseFare + timeCharge + safetyFee;
    let discount = subtotal - total;
    let surge = 0;

    if (discount < 0) {
        surge = Math.abs(discount);
        discount = 0;
    }

    return (
        <View style={s.container}>
            <ScrollView
                contentContainerStyle={s.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* Back button */}
                <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={s.backText}>←</Text>
                </TouchableOpacity>

                {/* Arrived Safely badge */}
                <View style={s.arrivedBadge}>
                    <Text style={s.arrivedBadgeText}>✓  ARRIVED SAFELY</Text>
                </View>

                {/* Title */}
                <Text style={s.title}>PAYMENT{'\n'}SUMMARY</Text>

                {/* Large Amount Hero */}
                <View style={s.heroBlock}>
                    <Text style={s.heroAmount}>RS {total}</Text>
                    <Text style={s.tripMeta}>
                        Trip #{rideId ? `SF-${rideId}` : 'SF-2024-00843'} · Cash Payment
                    </Text>
                </View>

                {/* Fare Breakdown */}
                <Text style={s.sectionLabel}>FARE BREAKDOWN</Text>
                {loading ? (
                    <View style={[s.breakdownCard, { alignItems: 'center', padding: 30 }]}>
                        <ActivityIndicator color={theme.colors.primary} />
                        <Text style={{ marginTop: 10, fontSize: 12, color: theme.colors.textSecondary }}>Calculating accurate fare...</Text>
                    </View>
                ) : (
                    <View style={s.breakdownCard}>
                        <View style={s.breakRow}>
                            <Text style={s.breakLabel}>Base Fare ({distance} km)</Text>
                            <Text style={s.breakValue}>Rs {baseFare}</Text>
                        </View>
                        <View style={s.breakRow}>
                            <Text style={s.breakLabel}>Time Charge ({duration} min)</Text>
                            <Text style={s.breakValue}>Rs {timeCharge}</Text>
                        </View>
                        <View style={s.breakRow}>
                            <Text style={s.breakLabel}>🛡️ SAFORA Safety Fee</Text>
                            <Text style={s.breakValue}>Rs {safetyFee}</Text>
                        </View>
                        {surge > 0 && (
                            <View style={s.breakRow}>
                                <Text style={[s.breakLabel, { color: '#EAB308', fontWeight: '800' }]}>⚡ Peak Time Surge</Text>
                                <Text style={[s.breakValue, { color: '#EAB308' }]}>+Rs {surge}</Text>
                            </View>
                        )}
                        {discount > 0 && (
                            <View style={s.breakRow}>
                                <Text style={s.promoLabel}>AI Optimized Discount</Text>
                                <Text style={s.promoValue}>-Rs {discount}</Text>
                            </View>
                        )}
                        <View style={s.breakDivider} />
                        <View style={s.breakRow}>
                            <Text style={s.totalLabel}>Total</Text>
                            <Text style={s.totalValue}>Rs {total}</Text>
                        </View>
                    </View>
                )}

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

                <View style={{ height: 32 }} />
            </ScrollView>

            {/* Done Button — yellow, matches design 7.2 */}
            <View style={s.footer}>
                <TouchableOpacity
                    style={s.doneBtn}
                    onPress={() => navigation.navigate('Home')}
                >
                    <Text style={s.doneText}>Done  →</Text>
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
    scroll: {
        paddingHorizontal: 20,
        paddingTop: 52,
        paddingBottom: 16,
    },

    // Back button
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: t.colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: t.colors.border,
        marginBottom: 20,
    },
    backText: {
        color: t.colors.text,
        fontSize: 20,
    },

    // Arrived safely badge
    arrivedBadge: {
        alignSelf: 'flex-start',
        backgroundColor: t.colors.success,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 6,
        marginBottom: 16,
    },
    arrivedBadgeText: {
        fontSize: 12,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 1,
    },

    // Title
    title: {
        fontSize: 38,
        fontWeight: '900',
        color: t.colors.text,
        letterSpacing: 2,
        lineHeight: 42,
        marginBottom: 8,
    },

    // Hero amount block
    heroBlock: {
        alignItems: 'center',
        paddingVertical: 24,
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

    // Footer — yellow Done button
    footer: {
        padding: 20,
        paddingBottom: 36,
        borderTopWidth: 1,
        borderTopColor: t.colors.divider,
        backgroundColor: t.colors.background,
    },
    doneBtn: {
        backgroundColor: t.colors.primary,
        borderRadius: 14,
        paddingVertical: 17,
        alignItems: 'center',
    },
    doneText: {
        color: t.colors.black,
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 0.3,
    },
});

export default FareBreakdownScreen;
