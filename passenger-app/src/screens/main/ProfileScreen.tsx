import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../../utils/theme';
import { useAuth } from '../../context/AuthContext';
import { STORAGE_KEYS } from '../../utils/constants';
import { useLanguage } from '../../context/LanguageContext';

interface UserData {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
}

const ProfileScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { logout } = useAuth();
    const { t } = useLanguage();
    const [user, setUser] = useState<UserData>({});

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
            if (raw) setUser(JSON.parse(raw));
        } catch {
            // ignore
        }
    };

    const handleLogout = () => {
        Alert.alert(
            t.logoutBtn,
            t.logoutConfirm,
            [
                { text: t.cancel, style: 'cancel' },
                {
                    text: t.logoutBtn,
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                    },
                },
            ]
        );
    };

    const displayName = user.name || 'SAFORA User';
    const displayEmail = user.email || 'Not provided';
    const displayPhone = user.phone || 'Not provided';
    const displayRole = user.role
        ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
        : 'Passenger';
    const avatarLetter = displayName.charAt(0).toUpperCase();

    const menuItems = [
        { icon: '🎀', label: t.pinkPassMenu, sub: t.pinkPassSub, onPress: () => navigation.navigate('PinkPass') },
        { icon: '🔔', label: t.notificationsMenu, sub: t.notificationsSub, onPress: () => {} },
        { icon: '🛡️', label: t.safetyCenterMenu, sub: t.safetyMenuSub, onPress: () => navigation.navigate('Safety') },
        { icon: '💳', label: t.paymentMenu, sub: t.paymentSub, onPress: () => {} },
        { icon: '📋', label: t.historyMenu, sub: t.historySub, onPress: () => navigation.navigate('RideHistory') },
        { icon: '❓', label: t.helpMenu, sub: t.helpSub, onPress: () => {} },
    ];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t.profileTitle}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* Avatar Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{avatarLetter}</Text>
                    </View>
                    <Text style={styles.profileName}>{displayName}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{displayRole}</Text>
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>47</Text>
                            <Text style={styles.statLabel}>{t.completedRides}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>4.9 ⭐</Text>
                            <Text style={styles.statLabel}>{t.rating}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>2</Text>
                            <Text style={styles.statLabel}>{t.saved}</Text>
                        </View>
                    </View>
                </View>

                {/* Contact Info */}
                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoIcon}>✉️</Text>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>{t.emailInfo}</Text>
                            <Text style={styles.infoValue}>{displayEmail}</Text>
                        </View>
                    </View>
                    <View style={styles.infoDivider} />
                    <View style={styles.infoRow}>
                        <Text style={styles.infoIcon}>📱</Text>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>{t.phoneInfo}</Text>
                            <Text style={styles.infoValue}>{displayPhone}</Text>
                        </View>
                    </View>
                </View>

                {/* Menu Items */}
                <View style={styles.menuCard}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.menuItem,
                                index < menuItems.length - 1 && styles.menuItemBorder,
                            ]}
                            onPress={item.onPress}
                        >
                            <Text style={styles.menuIcon}>{item.icon}</Text>
                            <View style={styles.menuContent}>
                                <Text style={styles.menuLabel}>{item.label}</Text>
                                <Text style={styles.menuSub}>{item.sub}</Text>
                            </View>
                            <Text style={styles.menuArrow}>›</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* App Version */}
                <Text style={styles.versionText}>SAFORA v1.0.0 — FYP26-CS-G11</Text>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Text style={styles.logoutText}>{t.logoutBtn}</Text>
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
        paddingTop: Platform.OS === 'ios' ? 50 : 40,
        paddingHorizontal: 20, paddingBottom: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: theme.colors.card,
        alignItems: 'center', justifyContent: 'center',
    },
    backText: { color: theme.colors.text, fontSize: 20 },
    headerTitle: {
        fontSize: 16, fontWeight: '900',
        color: theme.colors.text, letterSpacing: 2,
    },
    scroll: { paddingHorizontal: 20, paddingBottom: 40 },

    profileCard: {
        backgroundColor: theme.colors.card, borderRadius: 20,
        padding: 24, marginBottom: 16, alignItems: 'center',
        borderWidth: 1, borderColor: '#1E1E1E',
    },
    avatar: {
        width: 84, height: 84, borderRadius: 42,
        backgroundColor: theme.colors.primary,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
    },
    avatarText: { fontSize: 36, fontWeight: '900', color: theme.colors.black },
    profileName: {
        fontSize: 22, fontWeight: '900', color: theme.colors.text,
        marginBottom: 8, letterSpacing: 0.5,
    },
    roleBadge: {
        backgroundColor: 'rgba(245,197,24,0.12)',
        borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4,
        borderWidth: 1, borderColor: 'rgba(245,197,24,0.25)',
        marginBottom: 20,
    },
    roleText: { color: theme.colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
    statsRow: {
        flexDirection: 'row', width: '100%',
        justifyContent: 'space-around', alignItems: 'center',
        paddingTop: 16, borderTopWidth: 1, borderTopColor: '#1E1E1E',
    },
    statItem: { alignItems: 'center' },
    statValue: { color: theme.colors.text, fontSize: 16, fontWeight: '900' },
    statLabel: { color: theme.colors.textSecondary, fontSize: 11, marginTop: 4 },
    statDivider: { width: 1, height: 30, backgroundColor: '#1E1E1E' },

    infoCard: {
        backgroundColor: theme.colors.card, borderRadius: 16,
        marginBottom: 16, overflow: 'hidden',
        borderWidth: 1, borderColor: '#1E1E1E',
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
    infoIcon: { fontSize: 18 },
    infoContent: { flex: 1 },
    infoLabel: {
        fontSize: 9, letterSpacing: 2, fontWeight: '800',
        color: theme.colors.textSecondary, marginBottom: 4,
    },
    infoValue: { color: theme.colors.text, fontSize: 13, fontWeight: '600' },
    infoDivider: { height: 1, backgroundColor: '#1E1E1E', marginLeft: 48 },

    menuCard: {
        backgroundColor: theme.colors.card, borderRadius: 16,
        marginBottom: 20, overflow: 'hidden',
        borderWidth: 1, borderColor: '#1E1E1E',
    },
    menuItem: {
        flexDirection: 'row', alignItems: 'center',
        padding: 16, gap: 14,
    },
    menuItemBorder: { borderBottomWidth: 1, borderBottomColor: '#1E1E1E' },
    menuIcon: { fontSize: 20, width: 24, textAlign: 'center' },
    menuContent: { flex: 1 },
    menuLabel: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
    menuSub: { color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 },
    menuArrow: { color: theme.colors.textSecondary, fontSize: 20 },

    versionText: {
        textAlign: 'center', color: theme.colors.textSecondary,
        fontSize: 11, marginBottom: 16,
    },
    logoutBtn: {
        borderWidth: 1.5, borderColor: theme.colors.danger,
        borderRadius: 14, paddingVertical: 14,
        alignItems: 'center',
    },
    logoutText: {
        color: theme.colors.danger, fontSize: 14,
        fontWeight: '700', letterSpacing: 0.5,
    },
});

export default ProfileScreen;
