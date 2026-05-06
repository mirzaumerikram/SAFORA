import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Animated, Dimensions, Platform } from 'react-native';

interface CustomAlertProps {
    visible: boolean;
    title: string;
    message: string;
    onClose: () => void;
}

export const CustomAlert: React.FC<CustomAlertProps> = ({ visible, title, message, onClose }) => {
    const t = { colors: { primary: '#F5C518' } }; // Hardcoded SAFORA Gold for safety
    const [fadeAnim] = React.useState(new Animated.Value(0));
    const { width } = Dimensions.get('window');

    React.useEffect(() => {
        if (visible) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: Platform.OS !== 'web',
            }).start();
        } else {
            fadeAnim.setValue(0);
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="none">
            <View style={s.overlay}>
                <Animated.View style={[s.alertBox, { width: Math.min(width - 40, 340), opacity: fadeAnim, transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
                    <View style={s.header}>
                        <View style={[s.iconCircle, { borderColor: 'rgba(245, 197, 24, 0.2)' }]}>
                            <Text style={s.iconText}>🛡️</Text>
                        </View>
                        <Text style={[s.title, { color: t.colors.primary }]}>{title}</Text>
                    </View>
                    
                    <Text style={s.message}>{message}</Text>

                    <TouchableOpacity style={[s.button, { backgroundColor: t.colors.primary }]} onPress={onClose} activeOpacity={0.8}>
                        <Text style={s.buttonText}>Got it</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
};

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    alertBox: {
        backgroundColor: '#1C1C1E',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(245, 197, 24, 0.2)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        alignItems: 'center',
        marginBottom: 16,
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(245, 197, 24, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(245, 197, 24, 0.2)',
    },
    iconText: {
        fontSize: 28,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: t.colors.primary,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    message: {
        fontSize: 15,
        color: '#E5E5E7',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
        fontWeight: '400',
    },
    button: {
        backgroundColor: t.colors.primary,
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 16,
        width: '100%',
        alignItems: 'center',
        shadowColor: t.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    buttonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '700',
    }
});
