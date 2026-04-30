import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Platform,
    Modal,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../../utils/theme';
import { useAuth } from '../../context/AuthContext';
import { STORAGE_KEYS } from '../../utils/constants';
import { useLanguage } from '../../context/LanguageContext';
import apiService from '../../services/api';

interface UserData {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    emergencyContacts?: { _id?: string, name: string, phone: string }[];
}

const ProfileScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { logout } = useAuth();
    const { t } = useLanguage();
    const [user, setUser] = useState<UserData>({});
    const [emergencyContacts, setEmergencyContacts] = useState<{name: string, phone: string}[]>([]);
    
    // Add Contact Modal State
    const [showAddContact, setShowAddContact] = useState(false);
    const [newContactName, setNewContactName] = useState('');
    const [newContactPhone, setNewContactPhone] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            // First load from storage for instant display
            const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
            if (raw) {
                const parsed = JSON.parse(raw);
                setUser(parsed);
                if (parsed.emergencyContacts) setEmergencyContacts(parsed.emergencyContacts);
            }
            // Then fetch fresh from API
            const response = await apiService.get('/auth/me');
            if (response.success && response.user) {
                setUser(response.user);
                setEmergencyContacts(response.user.emergencyContacts || []);
                await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response.user));
            }
        } catch {
            // ignore API error if offline
        }
    };

    const handleSaveContact = async () => {
        if (!newContactName.trim() || !newContactPhone.trim()) {
            Alert.alert('Error', 'Please enter both name and phone number.');
            return;
        }
        if (emergencyContacts.length >= 3) {
            Alert.alert('Limit Reached', 'You can only have up to 3 emergency contacts.');
            return;
        }

        setIsSaving(true);
        try {
            const newContacts = [...emergencyContacts, { name: newContactName.trim(), phone: newContactPhone.trim() }];
            const response = await apiService.patch('/auth/emergency-contacts', { contacts: newContacts });
            if (response.success) {
                setEmergencyContacts(response.emergencyContacts || newContacts);
                setShowAddContact(false);
                setNewContactName('');
                setNewContactPhone('');
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not save emergency contact.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveContact = async (indexToRemove: number) => {
        Alert.alert('Remove Contact', 'Are you sure you want to remove this emergency contact?', [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Remove', 
                style: 'destructive',
                onPress: async () => {
                    const newContacts = emergencyContacts.filter((_, i) => i !== indexToRemove);
                    try {
                        const response = await apiService.patch('/auth/emergency-contacts', { contacts: newContacts });
                        if (response.success) setEmergencyContacts(response.emergencyContacts || newContacts);
                    } catch (e: any) {
                        Alert.alert('Error', 'Could not remove contact.');
                    }
                }
            }
        ]);
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

                {/* Emergency Contacts */}
                <View style={styles.contactsCard}>
                    <View style={styles.contactsHeader}>
                        <Text style={styles.contactsTitle}>🚨 Emergency Contacts</Text>
                        <Text style={styles.contactsCount}>{emergencyContacts.length}/3</Text>
                    </View>
                    <Text style={styles.contactsDesc}>
                        These contacts will be notified automatically if you trigger an SOS during a ride.
                    </Text>

                    {emergencyContacts.map((contact, index) => (
                        <View key={index} style={styles.contactItem}>
                            <View style={styles.contactAvatar}>
                                <Text style={styles.contactAvatarText}>{contact.name.charAt(0)}</Text>
                            </View>
                            <View style={styles.contactInfo}>
                                <Text style={styles.contactName}>{contact.name}</Text>
                                <Text style={styles.contactPhone}>{contact.phone}</Text>
                            </View>
                            <TouchableOpacity style={styles.removeContactBtn} onPress={() => handleRemoveContact(index)}>
                                <Text style={styles.removeContactText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    ))}

                    {emergencyContacts.length < 3 && (
                        <TouchableOpacity style={styles.addContactBtn} onPress={() => setShowAddContact(true)}>
                            <Text style={styles.addContactText}>+ Add Emergency Contact</Text>
                        </TouchableOpacity>
                    )}
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

            {/* Add Contact Modal */}
            <Modal visible={showAddContact} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Add Emergency Contact</Text>
                        <Text style={styles.modalSub}>They will receive an SMS if you trigger an SOS.</Text>
                        
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Contact Name"
                            placeholderTextColor={theme.colors.placeholder}
                            value={newContactName}
                            onChangeText={setNewContactName}
                        />
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Phone Number (e.g. 03001234567)"
                            placeholderTextColor={theme.colors.placeholder}
                            keyboardType="phone-pad"
                            value={newContactPhone}
                            onChangeText={setNewContactPhone}
                        />

                        <View style={styles.modalActionRow}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAddContact(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalSaveBtn, isSaving && { opacity: 0.6 }]} 
                                onPress={handleSaveContact}
                                disabled={isSaving}
                            >
                                {isSaving ? <ActivityIndicator color="#000" /> : <Text style={styles.modalSaveText}>Save</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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

    contactsCard: {
        backgroundColor: theme.colors.card, borderRadius: 16,
        padding: 20, marginBottom: 16,
        borderWidth: 1, borderColor: '#1E1E1E',
    },
    contactsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    contactsTitle: { fontSize: 16, fontWeight: '900', color: theme.colors.text },
    contactsCount: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
    contactsDesc: { fontSize: 11, color: theme.colors.textSecondary, marginBottom: 16, lineHeight: 16 },
    contactItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', padding: 12, borderRadius: 12, marginBottom: 10 },
    contactAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    contactAvatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
    contactInfo: { flex: 1 },
    contactName: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 2 },
    contactPhone: { fontSize: 12, color: theme.colors.textSecondary },
    removeContactBtn: { padding: 8 },
    removeContactText: { color: theme.colors.danger, fontSize: 16, fontWeight: '900' },
    addContactBtn: { borderWidth: 1.5, borderColor: theme.colors.primary, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
    addContactText: { color: theme.colors.primary, fontSize: 13, fontWeight: '700' },

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

    modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', padding: 24 },
    modalCard: { backgroundColor: theme.colors.card, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#333' },
    modalTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.text, marginBottom: 6 },
    modalSub: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 20 },
    modalInput: { backgroundColor: '#111', borderRadius: 12, padding: 16, color: theme.colors.text, fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: '#222' },
    modalActionRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
    modalCancelBtn: { flex: 1, paddingVertical: 16, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#333' },
    modalCancelText: { color: theme.colors.text, fontWeight: '700' },
    modalSaveBtn: { flex: 1, paddingVertical: 16, alignItems: 'center', borderRadius: 12, backgroundColor: theme.colors.primary },
    modalSaveText: { color: '#000', fontWeight: '800' },
});

export default ProfileScreen;
