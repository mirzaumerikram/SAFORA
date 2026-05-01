import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../../context/ThemeContext';
import { useLanguage, Lang } from '../../context/LanguageContext';

const LanguageRoleScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { theme } = useAppTheme();
    const { lang, setLang, t, isUrdu } = useLanguage();
    const [role, setRole] = useState<'passenger' | 'driver'>('passenger');

    const handleContinue = async () => {
        await AsyncStorage.setItem('@safora_selected_role', role);
        navigation.navigate('Login', { selectedRole: role });
    };

    return (
        <ScrollView 
            contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
            showsVerticalScrollIndicator={false}
        >
            <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
            
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.colors.text }, isUrdu && styles.titleUrdu]}>
                    {t.getStartedTitle}
                </Text>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }, isUrdu && styles.rtl]}>
                    {t.getStartedSub}
                </Text>
            </View>

            <Text style={[styles.sectionLabel, { color: theme.colors.primary }, isUrdu && styles.rtl]}>
                {t.selectLanguage}
            </Text>

            <View style={styles.optionsContainer}>
                <TouchableOpacity
                    style={[
                        styles.optionCard, 
                        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                        lang === 'en' && { borderColor: theme.colors.primary, backgroundColor: theme.dark ? 'rgba(245,197,24,0.1)' : 'rgba(245,197,24,0.05)' }
                    ]}
                    onPress={() => setLang('en')}
                >
                    <View style={styles.optionLeft}>
                        <View style={[styles.optionIcon, { backgroundColor: theme.colors.cardSecondary }]}>
                            <Text style={styles.emoji}>🇬🇧</Text>
                        </View>
                        <View>
                            <Text style={[styles.optionText, { color: theme.colors.text }]}>English</Text>
                            <Text style={[styles.optionTextSub, { color: theme.colors.textSecondary }]}>International</Text>
                        </View>
                    </View>
                    <View style={[styles.radio, { borderColor: theme.colors.placeholder }, lang === 'en' && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary }]}>
                        {lang === 'en' && <View style={[styles.radioInner, { backgroundColor: theme.colors.white }]} />}
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.optionCard, 
                        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                        lang === 'ur' && { borderColor: theme.colors.primary, backgroundColor: theme.dark ? 'rgba(245,197,24,0.1)' : 'rgba(245,197,24,0.05)' }
                    ]}
                    onPress={() => setLang('ur')}
                >
                    <View style={styles.optionLeft}>
                        <View style={[styles.optionIcon, { backgroundColor: theme.colors.cardSecondary }]}>
                            <Text style={styles.emoji}>🇵🇰</Text>
                        </View>
                        <View>
                            <Text style={[styles.optionTextUrdu, { color: theme.colors.text }]}>اردو</Text>
                            <Text style={[styles.optionTextSub, { color: theme.colors.textSecondary }]}>Urdu</Text>
                        </View>
                    </View>
                    <View style={[styles.radio, { borderColor: theme.colors.placeholder }, lang === 'ur' && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary }]}>
                        {lang === 'ur' && <View style={[styles.radioInner, { backgroundColor: theme.colors.white }]} />}
                    </View>
                </TouchableOpacity>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

            <Text style={[styles.sectionLabel, { color: theme.colors.primary }, isUrdu && styles.rtl]}>
                {t.selectRole}
            </Text>

            <View style={styles.roleGrid}>
                <TouchableOpacity
                    style={[
                        styles.roleCard, 
                        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                        role === 'passenger' && { borderColor: theme.colors.primary, backgroundColor: theme.dark ? 'rgba(245,197,24,0.1)' : 'rgba(245,197,24,0.05)' }
                    ]}
                    onPress={() => setRole('passenger')}
                >
                    <Text style={styles.roleEmoji}>🧍</Text>
                    <Text style={[styles.roleLabel, { color: theme.colors.text }, isUrdu && styles.urduText]}>{t.iAmPassenger}</Text>
                    <Text style={[styles.roleSub, { color: theme.colors.textSecondary }, isUrdu && styles.urduText]}>{t.passengerSub}</Text>
                    {role === 'passenger' && (
                        <View style={[styles.roleCheck, { backgroundColor: theme.colors.primary }]}>
                            <Text style={styles.roleCheckText}>✓</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.roleCard, 
                        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                        role === 'driver' && { borderColor: theme.colors.primary, backgroundColor: theme.dark ? 'rgba(245,197,24,0.1)' : 'rgba(245,197,24,0.05)' }
                    ]}
                    onPress={() => setRole('driver')}
                >
                    <Text style={styles.roleEmoji}>🚗</Text>
                    <Text style={[styles.roleLabel, { color: theme.colors.text }, isUrdu && styles.urduText]}>{t.iAmDriver}</Text>
                    <Text style={[styles.roleSub, { color: theme.colors.textSecondary }, isUrdu && styles.urduText]}>{t.driverSub}</Text>
                    {role === 'driver' && (
                        <View style={[styles.roleCheck, { backgroundColor: theme.colors.primary }]}>
                            <Text style={styles.roleCheckText}>✓</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <TouchableOpacity 
                style={[styles.continueBtn, { backgroundColor: theme.colors.primary }]} 
                onPress={handleContinue}
                activeOpacity={0.8}
            >
                <Text style={styles.continueText}>{t.continueBtn}</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { 
        flexGrow: 1, 
        padding: 24, 
        paddingTop: 60,
        paddingBottom: 40,
    },
    header: { marginBottom: 32 },
    title: { 
        fontSize: 40, 
        fontWeight: '900', 
        letterSpacing: 2, 
        lineHeight: 44 
    },
    titleUrdu: { 
        fontSize: 36, 
        letterSpacing: 0, 
        lineHeight: 48, 
        textAlign: 'right' 
    },
    subtitle: { 
        fontSize: 14, 
        marginTop: 8,
        lineHeight: 20,
    },
    rtl: { textAlign: 'right' },
    urduText: { textAlign: 'center' },
    sectionLabel: { 
        fontSize: 12, 
        letterSpacing: 2, 
        textTransform: 'uppercase', 
        marginBottom: 16, 
        fontWeight: '800' 
    },
    optionsContainer: {
        gap: 12,
        marginBottom: 8,
    },
    optionCard: { 
        borderWidth: 2, 
        borderRadius: 20, 
        padding: 18, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
    },
    optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    optionIcon: { 
        width: 44, 
        height: 44, 
        borderRadius: 12, 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    emoji: { fontSize: 20 },
    optionText: { fontSize: 16, fontWeight: '700' },
    optionTextUrdu: { fontSize: 18, fontWeight: '700' },
    optionTextSub: { fontSize: 12, marginTop: 2 },
    radio: { 
        width: 24, 
        height: 24, 
        borderRadius: 12, 
        borderWidth: 2, 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    radioInner: { width: 10, height: 10, borderRadius: 5 },
    divider: { height: 1, marginVertical: 32 },
    roleGrid: { flexDirection: 'row', gap: 14, marginBottom: 40 },
    roleCard: { 
        flex: 1, 
        borderWidth: 2, 
        borderRadius: 24, 
        padding: 24, 
        alignItems: 'center', 
        gap: 12, 
        position: 'relative' 
    },
    roleEmoji: { fontSize: 32 },
    roleLabel: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
    roleSub: { fontSize: 11, textAlign: 'center', lineHeight: 15 },
    roleCheck: { 
        position: 'absolute', 
        top: 12, 
        right: 12, 
        width: 22, 
        height: 22, 
        borderRadius: 11, 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    roleCheckText: { color: '#000', fontSize: 11, fontWeight: '900' },
    continueBtn: { 
        padding: 18, 
        borderRadius: 18, 
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    continueText: { 
        fontSize: 16, 
        fontWeight: '900', 
        color: '#000', 
        letterSpacing: 1 
    },
});

export default LanguageRoleScreen;
