import React, { useState, useEffect, useMemo } from 'react';
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
import { useAppTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../utils/theme';
import { useAuth } from '../../context/AuthContext';
import { STORAGE_KEYS } from '../../utils/constants';
import { useLanguage } from '../../context/LanguageContext';
import apiService from '../../services/api';
import GooglePlacesInput from '../../components/GooglePlacesInput';

// Get Google Maps API key from environment
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserData {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    gender?: string;
    pinkPassActive?: boolean;
    homeAddress?: string;
    workAddress?: string;
    emergencyContacts?: { _id?: string; name: string; phone: string; relation?: string }[];
}

// Avatar background colours for contact initials (cycles through)
const AVATAR_COLORS = ['#F5C518', '#EC4899', '#22C55E', '#3B82F6', '#8B5CF6'];

// ─── Component ────────────────────────────────────────────────────────────────

const ProfileScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { logout } = useAuth();
    const { t } = useLanguage();
    const { theme, toggleTheme, themeType, isDark } = useAppTheme();
    const s = useMemo(() => makeStyles(theme), [theme]);

    // ── User state ────────────────────────────────────────────────────────────
    const [user, setUser] = useState<UserData>({});
    const [emergencyContacts, setEmergencyContacts] = useState<
        { _id?: string; name: string; phone: string; relation?: string }[]
    >([]);

    // ── Editable personal-info fields ─────────────────────────────────────────
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [gender, setGender] = useState<'female' | 'male' | ''>('');
    const [homeAddress, setHomeAddress] = useState('');
    const [workAddress, setWorkAddress] = useState('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // ── Add-contact modal state ───────────────────────────────────────────────
    const [showAddContact, setShowAddContact] = useState(false);
    const [newContactName, setNewContactName] = useState('');
    const [newContactPhone, setNewContactPhone] = useState('');
    const [newContactRelation, setNewContactRelation] = useState('');
    const [isSavingContact, setIsSavingContact] = useState(false);

    // ─── Load user data ───────────────────────────────────────────────────────

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            // Instant display from cache
            const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
            if (raw) {
                const parsed: UserData = JSON.parse(raw);
                applyUserData(parsed);
            }
            // Then refresh from API
            const response = await apiService.get('/auth/me');
            if (response.success && response.user) {
                applyUserData(response.user);
                await AsyncStorage.setItem(
                    STORAGE_KEYS.USER_DATA,
                    JSON.stringify(response.user),
                );
            }
        } catch {
            // Offline — keep cached values
        }
    };

    const applyUserData = (data: UserData) => {
        setUser(data);
        setFullName(data.name || '');
        setEmail(data.email || '');
        if (data.gender) {
            const g = data.gender.toLowerCase();
            if (g === 'female' || g === 'male') {
                setGender(g as 'female' | 'male');
            }
        }
        setHomeAddress(data.homeAddress || '');
        setWorkAddress(data.workAddress || '');
        if (data.emergencyContacts) setEmergencyContacts(data.emergencyContacts);
    };

    // ─── Save personal info ───────────────────────────────────────────────────

    const handleSave = async () => {
        if (!fullName.trim()) {
            Alert.alert('Error', 'Full name cannot be empty.');
            return;
        }
        setIsSavingProfile(true);
        try {
            const response = await apiService.patch('/auth/profile', {
                name: fullName.trim(),
                email: email.trim(),
                gender: gender, // already lowercase
                homeAddress: homeAddress.trim(),
                workAddress: workAddress.trim(),
            });
            if (response.success && response.user) {
                // Update local state with the actual user returned from server
                applyUserData(response.user);
                await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response.user));
                Alert.alert('Success', 'Profile updated successfully!');
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not save profile.');
        } finally {
            setIsSavingProfile(false);
        }
    };

    // ─── Location Logic ───────────────────────────────────────────────────────

    const handleCurrentLocation = (type: 'home' | 'work') => {
        if (!GOOGLE_MAPS_API_KEY) {
            Alert.alert('Configuration Error', 'Google Maps API key is missing. Please check Vercel environment variables.');
            return;
        }

        if (!navigator.geolocation) {
            Alert.alert('Error', 'Geolocation is not supported by your browser.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                try {
                    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
                    const response = await fetch(url);
                    const data = await response.json();
                    
                    if (data.status === 'OK' && data.results[0]) {
                        const addr = data.results[0].formatted_address;
                        if (type === 'home') setHomeAddress(addr);
                        else setWorkAddress(addr);
                    } else {
                        Alert.alert('Location Error', `Google API returned: ${data.status || 'No results'}`);
                    }
                } catch (e) {
                    Alert.alert('Network Error', 'Failed to connect to Google Services.');
                }
            },
            (err) => Alert.alert('GPS Error', `Could not get location: ${err.message}. Please enable GPS and allow permissions.`),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // ─── Add emergency contact ────────────────────────────────────────────────

    const handleAddContact = async () => {
        if (!newContactName.trim() || !newContactPhone.trim()) {
            Alert.alert('Error', 'Please enter both name and phone number.');
            return;
        }
        if (emergencyContacts.length >= 3) {
            Alert.alert('Limit Reached', 'You can only have up to 3 emergency contacts.');
            return;
        }
        setIsSavingContact(true);
        try {
            const newContacts = [
                ...emergencyContacts,
                {
                    name: newContactName.trim(),
                    phone: newContactPhone.trim(),
                    relation: newContactRelation.trim() || undefined,
                },
            ];
            const response = await apiService.patch('/auth/emergency-contacts', {
                contacts: newContacts,
            });
            if (response.success) {
                setEmergencyContacts(response.emergencyContacts || newContacts);
                setShowAddContact(false);
                setNewContactName('');
                setNewContactPhone('');
                setNewContactRelation('');
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not save emergency contact.');
        } finally {
            setIsSavingContact(false);
        }
    };

    // ─── Delete emergency contact ─────────────────────────────────────────────

    const handleDeleteContact = async (indexToRemove: number) => {
        Alert.alert(
            'Remove Contact',
            'Are you sure you want to remove this emergency contact?',
            [
                { text: t.cancel, style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        const newContacts = emergencyContacts.filter(
                            (_, i) => i !== indexToRemove,
                        );
                        try {
                            const response = await apiService.patch('/auth/emergency-contacts', {
                                contacts: newContacts,
                            });
                            if (response.success) {
                                setEmergencyContacts(
                                    response.emergencyContacts || newContacts,
                                );
                            }
                        } catch {
                            Alert.alert('Error', 'Could not remove contact.');
                        }
                    },
                },
            ],
        );
    };

    // ─── Logout ───────────────────────────────────────────────────────────────

    const handleLogout = () => {
        Alert.alert(t.logoutBtn, t.logoutConfirm, [
            { text: t.cancel, style: 'cancel' },
            {
                text: t.logoutBtn,
                style: 'destructive',
                onPress: async () => {
                    await logout();
                },
            },
        ]);
    };

    // ─── Derived display values ───────────────────────────────────────────────

    const displayName = user.name || 'SAFORA User';
    const displayPhone = user.phone || 'Not provided';
    const avatarLetter = displayName.charAt(0).toUpperCase();
    const hasPinkPass = !!user.pinkPassActive;

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <View style={s.root}>

            {/* ── Header ─────────────────────────────────────────────────── */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Text style={s.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={s.headerTitle}>MY PROFILE</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={s.scroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >

                {/* ── Avatar + name + phone ─────────────────────────────── */}
                <View style={s.avatarSection}>
                    <View style={s.avatarCircle}>
                        <Text style={s.avatarLetter}>{avatarLetter}</Text>
                    </View>
                    <Text style={s.userName}>{displayName}</Text>
                    <Text style={s.userPhone}>{displayPhone}</Text>
                    {hasPinkPass && (
                        <View style={s.pinkBadge}>
                            <Text style={s.pinkBadgeText}>Pink Pass Active</Text>
                        </View>
                    )}
                </View>

                {/* ── Divider ───────────────────────────────────────────── */}
                <View style={s.divider} />

                {/* ── Personal Information ──────────────────────────────── */}
                <Text style={s.sectionLabel}>PERSONAL INFORMATION</Text>

                {/* Full Name */}
                <View style={s.fieldBlock}>
                    <Text style={s.fieldLabel}>FULL NAME</Text>
                    <TextInput
                        style={s.fieldInput}
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="Enter your full name"
                        placeholderTextColor={theme.colors.placeholder}
                    />
                </View>

                {/* Email */}
                <View style={s.fieldBlock}>
                    <Text style={s.fieldLabel}>EMAIL</Text>
                    <TextInput
                        style={s.fieldInput}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="you@example.com"
                        placeholderTextColor={theme.colors.placeholder}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>

                {/* Gender toggle */}
                <View style={s.fieldBlock}>
                    <Text style={s.fieldLabel}>GENDER</Text>
                    <View style={s.genderRow}>
                        <TouchableOpacity
                            style={[s.genderPill, gender === 'female' && s.genderPillActive]}
                            onPress={() => setGender('female')}
                        >
                            <Text
                                style={[
                                    s.genderPillText,
                                    gender === 'female' && s.genderPillTextActive,
                                ]}
                            >
                                Female
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[s.genderPill, gender === 'male' && s.genderPillActive]}
                            onPress={() => setGender('male')}
                        >
                            <Text
                                style={[
                                    s.genderPillText,
                                    gender === 'male' && s.genderPillTextActive,
                                ]}
                            >
                                Male
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Theme toggle */}
                <View style={s.fieldBlock}>
                    <Text style={s.fieldLabel}>{t.appearance || 'APPEARANCE'}</Text>
                    <View style={s.genderRow}>
                        <TouchableOpacity
                            style={[s.genderPill, !isDark && s.genderPillActive]}
                            onPress={() => themeType === 'dark' && toggleTheme()}
                        >
                            <Text style={[s.genderPillText, !isDark && s.genderPillTextActive]}>
                                {t.lightMode || 'Light'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[s.genderPill, isDark && s.genderPillActive]}
                            onPress={() => themeType === 'light' && toggleTheme()}
                        >
                            <Text style={[s.genderPillText, isDark && s.genderPillTextActive]}>
                                {t.darkMode || 'Dark'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Saved Locations ───────────────────────────────────── */}
                <Text style={s.sectionLabel}>SAVED LOCATIONS</Text>

                {/* Home Address */}
                <View style={[s.fieldBlock, { zIndex: 300 }]}>
                    <View style={s.labelRow}>
                        <Text style={s.fieldLabel}>HOME ADDRESS</Text>
                        <TouchableOpacity onPress={() => handleCurrentLocation('home')}>
                            <Text style={s.currentLocLink}>📍 USE CURRENT LOCATION</Text>
                        </TouchableOpacity>
                    </View>
                    <GooglePlacesInput
                        placeholder="Search for your home"
                        apiKey={GOOGLE_MAPS_API_KEY}
                        initialValue={homeAddress}
                        onPlaceSelected={(p) => setHomeAddress(p.address)}
                        icon="🏠"
                    />
                </View>

                {/* Work Address */}
                <View style={[s.fieldBlock, { zIndex: 200 }]}>
                    <View style={s.labelRow}>
                        <Text style={s.fieldLabel}>WORK ADDRESS</Text>
                        <TouchableOpacity onPress={() => handleCurrentLocation('work')}>
                            <Text style={s.currentLocLink}>📍 USE CURRENT LOCATION</Text>
                        </TouchableOpacity>
                    </View>
                    <GooglePlacesInput
                        placeholder="Search for your work"
                        apiKey={GOOGLE_MAPS_API_KEY}
                        initialValue={workAddress}
                        onPlaceSelected={(p) => setWorkAddress(p.address)}
                        icon="🏢"
                    />
                </View>

                {/* Save Changes button */}
                <TouchableOpacity
                    style={[s.saveBtn, isSavingProfile && s.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={isSavingProfile}
                >
                    {isSavingProfile ? (
                        <ActivityIndicator color={theme.colors.black} />
                    ) : (
                        <Text style={s.saveBtnText}>Save Changes</Text>
                    )}
                </TouchableOpacity>

                {/* ── Divider ───────────────────────────────────────────── */}
                <View style={s.divider} />

                {/* ── Emergency Contacts ────────────────────────────────── */}
                <Text style={s.sectionLabel}>EMERGENCY CONTACTS</Text>

                {emergencyContacts.map((contact, index) => {
                    const initial = contact.name.charAt(0).toUpperCase();
                    const circleColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
                    return (
                        <View key={contact._id ?? index} style={s.contactCard}>
                            {/* Coloured circle initial */}
                            <View style={[s.contactCircle, { backgroundColor: circleColor }]}>
                                <Text style={s.contactInitial}>{initial}</Text>
                            </View>

                            {/* Name · Relation · Phone */}
                            <View style={s.contactInfo}>
                                <Text style={s.contactName}>{contact.name}</Text>
                                <Text style={s.contactMeta}>
                                    {contact.relation ? `${contact.relation} · ` : ''}
                                    {contact.phone}
                                </Text>
                            </View>

                            {/* Green phone button */}
                            <TouchableOpacity
                                style={s.phoneBtn}
                                onPress={() => {/* dial if needed */}}
                                accessibilityLabel="Call contact"
                            >
                                <Text style={s.phoneBtnText}>📞</Text>
                            </TouchableOpacity>

                            {/* Red delete button */}
                            <TouchableOpacity
                                style={s.deleteBtn}
                                onPress={() => handleDeleteContact(index)}
                                accessibilityLabel="Remove contact"
                            >
                                <Text style={s.deleteBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}

                {/* Add contact row */}
                {emergencyContacts.length < 3 && (
                    <TouchableOpacity
                        style={s.addContactRow}
                        onPress={() => setShowAddContact(true)}
                    >
                        <Text style={s.addContactPlus}>+</Text>
                        <Text style={s.addContactText}>Add Emergency Contact</Text>
                    </TouchableOpacity>
                )}

                {/* ── Divider ───────────────────────────────────────────── */}
                <View style={s.divider} />

                {/* ── Sign Out ──────────────────────────────────────────── */}
                <TouchableOpacity style={s.signOutBtn} onPress={handleLogout}>
                    <Text style={s.signOutText}>{t.logoutBtn}</Text>
                </TouchableOpacity>

                <View style={{ height: 32 }} />
            </ScrollView>

            {/* ── Add Contact Modal ──────────────────────────────────────────── */}
            <Modal visible={showAddContact} transparent animationType="slide">
                <View style={s.modalOverlay}>
                    <View style={s.modalCard}>
                        <Text style={s.modalTitle}>Add Emergency Contact</Text>
                        <Text style={s.modalSub}>
                            They will receive an SMS if you trigger an SOS.
                        </Text>

                        <TextInput
                            style={s.modalInput}
                            placeholder="Contact Name"
                            placeholderTextColor={theme.colors.placeholder}
                            value={newContactName}
                            onChangeText={setNewContactName}
                        />
                        <TextInput
                            style={s.modalInput}
                            placeholder="Phone Number (e.g. 03001234567)"
                            placeholderTextColor={theme.colors.placeholder}
                            keyboardType="phone-pad"
                            value={newContactPhone}
                            onChangeText={setNewContactPhone}
                        />
                        <TextInput
                            style={s.modalInput}
                            placeholder="Relation (e.g. Sister, Mother) — optional"
                            placeholderTextColor={theme.colors.placeholder}
                            value={newContactRelation}
                            onChangeText={setNewContactRelation}
                        />

                        <View style={s.modalActionRow}>
                            <TouchableOpacity
                                style={s.modalCancelBtn}
                                onPress={() => {
                                    setShowAddContact(false);
                                    setNewContactName('');
                                    setNewContactPhone('');
                                    setNewContactRelation('');
                                }}
                            >
                                <Text style={s.modalCancelText}>{t.cancel}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[s.modalSaveBtn, isSavingContact && s.saveBtnDisabled]}
                                onPress={handleAddContact}
                                disabled={isSavingContact}
                            >
                                {isSavingContact ? (
                                    <ActivityIndicator color={theme.colors.black} />
                                ) : (
                                    <Text style={s.modalSaveText}>Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (t: AppTheme) =>
    StyleSheet.create({
        // ── Root & Header ──────────────────────────────────────────────────
        root: {
            flex: 1,
            backgroundColor: t.colors.background,
        },
        header: {
            paddingTop: Platform.OS === 'ios' ? 52 : 40,
            paddingHorizontal: 20,
            paddingBottom: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: t.colors.background,
        },
        backBtn: {
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: t.colors.cardSecondary,
            alignItems: 'center',
            justifyContent: 'center',
        },
        backArrow: {
            fontSize: 20,
            color: t.colors.text,
            lineHeight: 24,
        },
        headerTitle: {
            fontSize: 15,
            fontWeight: '900',
            color: t.colors.text,
            letterSpacing: 2.5,
        },

        scroll: {
            paddingHorizontal: 20,
            paddingBottom: 24,
        },

        // ── Avatar section ─────────────────────────────────────────────────
        avatarSection: {
            alignItems: 'center',
            paddingVertical: 28,
        },
        avatarCircle: {
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: t.colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
        },
        avatarLetter: {
            fontSize: 38,
            fontWeight: '900',
            color: t.colors.black,
        },
        userName: {
            fontSize: 22,
            fontWeight: '900',
            color: t.colors.text,
            letterSpacing: 0.4,
            marginBottom: 4,
        },
        userPhone: {
            fontSize: 13,
            color: t.colors.textSecondary,
            marginBottom: 10,
        },
        pinkBadge: {
            backgroundColor: '#FFEEF6',
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 5,
            borderWidth: 1,
            borderColor: '#EC4899',
            marginTop: 4,
        },
        pinkBadgeText: {
            color: '#EC4899',
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.5,
        },

        // ── Divider ────────────────────────────────────────────────────────
        divider: {
            height: 1,
            backgroundColor: t.colors.divider,
            marginVertical: 20,
        },

        // ── Section label ──────────────────────────────────────────────────
        sectionLabel: {
            fontSize: 10,
            fontWeight: '800',
            color: t.colors.primary,
            letterSpacing: 2,
            marginBottom: 14,
        },

        // ── Form fields ────────────────────────────────────────────────────
        fieldBlock: {
            marginBottom: 14,
        },
        fieldLabel: {
            fontSize: 9,
            fontWeight: '800',
            color: t.colors.textSecondary,
            letterSpacing: 1.5,
            marginBottom: 6,
        },
        fieldInput: {
            backgroundColor: t.colors.inputBg,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 14,
            fontWeight: '500',
            color: t.colors.text,
            borderWidth: 1,
            borderColor: t.colors.border,
        },

        // ── Gender toggle ──────────────────────────────────────────────────
        genderRow: {
            flexDirection: 'row',
            gap: 10,
        },
        genderPill: {
            flex: 1,
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: 'center',
            backgroundColor: t.colors.inputBg,
            borderWidth: 1,
            borderColor: t.colors.border,
        },
        genderPillActive: {
            backgroundColor: t.colors.primary,
            borderColor: t.colors.primary,
        },
        genderPillText: {
            fontSize: 13,
            fontWeight: '600',
            color: t.colors.textSecondary,
        },
        genderPillTextActive: {
            color: t.colors.black,
            fontWeight: '800',
        },

        // ── Save Changes button ────────────────────────────────────────────
        saveBtn: {
            backgroundColor: t.colors.primary,
            borderRadius: 14,
            paddingVertical: 15,
            alignItems: 'center',
            marginTop: 6,
        },
        saveBtnDisabled: {
            opacity: 0.55,
        },
        saveBtnText: {
            fontSize: 14,
            fontWeight: '800',
            color: t.colors.black,
            letterSpacing: 0.3,
        },

        // ── Emergency contact card ─────────────────────────────────────────
        contactCard: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: t.colors.cardSecondary,
            borderRadius: 14,
            padding: 12,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: t.colors.border,
        },
        contactCircle: {
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
        },
        contactInitial: {
            fontSize: 17,
            fontWeight: '900',
            color: t.colors.black,
        },
        contactInfo: {
            flex: 1,
        },
        contactName: {
            fontSize: 14,
            fontWeight: '700',
            color: t.colors.text,
            marginBottom: 2,
        },
        contactMeta: {
            fontSize: 12,
            color: t.colors.textSecondary,
        },
        phoneBtn: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#DCFCE7',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
        },
        phoneBtnText: {
            fontSize: 15,
        },
        deleteBtn: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#FEE2E2',
            alignItems: 'center',
            justifyContent: 'center',
        },
        deleteBtnText: {
            fontSize: 14,
            fontWeight: '900',
            color: t.colors.danger,
        },

        // ── Add contact row ────────────────────────────────────────────────
        addContactRow: {
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1.5,
            borderColor: t.colors.primary,
            borderStyle: 'dashed',
            borderRadius: 14,
            paddingVertical: 15,
            paddingHorizontal: 18,
            marginBottom: 4,
            gap: 10,
        },
        addContactPlus: {
            fontSize: 20,
            fontWeight: '900',
            color: t.colors.primary,
            lineHeight: 22,
        },
        addContactText: {
            fontSize: 13,
            fontWeight: '700',
            color: t.colors.primary,
        },

        // ── Sign Out button ────────────────────────────────────────────────
        signOutBtn: {
            borderWidth: 1.5,
            borderColor: t.colors.danger,
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: 'center',
            marginTop: 4,
        },
        signOutText: {
            color: t.colors.danger,
            fontSize: 14,
            fontWeight: '700',
            letterSpacing: 0.4,
        },

        // ── Modal ──────────────────────────────────────────────────────────
        modalOverlay: {
            flex: 1,
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.55)',
            padding: 24,
        },
        modalCard: {
            backgroundColor: t.colors.card,
            borderRadius: 24,
            padding: 24,
            borderWidth: 1,
            borderColor: t.colors.border,
            ...(t.shadows.dark as object),
        },
        modalTitle: {
            fontSize: 20,
            fontWeight: '900',
            color: t.colors.text,
            marginBottom: 6,
        },
        modalSub: {
            fontSize: 12,
            color: t.colors.textSecondary,
            marginBottom: 20,
            lineHeight: 18,
        },
        modalInput: {
            backgroundColor: t.colors.inputBg,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 14,
            color: t.colors.text,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: t.colors.border,
        },
        modalActionRow: {
            flexDirection: 'row',
            gap: 12,
            marginTop: 8,
        },
        modalCancelBtn: {
            flex: 1,
            paddingVertical: 15,
            alignItems: 'center',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: t.colors.border,
        },
        modalCancelText: {
            color: t.colors.text,
            fontWeight: '700',
            fontSize: 13,
        },
        modalSaveBtn: {
            flex: 1,
            paddingVertical: 15,
            alignItems: 'center',
            borderRadius: 12,
            backgroundColor: t.colors.primary,
        },
        modalSaveText: {
            color: t.colors.black,
            fontWeight: '800',
            fontSize: 13,
        },
        labelRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
        },
        currentLocLink: {
            fontSize: 11,
            fontWeight: '800',
            color: t.colors.secondary,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
    });

export default ProfileScreen;
