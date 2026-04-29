import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../../utils/theme';
import { useLanguage, Lang } from '../../context/LanguageContext';

const LanguageRoleScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { lang, setLang, t, isUrdu } = useLanguage();
    const [role, setRole] = useState<'passenger' | 'driver'>('passenger');

    const handleSelectLanguage = (selected: Lang) => {
        setLang(selected);   // updates context globally immediately
    };

    const handleContinue = async () => {
        await AsyncStorage.setItem('@safora_selected_role', role);
        navigation.navigate('Login', { selectedRole: role });
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.title, isUrdu && styles.titleUrdu]}>{t.getStartedTitle}</Text>
                <Text style={[styles.subtitle, isUrdu && styles.rtl]}>{t.getStartedSub}</Text>
            </View>

            <Text style={[styles.sectionLabel, isUrdu && styles.rtl]}>{t.selectLanguage}</Text>

            <TouchableOpacity
                style={[styles.optionCard, lang === 'en' && styles.selectedCard]}
                onPress={() => handleSelectLanguage('en')}
            >
                <View style={styles.optionLeft}>
                    <View style={styles.optionIcon}><Text style={styles.emoji}>🇬🇧</Text></View>
                    <View>
                        <Text style={styles.optionText}>English</Text>
                        <Text style={styles.optionTextSub}>English</Text>
                    </View>
                </View>
                <View style={[styles.radio, lang === 'en' && styles.radioOn]}>
                    {lang === 'en' && <View style={styles.radioInner} />}
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.optionCard, lang === 'ur' && styles.selectedCard]}
                onPress={() => handleSelectLanguage('ur')}
            >
                <View style={styles.optionLeft}>
                    <View style={styles.optionIcon}><Text style={styles.emoji}>🇵🇰</Text></View>
                    <View>
                        <Text style={styles.optionTextUrdu}>اردو</Text>
                        <Text style={styles.optionTextSub}>Urdu</Text>
                    </View>
                </View>
                <View style={[styles.radio, lang === 'ur' && styles.radioOn]}>
                    {lang === 'ur' && <View style={styles.radioInner} />}
                </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <Text style={[styles.sectionLabel, isUrdu && styles.rtl]}>{t.selectRole}</Text>

            <View style={styles.roleGrid}>
                <TouchableOpacity
                    style={[styles.roleCard, role === 'passenger' && styles.selectedRoleCard]}
                    onPress={() => setRole('passenger')}
                >
                    <Text style={styles.roleEmoji}>🧍</Text>
                    <Text style={[styles.roleLabel, isUrdu && styles.urduText]}>{t.iAmPassenger}</Text>
                    <Text style={[styles.roleSub, isUrdu && styles.urduText]}>{t.passengerSub}</Text>
                    {role === 'passenger' && (
                        <View style={styles.roleCheck}><Text style={styles.roleCheckText}>✓</Text></View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.roleCard, role === 'driver' && styles.selectedRoleCard]}
                    onPress={() => setRole('driver')}
                >
                    <Text style={styles.roleEmoji}>🚗</Text>
                    <Text style={[styles.roleLabel, isUrdu && styles.urduText]}>{t.iAmDriver}</Text>
                    <Text style={[styles.roleSub, isUrdu && styles.urduText]}>{t.driverSub}</Text>
                    {role === 'driver' && (
                        <View style={styles.roleCheck}><Text style={styles.roleCheckText}>✓</Text></View>
                    )}
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
                <Text style={[styles.continueText, isUrdu && styles.urduText]}>{t.continueBtn}</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: theme.colors.background, padding: 24, paddingTop: 60 },
    header: { marginBottom: 32 },
    title: { fontSize: 36, color: theme.colors.text, fontWeight: '900', letterSpacing: 3, lineHeight: 40 },
    titleUrdu: { fontSize: 36, letterSpacing: 0, lineHeight: 48, textAlign: 'right' },
    subtitle: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 6 },
    rtl: { textAlign: 'right' },
    urduText: { textAlign: 'center' },
    sectionLabel: { fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: theme.colors.primary, marginBottom: 12, fontWeight: '700' },
    optionCard: { backgroundColor: theme.colors.card, borderWidth: 1.5, borderColor: theme.colors.cardSecondary, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    selectedCard: { borderColor: theme.colors.primary, backgroundColor: 'rgba(245,197,24,0.05)' },
    optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    optionIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: theme.colors.cardSecondary, alignItems: 'center', justifyContent: 'center' },
    emoji: { fontSize: 18 },
    optionText: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
    optionTextUrdu: { fontSize: 17, fontWeight: '600', color: theme.colors.text },
    optionTextSub: { fontSize: 11, color: theme.colors.textSecondary },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#444', alignItems: 'center', justifyContent: 'center' },
    radioOn: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
    radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.black },
    divider: { height: 1, backgroundColor: theme.colors.divider, marginVertical: 20 },
    roleGrid: { flexDirection: 'row', gap: 12, marginBottom: 40 },
    roleCard: { flex: 1, backgroundColor: theme.colors.card, borderWidth: 1.5, borderColor: theme.colors.cardSecondary, borderRadius: 16, padding: 20, alignItems: 'center', gap: 10, position: 'relative' },
    selectedRoleCard: { borderColor: theme.colors.primary, backgroundColor: 'rgba(245,197,24,0.06)' },
    roleEmoji: { fontSize: 28 },
    roleLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.text, textAlign: 'center' },
    roleSub: { fontSize: 10, color: theme.colors.textSecondary, textAlign: 'center' },
    roleCheck: { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
    roleCheckText: { color: theme.colors.black, fontSize: 10, fontWeight: '900' },
    continueBtn: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 14, alignItems: 'center' },
    continueText: { fontSize: 15, fontWeight: '700', color: theme.colors.black, letterSpacing: 0.5 },
});

export default LanguageRoleScreen;
