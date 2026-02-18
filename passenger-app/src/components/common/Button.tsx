import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../../utils/theme';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    loading = false,
    disabled = false,
    style,
    textStyle,
}) => {
    const isDisabled = disabled || loading;

    if (variant === 'primary') {
        return (
            <TouchableOpacity
                onPress={onPress}
                disabled={isDisabled}
                style={[styles.container, style]}
                activeOpacity={0.8}>
                <LinearGradient
                    colors={
                        isDisabled
                            ? [theme.colors.border, theme.colors.border]
                            : [theme.colors.primary, '#8B7FFF']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradient}>
                    {loading ? (
                        <ActivityIndicator color={theme.colors.white} />
                    ) : (
                        <Text style={[styles.primaryText, textStyle]}>{title}</Text>
                    )}
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    if (variant === 'secondary') {
        return (
            <TouchableOpacity
                onPress={onPress}
                disabled={isDisabled}
                style={[
                    styles.container,
                    styles.secondaryButton,
                    isDisabled && styles.disabledButton,
                    style,
                ]}
                activeOpacity={0.8}>
                {loading ? (
                    <ActivityIndicator color={theme.colors.primary} />
                ) : (
                    <Text style={[styles.secondaryText, textStyle]}>{title}</Text>
                )}
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={isDisabled}
            style={[
                styles.container,
                styles.outlineButton,
                isDisabled && styles.disabledButton,
                style,
            ]}
            activeOpacity={0.8}>
            {loading ? (
                <ActivityIndicator color={theme.colors.primary} />
            ) : (
                <Text style={[styles.outlineText, textStyle]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
    },
    gradient: {
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 56,
    },
    secondaryButton: {
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 56,
    },
    outlineButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: theme.colors.primary,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 56,
    },
    disabledButton: {
        opacity: 0.5,
    },
    primaryText: {
        color: theme.colors.white,
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.semibold,
    },
    secondaryText: {
        color: theme.colors.white,
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.semibold,
    },
    outlineText: {
        color: theme.colors.primary,
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.semibold,
    },
});

export default Button;
