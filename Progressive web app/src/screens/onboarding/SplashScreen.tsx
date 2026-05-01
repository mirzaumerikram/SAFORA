import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';

const SplashScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { theme } = useAppTheme();
    const fadeAnim = new Animated.Value(0);
    const scaleAnim = new Animated.Value(0.9);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();

        const timer = setTimeout(() => {
            navigation.replace('LanguageRole');
        }, 2500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
            
            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                {/* Logo Icon */}
                <View style={[styles.logoContainer, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.logoIcon}>🛡️</Text>
                </View>

                {/* Brand Name */}
                <Text style={[styles.brandName, { color: theme.colors.text }]}>SAFORA</Text>
                
                {/* Tagline */}
                <Text style={[styles.tagline, { color: theme.colors.primary }]}>SAFETY FIRST FOR ALL</Text>
            </Animated.View>

            {/* Loading Indicator Dots */}
            <View style={styles.loader}>
                <View style={[styles.dot, { backgroundColor: theme.colors.primary, width: 20 }]} />
                <View style={[styles.dot, { backgroundColor: theme.colors.cardSecondary }]} />
                <View style={[styles.dot, { backgroundColor: theme.colors.cardSecondary }]} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        alignItems: 'center',
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
    },
    logoIcon: {
        fontSize: 48,
    },
    brandName: {
        fontSize: 48,
        fontWeight: '900',
        letterSpacing: 6,
    },
    tagline: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 4,
        marginTop: 8,
    },
    loader: {
        position: 'absolute',
        bottom: 50,
        flexDirection: 'row',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
});

export default SplashScreen;
