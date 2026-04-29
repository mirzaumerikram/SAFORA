import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Animated, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import theme from '../../utils/theme';

const { width, height } = Dimensions.get('window');

const SplashScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const fadeAnim = new Animated.Value(0);
    const scaleAnim = new Animated.Value(0.8);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1200,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 4,
                useNativeDriver: true,
            }),
        ]).start();

        const timer = setTimeout(() => {
            navigation.replace('LanguageRole');
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
            {/* Background Radial Glow Effect */}
            <View style={styles.glowContainer}>
                <View style={styles.glow} />
            </View>

            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                {/* Logo Icon */}
                <View style={styles.iconContainer}>
                    <View style={styles.shieldBackground} />
                    <Text style={styles.iconText}>🛡️</Text>
                </View>

                {/* Main Logo Text */}
                <Text style={styles.logoText}>SAFORA</Text>
                
                {/* Tagline */}
                <Text style={styles.tagline}>SAFETY FIRST FOR ALL</Text>
            </Animated.View>

            {/* Bottom Loader */}
            <View style={styles.loaderContainer}>
                <View style={[styles.dot, styles.activeDot]} />
                <View style={styles.dot} />
                <View style={styles.dot} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    glowContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    glow: {
        width: width * 0.8,
        height: width * 0.8,
        backgroundColor: theme.colors.primary,
        borderRadius: width * 0.4,
        opacity: 0.12,
    },
    content: {
        alignItems: 'center',
    },
    iconContainer: {
        width: 90,
        height: 90,
        backgroundColor: theme.colors.primary,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 10,
    },
    shieldBackground: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },
    iconText: {
        fontSize: 40,
    },
    logoText: {
        fontSize: 56,
        color: theme.colors.text,
        fontWeight: '900',
        letterSpacing: 8,
        // In a real app, we'd use Bebas Neue font family here
    },
    tagline: {
        color: theme.colors.primary,
        fontSize: 12,
        letterSpacing: 4,
        fontWeight: '600',
        marginTop: 6,
    },
    loaderContainer: {
        position: 'absolute',
        bottom: 60,
        flexDirection: 'row',
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.cardSecondary,
    },
    activeDot: {
        width: 20,
        backgroundColor: theme.colors.primary,
    },
});

export default SplashScreen;
