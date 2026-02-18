import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import authService from '../../services/auth.service';
import theme from '../../utils/theme';
import { APP_CONSTANTS } from '../../utils/constants';

const RegisterScreen: React.FC = () => {
    const navigation = useNavigation();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });
    const [errors, setErrors] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [loading, setLoading] = useState(false);

    const updateField = (field: string, value: string) => {
        setFormData({ ...formData, [field]: value });
        setErrors({ ...errors, [field]: '' });
    };

    const validate = (): boolean => {
        const newErrors = {
            name: '',
            email: '',
            phone: '',
            password: '',
            confirmPassword: '',
        };
        let isValid = true;

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
            isValid = false;
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
            isValid = false;
        } else if (!APP_CONSTANTS.EMAIL_REGEX.test(formData.email)) {
            newErrors.email = 'Please enter a valid email';
            isValid = false;
        }

        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone number is required';
            isValid = false;
        } else if (!APP_CONSTANTS.PHONE_REGEX.test(formData.phone)) {
            newErrors.phone = 'Please enter a valid phone number';
            isValid = false;
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
            isValid = false;
        } else if (formData.password.length < APP_CONSTANTS.MIN_PASSWORD_LENGTH) {
            newErrors.password = `Password must be at least ${APP_CONSTANTS.MIN_PASSWORD_LENGTH} characters`;
            isValid = false;
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
            isValid = false;
        }

        if (!acceptedTerms) {
            Alert.alert(
                'Terms & Conditions',
                'Please accept the terms and conditions to continue'
            );
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleRegister = async () => {
        if (!validate()) {
            return;
        }

        setLoading(true);
        try {
            const response = await authService.register({
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
            });

            if (response.success) {
                Alert.alert(
                    'Success',
                    'Account created successfully!',
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                // Navigate to Home or Login
                                // navigation.navigate('Home');
                            },
                        },
                    ]
                );
            }
        } catch (error: any) {
            Alert.alert('Registration Failed', error.message || 'Please try again');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>
                        Join SAFORA for safe and affordable rides
                    </Text>
                </View>

                <View style={styles.form}>
                    <Input
                        label="Full Name"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChangeText={text => updateField('name', text)}
                        error={errors.name}
                        icon="person-outline"
                        autoCapitalize="words"
                    />

                    <Input
                        label="Email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChangeText={text => updateField('email', text)}
                        error={errors.email}
                        icon="mail-outline"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                    />

                    <Input
                        label="Phone Number"
                        placeholder="+92 300 1234567"
                        value={formData.phone}
                        onChangeText={text => updateField('phone', text)}
                        error={errors.phone}
                        icon="call-outline"
                        keyboardType="phone-pad"
                    />

                    <Input
                        label="Password"
                        placeholder="Create a password"
                        value={formData.password}
                        onChangeText={text => updateField('password', text)}
                        error={errors.password}
                        icon="lock-closed-outline"
                        secureTextEntry
                        autoCapitalize="none"
                    />

                    <Input
                        label="Confirm Password"
                        placeholder="Re-enter your password"
                        value={formData.confirmPassword}
                        onChangeText={text => updateField('confirmPassword', text)}
                        error={errors.confirmPassword}
                        icon="lock-closed-outline"
                        secureTextEntry
                        autoCapitalize="none"
                    />

                    <TouchableOpacity
                        style={styles.termsContainer}
                        onPress={() => setAcceptedTerms(!acceptedTerms)}>
                        <View
                            style={[
                                styles.checkbox,
                                acceptedTerms && styles.checkboxChecked,
                            ]}>
                            {acceptedTerms && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={styles.termsText}>
                            I accept the{' '}
                            <Text style={styles.termsLink}>Terms & Conditions</Text>
                        </Text>
                    </TouchableOpacity>

                    <Button
                        title="Create Account"
                        onPress={handleRegister}
                        loading={loading}
                        style={styles.registerButton}
                    />

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Login' as never)}>
                            <Text style={styles.loginText}>Login</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.xl,
        paddingBottom: theme.spacing.xl,
    },
    header: {
        marginBottom: theme.spacing.lg,
    },
    title: {
        fontSize: theme.fontSize.xxl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    subtitle: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
    },
    form: {
        flex: 1,
    },
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: theme.colors.primary,
        marginRight: theme.spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: theme.colors.primary,
    },
    checkmark: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: theme.fontWeight.bold,
    },
    termsText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        flex: 1,
    },
    termsLink: {
        color: theme.colors.primary,
        fontWeight: theme.fontWeight.medium,
    },
    registerButton: {
        marginBottom: theme.spacing.lg,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: theme.spacing.md,
    },
    footerText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
    },
    loginText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.primary,
        fontWeight: theme.fontWeight.semibold,
    },
});

export default RegisterScreen;
