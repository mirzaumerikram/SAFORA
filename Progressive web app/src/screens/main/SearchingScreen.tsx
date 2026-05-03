import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import socketService from '../../services/socket.service';

const SearchingScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { rideId } = route.params || {};
    const { theme } = useAppTheme();
    const { t } = useLanguage();
    
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Pulse Animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 1500,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Rotation Animation
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 4000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        // Real Socket Listener for Driver Match
        socketService.onRideAccepted((data: any) => {
            console.log('[Searching] Ride accepted by driver!', data);
            navigation.navigate('Tracking', { rideId: data.rideId });
        });

        return () => {
            socketService.offAll();
        };
    }, []);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
            
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.colors.text }]}>{t.findingDriver || 'Finding your Driver'}</Text>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                    {t.findingSub || 'Connecting you with the nearest SAFORA driver'}
                </Text>
            </View>

            <View style={styles.animationContainer}>
                {/* Outer Pulses */}
                <Animated.View style={[
                    styles.pulse, 
                    { 
                        borderColor: theme.colors.primary, 
                        opacity: 0.1,
                        transform: [{ scale: pulseAnim }] 
                    }
                ]} />
                <Animated.View style={[
                    styles.pulse, 
                    { 
                        borderColor: theme.colors.primary, 
                        opacity: 0.2,
                        transform: [{ scale: Animated.multiply(pulseAnim, 0.8) }] 
                    }
                ]} />

                {/* Rotating Ring */}
                <Animated.View style={[
                    styles.ring, 
                    { 
                        borderColor: theme.colors.primary,
                        borderLeftColor: 'transparent',
                        transform: [{ rotate: spin }] 
                    }
                ]} />

                {/* Center Content */}
                <View style={[styles.centerCircle, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.carEmoji}>🚗</Text>
                </View>
            </View>

            <View style={styles.infoContainer}>
                <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{t.nearbyDrivers || 'Nearby Drivers'}</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.text }]}>Searching...</Text>
                </View>
                <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{t.estWait || 'Est. Wait'}</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.text }]}>--</Text>
                </View>
            </View>

            <TouchableOpacity 
                style={[styles.cancelBtn, { borderColor: theme.colors.danger }]}
                onPress={() => navigation.goBack()}
            >
                <Text style={[styles.cancelBtnText, { color: theme.colors.danger }]}>{t.cancelRequest || 'Cancel Request'}</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'space-between' },
    header: { alignItems: 'center', marginTop: 60 },
    title: { fontSize: 24, fontWeight: '900', marginBottom: 10 },
    subtitle: { fontSize: 14, textAlign: 'center', opacity: 0.7 },
    animationContainer: { width: 300, height: 300, alignItems: 'center', justifyContent: 'center' },
    pulse: { position: 'absolute', width: 280, height: 280, borderRadius: 140, borderWidth: 2 },
    ring: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 4 },
    centerCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
    carEmoji: { fontSize: 40 },
    infoContainer: { flexDirection: 'row', gap: 16, width: '100%' },
    infoCard: { flex: 1, padding: 20, borderRadius: 24, alignItems: 'center' },
    infoLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
    infoValue: { fontSize: 20, fontWeight: '900' },
    cancelBtn: { width: '100%', padding: 18, borderRadius: 18, borderWidth: 2, alignItems: 'center', marginBottom: 40 },
    cancelBtnText: { fontSize: 16, fontWeight: '800' },
});

export default SearchingScreen;
