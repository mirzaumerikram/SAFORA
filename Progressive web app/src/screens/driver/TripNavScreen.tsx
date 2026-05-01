import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import SaforaMap from '../../components/SaforaMap';

const { width } = Dimensions.get('window');

const TripNavScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { theme } = useAppTheme();
    const { t } = useLanguage();
    
    const [status, setStatus] = useState<'picking' | 'riding'>('picking');
    const request = route.params?.request || {
        passenger: 'Ayesha Khan',
        pickup: 'DHA Phase 5, Block L',
        dropoff: 'LUMS, DHA Phase 5',
    };

    const handleAction = () => {
        if (status === 'picking') {
            setStatus('riding');
        } else {
            navigation.navigate('Feedback', { role: 'driver', recipient: request.passenger });
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            {/* Navigation Map */}
            <View style={styles.mapContainer}>
                <SaforaMap 
                    pickupLocation={{ latitude: 31.4697, longitude: 74.4098 }}
                    dropoffLocation={{ latitude: 31.4704, longitude: 74.4101 }}
                />
            </View>

            {/* Instruction Banner */}
            <View style={[styles.instructionBanner, { backgroundColor: theme.colors.success }]}>
                <View style={styles.instructionIconContainer}>
                    <Text style={styles.instructionEmoji}>⬆️</Text>
                </View>
                <View style={styles.instructionTextContainer}>
                    <Text style={styles.instructionDistance}>250 m</Text>
                    <Text style={styles.instructionText}>Turn right onto Main Blvd</Text>
                </View>
                <View style={styles.speedLimit}>
                    <View style={styles.speedCircle}>
                        <Text style={styles.speedValue}>50</Text>
                    </View>
                </View>
            </View>

            {/* Floating Navigation Controls */}
            <View style={styles.floatingControls}>
                <TouchableOpacity style={[styles.controlBtn, { backgroundColor: theme.colors.card }]}>
                    <Text style={styles.controlIcon}>🧭</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.controlBtn, { backgroundColor: theme.colors.card }]}>
                    <Text style={styles.controlIcon}>🔈</Text>
                </TouchableOpacity>
            </View>

            {/* Trip Info Footer */}
            <View style={[styles.footer, { backgroundColor: theme.colors.card }]}>
                <View style={styles.footerHeader}>
                    <View>
                        <Text style={[styles.footerTitle, { color: theme.colors.text }]}>
                            {status === 'picking' ? t.pickingUp || 'Picking Up' : t.onTrip || 'On Trip'}
                        </Text>
                        <Text style={[styles.footerSubtitle, { color: theme.colors.textSecondary }]}>
                            {status === 'picking' ? request.pickup : request.dropoff}
                        </Text>
                    </View>
                    <View style={styles.timeInfo}>
                        <Text style={[styles.etaValue, { color: theme.colors.success }]}>4 min</Text>
                        <Text style={[styles.etaLabel, { color: theme.colors.textSecondary }]}>0.8 km</Text>
                    </View>
                </View>

                <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

                <View style={styles.footerActions}>
                    <TouchableOpacity 
                        style={[styles.messageBtn, { backgroundColor: theme.colors.cardSecondary }]}
                        onPress={() => navigation.navigate('Chat', { recipient: request.passenger })}
                    >
                        <Text style={styles.actionIcon}>💬</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.sosBtn, { backgroundColor: theme.colors.danger }]}
                    >
                        <Text style={styles.sosText}>SOS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.mainActionBtn, { backgroundColor: theme.colors.primary }]}
                        onPress={handleAction}
                    >
                        <Text style={styles.mainActionText}>
                            {status === 'picking' ? t.arrived || 'Arrived' : t.completeTrip || 'Complete'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    mapContainer: { flex: 1 },
    instructionBanner: { 
        position: 'absolute', 
        top: 50, 
        left: 20, 
        right: 20, 
        borderRadius: 24, 
        padding: 20, 
        flexDirection: 'row', 
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 8,
    },
    instructionIconContainer: { width: 50, height: 50, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    instructionEmoji: { fontSize: 24 },
    instructionTextContainer: { flex: 1, marginLeft: 16 },
    instructionDistance: { fontSize: 12, fontWeight: '800', color: '#FFF', textTransform: 'uppercase', opacity: 0.8 },
    instructionText: { fontSize: 18, fontWeight: '900', color: '#FFF' },
    speedLimit: { marginLeft: 10 },
    speedCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', borderWidth: 3, borderColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
    speedValue: { fontSize: 16, fontWeight: '900', color: '#000' },
    floatingControls: { position: 'absolute', right: 20, top: 180, gap: 12 },
    controlBtn: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5 },
    controlIcon: { fontSize: 20 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, borderTopLeftRadius: 32, borderTopRightRadius: 32, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
    footerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    footerTitle: { fontSize: 20, fontWeight: '900' },
    footerSubtitle: { fontSize: 14, marginTop: 4, width: width * 0.6 },
    timeInfo: { alignItems: 'flex-end' },
    etaValue: { fontSize: 20, fontWeight: '900' },
    etaLabel: { fontSize: 12, fontWeight: '700' },
    divider: { height: 1, marginBottom: 20 },
    footerActions: { flexDirection: 'row', gap: 12 },
    messageBtn: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    sosBtn: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    sosText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
    mainActionBtn: { flex: 1, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#F5C518', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    mainActionText: { fontSize: 16, fontWeight: '900', color: '#000' },
    actionIcon: { fontSize: 22 },
});

export default TripNavScreen;
