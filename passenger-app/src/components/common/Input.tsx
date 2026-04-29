import React, { useState } from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    TouchableOpacity,
    ViewStyle,
    TextInputProps,
    Platform,
} from 'react-native';
import SaforaIcon from './SaforaIcon';
import theme from '../../utils/theme';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    icon?: string;
    containerStyle?: ViewStyle;
    secureTextEntry?: boolean;
}

const Input: React.FC<InputProps> = ({
    label,
    error,
    icon,
    containerStyle,
    secureTextEntry,
    style,
    ...props
}) => {
    const [isSecure, setIsSecure] = useState(secureTextEntry);

    // Override browser autofill white background on web
    const webInputStyle = Platform.OS === 'web' ? {
        // @ts-ignore
        WebkitBoxShadow: '0 0 0 30px #1A1A1A inset',
        WebkitTextFillColor: theme.colors.text,
        caretColor: theme.colors.text,
    } : {};

    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View style={[styles.inputContainer, error && styles.inputError]}>
                {icon && (
                    <SaforaIcon
                        name={icon}
                        size={20}
                        color={theme.colors.textSecondary}
                        style={styles.icon}
                    />
                )}
                <TextInput
                    style={[styles.input, webInputStyle, style]}
                    placeholderTextColor={theme.colors.placeholder}
                    secureTextEntry={isSecure}
                    {...props}
                />
                {secureTextEntry && (
                    <TouchableOpacity
                        onPress={() => setIsSecure(!isSecure)}
                        style={styles.eyeIcon}>
                        <SaforaIcon
                            name={isSecure ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={theme.colors.textSecondary}
                        />
                    </TouchableOpacity>
                )}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: theme.spacing.md,
    },
    label: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.medium,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.card,   // DARK — was white
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: theme.spacing.md,
        minHeight: 56,
    },
    inputError: {
        borderColor: theme.colors.danger,
    },
    icon: {
        marginRight: theme.spacing.sm,
    },
    input: {
        flex: 1,
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        paddingVertical: theme.spacing.sm,
        backgroundColor: 'transparent',
    },
    eyeIcon: {
        padding: theme.spacing.xs,
    },
    errorText: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.danger,
        marginTop: theme.spacing.xs,
        marginLeft: theme.spacing.xs,
    },
});

export default Input;
