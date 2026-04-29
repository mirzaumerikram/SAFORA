import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import theme from '../../utils/theme';

const { width } = Dimensions.get('window');

const FareBreakdownScreen: React.FC = () => {
    const navigation = useNavigation<any>();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>TRIP{"\n"}SUMMARY</Text>
            </View>

            <View style={styles.summaryCard}>
                <View style={styles.fareRow}>
                    <Text style={styles.fareLabel}>Total Fare</Text>
                    <Text style={styles.totalAmount}>RS 450.00</Text>
                </View>
                
                <View style={styles.divider} />

                <View style={styles.breakdownItem}>
                    <Text style={styles.itemLabel}>Base Fare</Text>
                    <Text style={styles.itemValue}>RS 120.00</Text>
                </View>
                <View style={styles.breakdownItem}>
                    <Text style={styles.itemLabel}>Distance (8.4 km)</Text>
                    <Text style={styles.itemValue}>RS 252.00</Text>
                </View>
                <View style={styles.breakdownItem}>
                    <Text style={styles.itemLabel}>Time (24 mins)</Text>
                    <Text style={styles.itemValue}>RS 48.00</Text>
                </View>
                <View style={styles.breakdownItem}>
                    <Text style={styles.itemLabel}>Safety Sentinel Fee</Text>
                    <Text style={styles.itemValue}>RS 30.00</Text>
                </View>
                <View style={[styles.breakdownItem, styles.promoItem]}>
                    <Text style={styles.promoLabel}>Discount (SAVE10)</Text>
                    <Text style={styles.promoValue}>- RS 45.00</Text>
                </View>
            </View>

            <Text style={styles.sectionLabel}>PAYMENT METHOD</Text>
            <TouchableOpacity style={styles.paymentCard}>
                <View style={styles.payLeft}>
                    <View style={styles.payIconBg}>
                        <Text style={styles.payEmoji}>💰</Text>
                    </View>
                    <View>
                        <Text style={styles.payTitle}>Cash Payment</Text>
                        <Text style={styles.paySub}>Pay after the ride</Text>
                    </View>
                </View>
                <View style={[styles.radio, styles.radioActive]}>
                    <View style={styles.radioInner} />
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.paymentCard}>
                <View style={styles.payLeft}>
                    <View style={styles.payIconBg}>
                        <Text style={styles.payEmoji}>📱</Text>
                    </View>
                    <View>
                        <Text style={styles.payTitle}>Easypaisa / JazzCash</Text>
                        <Text style={styles.paySub}>Fast digital payment</Text>
                    </View>
                </View>
                <View style={styles.radio} />
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.doneBtn} 
                onPress={() => navigation.navigate('Home')}
            >
                <Text style={styles.doneText}>Finish Trip ✓</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: 24,
        paddingTop: 60,
    },
    header: {
        marginBottom: 32,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: theme.colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#222',
    },
    backText: {
        color: theme.colors.text,
        fontSize: 20,
    },
    title: {
        fontSize: 36,
        color: theme.colors.text,
        fontWeight: '900',
        letterSpacing: 2,
        lineHeight: 38,
    },
    summaryCard: {
        backgroundColor: theme.colors.card,
        borderRadius: 24,
        padding: 24,
        marginBottom: 32,
        borderWidth: 1.5,
        borderColor: '#222',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 10,
    },
    fareRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 16,
    },
    fareLabel: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    totalAmount: {
        fontSize: 32,
        fontWeight: '900',
        color: theme.colors.primary,
    },
    divider: {
        height: 1,
        backgroundColor: '#222',
        marginVertical: 16,
    },
    breakdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    itemLabel: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    itemValue: {
        fontSize: 13,
        color: theme.colors.text,
        fontWeight: '700',
    },
    promoItem: {
        marginTop: 4,
    },
    promoLabel: {
        fontSize: 13,
        color: theme.colors.success,
        fontWeight: '700',
    },
    promoValue: {
        fontSize: 13,
        color: theme.colors.success,
        fontWeight: '900',
    },
    sectionLabel: {
        fontSize: 10,
        letterSpacing: 3,
        color: theme.colors.primary,
        fontWeight: '800',
        marginBottom: 16,
    },
    paymentCard: {
        flexDirection: 'row',
        backgroundColor: theme.colors.card,
        borderRadius: 18,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        borderWidth: 1.5,
        borderColor: '#222',
    },
    payLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    payIconBg: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: theme.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    payEmoji: {
        fontSize: 18,
    },
    payTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.text,
    },
    paySub: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioActive: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primary,
    },
    radioInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.black,
    },
    doneBtn: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 'auto',
    },
    doneText: {
        color: theme.colors.black,
        fontSize: 15,
        fontWeight: '900',
    },
});

export default FareBreakdownScreen;
