import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, StatusBar } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import SaforaMap from '../../components/SaforaMap';

const { height } = Dimensions.get('window');

const RideRequestScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { theme } = useAppTheme();
    const { t } = useLanguage();
    
    // Mock data for display
    const request = route.params?.request || {
        passenger: 'Ayesha Khan',
        rating: '4.8',
        pickup: 'DHA Phase 5, Block L',
        dropoff: 'LUMS, DHA Phase 5',
        fare: 'RS 450',
        distance: '3.2 KM',
        time: '8 min'
    };

    const handleAccept = () => {
        navigation.navigate('TripNav', { request });
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            {/* Map Background */}
            <View style={styles.mapContainer}>
                <SaforaMap 
                    pickupLocation={{ latitude: 31.4697, longitude: 74.4098 }}
                    dropoffLocation={{ latitude: 31.4704, longitude: 74.4101 }}
                />
            </View>

            {/* Request Card */}
            <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
                <View style={[styles.dragHandle, { backgroundColor: theme.colors.divider }]} />
                
                <View style={styles.header}>
                    <View style={styles.passengerInfo}>
                        <View style={[styles.avatar, { backgroundColor: theme.colors.cardSecondary }]}>
                            <Text style={styles.avatarEmoji}>👩</Text>
                        </View>
                        <View>
                            <Text style={[styles.passengerName, { color: theme.colors.text }]}>{request.passenger}</Text>
                            <View style={styles.ratingRow}>
                                <Text style={styles.star}>⭐</Text>
                                <Text style={[styles.rating, { color: theme.colors.textSecondary }]}>{request.rating}</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.fareInfo}>
                        <Text style={[styles.fare, { color: theme.colors.primary }]}>{request.fare}</Text>
                        <Text style={[styles.distance, { color: theme.colors.textSecondary }]}>{request.distance}</Text>
                    </View>
                </View>

                <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

                <View style={styles.locationContainer}>
                    <View style={styles.locationRow}>
                        <View style={[styles.dot, { backgroundColor: theme.colors.success }]} />
                        <View style={styles.locationTextContainer}>
                            <Text style={[styles.locationLabel, { color: theme.colors.textSecondary }]}>{t.pickup || 'Pickup'}</Text>
                            <Text style={[styles.locationText, { color: theme.colors.text }]} numberOfLines={1}>{request.pickup}</Text>
                        </View>
                    </View>
                    <View style={[styles.line, { backgroundColor: theme.colors.border }]} />
                    <View style={styles.locationRow}>
                        <View style={[styles.dot, { backgroundColor: theme.colors.danger }]} />
                        <View style={styles.locationTextContainer}>
                            <Text style={[styles.locationLabel, { color: theme.colors.textSecondary }]}>{t.dropoff || 'Dropoff'}</Text>
                            <Text style={[styles.locationText, { color: theme.colors.text }]} numberOfLines={1}>{request.dropoff}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity 
                        style={[styles.declineBtn, { backgroundColor: theme.colors.cardSecondary }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={[styles.declineText, { color: theme.colors.text }]}>{t.decline || 'Decline'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.acceptBtn, { backgroundColor: theme.colors.primary }]}
                        onPress={handleAccept}
                    >
                        <Text style={styles.acceptText}>{t.accept || 'Accept'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    mapContainer: { flex: 1 },
    card: { 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        padding: 24, 
        paddingTop: 12,
        borderTopLeftRadius: 32, 
        borderTopRightRadius: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 20,
    },
    dragHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    passengerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
    avatarEmoji: { fontSize: 24 },
    passengerName: { fontSize: 18, fontWeight: '800' },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    star: { fontSize: 12 },
    rating: { fontSize: 13, fontWeight: '600' },
    fareInfo: { alignItems: 'flex-end' },
    fare: { fontSize: 22, fontWeight: '900' },
    distance: { fontSize: 12, fontWeight: '700', marginTop: 2 },
    divider: { height: 1, marginBottom: 20 },
    locationContainer: { marginBottom: 24 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    locationTextContainer: { flex: 1 },
    locationLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 2 },
    locationText: { fontSize: 15, fontWeight: '600' },
    line: { width: 2, height: 20, marginLeft: 4, marginVertical: 4 },
    actions: { flexDirection: 'row', gap: 12 },
    declineBtn: { flex: 1, padding: 18, borderRadius: 18, alignItems: 'center' },
    declineText: { fontSize: 16, fontWeight: '800' },
    acceptBtn: { flex: 2, padding: 18, borderRadius: 18, alignItems: 'center', shadowColor: '#F5C518', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    acceptText: { fontSize: 16, fontWeight: '900', color: '#000' },
});

export default RideRequestScreen;
