import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, ActivityIndicator, Platform, Alert,
    RefreshControl, Image, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../utils/theme';
import apiService from '../../services/api';
import { STORAGE_KEYS } from '../../utils/constants';

interface DriverProfile {
    name: string;
    phone: string;
    email: string;
    gender: string;
    rating: number;
    totalRides: number;
    totalEarnings: number;
    licenseNumber: string;
    cnic: string;
    vehicleType: string;
    vehicle: { make: string; model: string; year: number; color: string; plateNumber: string };
    pinkPassStatus: 'none' | 'pending_review' | 'approved' | 'rejected';
    backgroundCheck: { status: string };
    joinedAt: string;
}

const DriverProfileScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { theme, toggleTheme, isDark } = useAppTheme();
    const s = makeStyles(theme);

    const PINK_STATUS_CONFIG = {
        none:           { label: 'Not Applied',  color: theme.colors.textSecondary, bg: theme.dark ? '#1A1A1A' : '#F5F5F5', icon: '—' },
        pending_review: { label: 'Under Review', color: '#FFA000', bg: 'rgba(255,160,0,0.1)', icon: '⏳' },
        approved:       { label: 'Certified',    color: '#00E676', bg: 'rgba(0,230,118,0.1)', icon: '✓' },
        rejected:       { label: 'Rejected',     color: theme.colors.danger, bg: 'rgba(255,68,68,0.1)', icon: '✗' },
    };

    const [profile, setProfile]             = useState<DriverProfile | null>(null);
    const [loading, setLoading]             = useState(true);
    const [refreshing, setRefreshing]       = useState(false);
    const [localUser, setLocalUser]         = useState<any>(null);
    const [updating, setUpdating]           = useState(false);
    const [photoUploading, setPhotoUploading] = useState(false);
    const [profilePicture, setProfilePicture] = useState('');

    // Name editing
    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput]     = useState('');
    const [savingName, setSavingName]   = useState(false);

    const loadProfile = useCallback(async () => {
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
            if (raw) {
                const u = JSON.parse(raw);
                setLocalUser(u);
                setNameInput(u.name || '');
                if (u.profilePicture) setProfilePicture(u.profilePicture);
            }
            const res: any = await apiService.get('/drivers/me');
            if (res.success) {
                setProfile(res.driver);
                setNameInput(res.driver.name || '');
                if (res.driver.profilePicture) setProfilePicture(res.driver.profilePicture);
                if (raw) {
                    const u = JSON.parse(raw);
                    if (res.driver.gender) u.gender = res.driver.gender;
                    if (res.driver.name)   u.name   = res.driver.name;
                    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(u));
                    setLocalUser(u);
                }
            }
        } catch (e) {
            console.log('[Profile] load error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadProfile(); }, [loadProfile]);

    // ── Name save ──
    const saveName = async () => {
        const trimmed = nameInput.trim();
        if (!trimmed) { Alert.alert('Invalid', 'Name cannot be empty.'); return; }
        setSavingName(true);
        try {
            const res: any = await apiService.post('/drivers/update-profile', { name: trimmed });
            if (res.success) {
                const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
                if (raw) {
                    const u = JSON.parse(raw);
                    u.name = trimmed;
                    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(u));
                    setLocalUser(u);
                }
                setProfile(prev => prev ? { ...prev, name: trimmed } : prev);
                setEditingName(false);
            }
        } catch (e: any) {
            Alert.alert('Update Failed', e.message || 'Could not update name.');
        } finally {
            setSavingName(false);
        }
    };

    // ── Gender save ──
    const updateGender = async (gender: string) => {
        setUpdating(true);
        try {
            const res: any = await apiService.post('/drivers/update-profile', { gender });
            if (res.success) {
                const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
                if (raw) {
                    const u = JSON.parse(raw);
                    u.gender = gender;
                    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(u));
                    setLocalUser(u);
                }
                setProfile(prev => prev ? { ...prev, gender } : prev);
            }
        } catch (e: any) {
            Alert.alert('Update Failed', e.message || 'Could not update gender.');
        } finally {
            setUpdating(false);
        }
    };

    // ── Photo upload — same pattern as passenger ProfileScreen ──
    const handlePhotoPress = () => {
        if (Platform.OS !== 'web') {
            Alert.alert('Upload Photo', 'This feature is available on web.');
            return;
        }
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e: any) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (event: any) => {
                // Compress to 400×400 max (same as passenger)
                const img = new window.Image();
                img.src = event.target.result;
                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    const MAX = 400;
                    let w = img.width, h = img.height;
                    if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
                    else       { if (h > MAX) { w *= MAX / h; h = MAX; } }
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
                    const compressed = canvas.toDataURL('image/jpeg', 0.7);

                    // Show immediately
                    setProfilePicture(compressed);
                    setPhotoUploading(true);
                    try {
                        const res: any = await apiService.post('/drivers/update-profile', { profilePicture: compressed });
                        if (res.success) {
                            const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
                            if (raw) {
                                const u = JSON.parse(raw);
                                u.profilePicture = compressed;
                                await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(u));
                            }
                        } else {
                            Alert.alert('Upload Failed', 'Could not save photo. Try again.');
                        }
                    } catch (err: any) {
                        Alert.alert('Upload Failed', err.message || 'Network error.');
                    } finally {
                        setPhotoUploading(false);
                    }
                };
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    // ── Logout ──
    const handleLogout = () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out', style: 'destructive',
                onPress: async () => {
                    await AsyncStorage.multiRemove([STORAGE_KEYS.AUTH_TOKEN, STORAGE_KEYS.USER_DATA]);
                    navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
                },
            },
        ]);
    };

    if (loading) {
        return (
            <View style={s.centered}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    const currentGender = profile?.gender || localUser?.gender || '';
    const pinkCfg = PINK_STATUS_CONFIG[profile?.pinkPassStatus ?? 'none'];
    const isFemale = currentGender === 'female';
    const canApplyPinkPass = isFemale && profile?.pinkPassStatus !== 'approved';
    const displayName = profile?.name ?? localUser?.name ?? 'Driver';

    return (
        <ScrollView
            style={s.container}
            contentContainerStyle={s.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => { setRefreshing(true); loadProfile(); }}
                    tintColor={theme.colors.primary}
                />
            }
        >
            <View style={s.header}>
                <Text style={s.headerTitle}>MY PROFILE</Text>
            </View>

            {/* Avatar + Name */}
            <View style={s.avatarSection}>
                <TouchableOpacity style={s.avatarContainer} onPress={handlePhotoPress} activeOpacity={0.8}>
                    <View style={s.avatar}>
                        {profilePicture ? (
                            <Image source={{ uri: profilePicture }} style={s.avatarPhoto} />
                        ) : (
                            <Text style={s.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
                        )}
                    </View>
                    <View style={s.editIconContainer}>
                        {photoUploading
                            ? <ActivityIndicator size="small" color={theme.colors.black} />
                            : <Text style={s.editIcon}>📷</Text>
                        }
                    </View>
                </TouchableOpacity>

                {/* Editable name */}
                {editingName ? (
                    <View style={s.nameEditRow}>
                        <TextInput
                            style={s.nameInput}
                            value={nameInput}
                            onChangeText={setNameInput}
                            autoFocus
                            placeholder="Enter your name"
                            placeholderTextColor={theme.colors.placeholder}
                        />
                        <TouchableOpacity style={s.nameSaveBtn} onPress={saveName} disabled={savingName}>
                            {savingName
                                ? <ActivityIndicator size="small" color={theme.colors.black} />
                                : <Text style={s.nameSaveBtnText}>Save</Text>
                            }
                        </TouchableOpacity>
                        <TouchableOpacity style={s.nameCancelBtn} onPress={() => { setEditingName(false); setNameInput(displayName); }}>
                            <Text style={s.nameCancelBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={s.nameRow} onPress={() => setEditingName(true)} activeOpacity={0.7}>
                        <Text style={s.driverName}>{displayName}</Text>
                        <Text style={s.nameEditIcon}>✏️</Text>
                    </TouchableOpacity>
                )}

                <Text style={s.driverPhone}>{profile?.phone ?? localUser?.phone ?? ''}</Text>

                <View style={s.ratingRow}>
                    <View style={s.ratingPill}>
                        <Text style={s.ratingIcon}>⭐</Text>
                        <Text style={s.ratingVal}>{profile?.rating?.toFixed(1) ?? '5.0'}</Text>
                    </View>
                    <View style={s.ratingPill}>
                        <Text style={s.ratingIcon}>🚗</Text>
                        <Text style={s.ratingVal}>{profile?.totalRides ?? 0} rides</Text>
                    </View>
                    <View style={s.ratingPill}>
                        <Text style={s.ratingIcon}>💰</Text>
                        <Text style={s.ratingVal}>RS {profile?.totalEarnings ?? 0}</Text>
                    </View>
                </View>
            </View>

            {/* App Preferences */}
            <View style={s.sectionCard}>
                <Text style={s.sectionTitle}>App Preferences</Text>
                <View style={s.infoRow}>
                    <Text style={s.infoLabel}>App Theme</Text>
                    <TouchableOpacity style={s.themePill} onPress={toggleTheme}>
                        <Text style={s.themePillText}>{isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}</Text>
                    </TouchableOpacity>
                </View>
                <View style={s.divider} />
                <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Gender</Text>
                    <View style={s.genderRow}>
                        {updating && <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginRight: 8 }} />}
                        <TouchableOpacity
                            style={[s.genderBtn, currentGender === 'male' && s.genderBtnActive]}
                            onPress={() => updateGender('male')}
                            disabled={updating}
                        >
                            <Text style={[s.genderBtnText, currentGender === 'male' && s.genderBtnTextActive]}>Male</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[s.genderBtn, currentGender === 'female' && s.genderBtnActive]}
                            onPress={() => updateGender('female')}
                            disabled={updating}
                        >
                            <Text style={[s.genderBtnText, currentGender === 'female' && s.genderBtnTextActive]}>Female</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Pink Pass Card */}
            <View style={s.sectionCard}>
                <View style={s.sectionHeader}>
                    <Text style={s.sectionTitle}>Pink Pass Status</Text>
                    <View style={[s.statusBadge, { backgroundColor: pinkCfg.bg }]}>
                        <Text style={[s.statusText, { color: pinkCfg.color }]}>{pinkCfg.icon} {pinkCfg.label}</Text>
                    </View>
                </View>

                {profile?.pinkPassStatus === 'approved' && (
                    <Text style={s.pinkCertText}>You are a certified Pink Pass driver. You will receive Pink Pass ride requests.</Text>
                )}
                {profile?.pinkPassStatus === 'pending_review' && (
                    <Text style={s.pinkPendingText}>Your application is being reviewed. This typically takes 24–48 hours.</Text>
                )}
                {profile?.pinkPassStatus === 'rejected' && (
                    <Text style={s.pinkRejectedText}>Application rejected. Re-apply with a clearer CNIC photo.</Text>
                )}
                {!isFemale && (profile?.pinkPassStatus === 'none' || !profile?.pinkPassStatus) && (
                    <Text style={s.pinkInfoText}>Pink Pass is exclusively for verified female drivers. Set Gender to Female above first.</Text>
                )}
                {isFemale && !profile?.pinkPassStatus && (
                    <Text style={s.pinkInfoText}>You are eligible. Tap below to apply for Pink Pass certification.</Text>
                )}

                {canApplyPinkPass && (
                    <TouchableOpacity style={s.pinkPassBtn} onPress={() => navigation.navigate('PinkPassDriver')}>
                        <Text style={s.pinkPassBtnText}>
                            {profile?.pinkPassStatus === 'rejected' ? '↺ Re-Apply for Pink Pass' : '🎀 Apply for Pink Pass'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Account Status */}
            <View style={s.sectionCard}>
                <Text style={s.sectionTitle}>Account Status</Text>
                <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Background Check</Text>
                    <Text style={[s.infoVal, profile?.backgroundCheck?.status === 'approved' ? { color: theme.colors.success } : { color: '#FFA000' }]}>
                        {profile?.backgroundCheck?.status === 'approved' ? '✓ Approved' : '⏳ Pending'}
                    </Text>
                </View>
                <View style={s.divider} />
                <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Member Since</Text>
                    <Text style={s.infoVal}>
                        {profile?.joinedAt ? new Date(profile.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
                    </Text>
                </View>
            </View>

            {/* Documents */}
            <View style={s.sectionCard}>
                <Text style={s.sectionTitle}>Documents</Text>
                <View style={s.infoRow}>
                    <Text style={s.infoLabel}>License Number</Text>
                    <Text style={s.infoVal}>{profile?.licenseNumber ?? '—'}</Text>
                </View>
                <View style={s.divider} />
                <View style={s.infoRow}>
                    <Text style={s.infoLabel}>CNIC</Text>
                    <Text style={s.infoVal}>{profile?.cnic ? `••••••••${profile.cnic.slice(-3)}` : '—'}</Text>
                </View>
            </View>

            {/* Vehicle */}
            {profile?.vehicle && (
                <View style={s.sectionCard}>
                    <Text style={s.sectionTitle}>Vehicle</Text>
                    <View style={s.vehicleGrid}>
                        {[
                            { label: 'MAKE',  val: profile.vehicle.make },
                            { label: 'MODEL', val: profile.vehicle.model },
                            { label: 'YEAR',  val: String(profile.vehicle.year) },
                            { label: 'COLOR', val: profile.vehicle.color },
                        ].map(item => (
                            <View key={item.label} style={s.vehicleItem}>
                                <Text style={s.vehicleLabel}>{item.label}</Text>
                                <Text style={s.vehicleVal}>{item.val}</Text>
                            </View>
                        ))}
                    </View>
                    <View style={s.plateBox}>
                        <Text style={s.plateText}>{profile.vehicle.plateNumber}</Text>
                    </View>
                </View>
            )}

            <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
                <Text style={s.logoutText}>Log Out</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const makeStyles = (t: AppTheme) => StyleSheet.create({
    container:    { flex: 1, backgroundColor: t.colors.background },
    scroll:       { paddingBottom: 40 },
    centered:     { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.background },
    header:       { paddingTop: Platform.OS === 'ios' ? 54 : 44, paddingHorizontal: 20, paddingBottom: 8, alignItems: 'center' },
    headerTitle:  { fontSize: 13, fontWeight: '900', color: t.colors.text, letterSpacing: 3 },

    avatarSection:   { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
    avatarContainer: { position: 'relative', marginBottom: 12 },
    avatar:          { width: 100, height: 100, borderRadius: 50, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: t.colors.card, overflow: 'hidden' },
    avatarPhoto:     { width: 100, height: 100, borderRadius: 50 },
    avatarText:      { fontSize: 40, fontWeight: '900', color: t.colors.black },
    editIconContainer: { position: 'absolute', bottom: 0, right: 0, backgroundColor: t.colors.primary, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: t.colors.card },
    editIcon:        { fontSize: 14 },

    nameRow:         { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    driverName:      { fontSize: 22, fontWeight: '900', color: t.colors.text },
    nameEditIcon:    { fontSize: 14 },
    nameEditRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, width: '100%', paddingHorizontal: 20 },
    nameInput:       { flex: 1, fontSize: 18, fontWeight: '700', color: t.colors.text, backgroundColor: t.colors.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: t.colors.primary },
    nameSaveBtn:     { backgroundColor: t.colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
    nameSaveBtnText: { fontWeight: '800', color: t.colors.black, fontSize: 13 },
    nameCancelBtn:   { width: 32, height: 32, borderRadius: 16, backgroundColor: t.dark ? '#333' : '#EEE', alignItems: 'center', justifyContent: 'center' },
    nameCancelBtnText: { fontSize: 13, color: t.colors.text },

    driverPhone:  { fontSize: 14, color: t.colors.textSecondary, marginBottom: 16 },
    ratingRow:    { flexDirection: 'row', gap: 8 },
    ratingPill:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: t.colors.card, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: t.colors.border },
    ratingIcon:   { fontSize: 13 },
    ratingVal:    { fontSize: 12, fontWeight: '700', color: t.colors.text },

    sectionCard:   { backgroundColor: t.colors.card, borderRadius: 18, marginHorizontal: 20, marginBottom: 14, padding: 18, borderWidth: 1, borderColor: t.colors.border },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle:  { fontSize: 14, fontWeight: '900', color: t.colors.text, marginBottom: 12 },
    statusBadge:   { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
    statusText:    { fontSize: 11, fontWeight: '700' },

    pinkCertText:     { fontSize: 12, color: t.colors.success, lineHeight: 18 },
    pinkPendingText:  { fontSize: 12, color: '#FFA000', lineHeight: 18 },
    pinkRejectedText: { fontSize: 12, color: t.colors.danger, lineHeight: 18 },
    pinkInfoText:     { fontSize: 12, color: t.colors.textSecondary, lineHeight: 18 },

    pinkPassBtn:     { backgroundColor: 'rgba(255,105,180,0.15)', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: 'rgba(255,105,180,0.3)' },
    pinkPassBtnText: { color: '#FF69B4', fontWeight: '700', fontSize: 13 },

    infoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    infoLabel: { fontSize: 13, color: t.colors.textSecondary },
    infoVal:   { fontSize: 13, fontWeight: '700', color: t.colors.text },
    divider:   { height: 1, backgroundColor: t.colors.divider, marginVertical: 4 },

    themePill:     { backgroundColor: t.colors.cardSecondary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: t.colors.border },
    themePillText: { fontSize: 11, fontWeight: '700', color: t.colors.text },

    genderRow:         { flexDirection: 'row', gap: 6, alignItems: 'center' },
    genderBtn:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: t.colors.cardSecondary, borderWidth: 1, borderColor: t.colors.border },
    genderBtnActive:   { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
    genderBtnText:     { fontSize: 12, color: t.colors.textSecondary, fontWeight: '600' },
    genderBtnTextActive: { color: t.colors.black, fontWeight: '800' },

    vehicleGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
    vehicleItem:  { width: '47%', backgroundColor: t.colors.cardSecondary, borderRadius: 10, padding: 12 },
    vehicleLabel: { fontSize: 9, fontWeight: '800', color: t.colors.textSecondary, letterSpacing: 1.5, marginBottom: 4 },
    vehicleVal:   { fontSize: 14, fontWeight: '700', color: t.colors.text },
    plateBox:     { backgroundColor: t.colors.cardSecondary, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: t.colors.primary },
    plateText:    { fontSize: 18, fontWeight: '900', color: t.colors.primary, letterSpacing: 3 },

    logoutBtn:  { marginHorizontal: 20, marginTop: 8, marginBottom: 12, backgroundColor: 'rgba(255,68,68,0.08)', borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,68,68,0.2)' },
    logoutText: { color: t.colors.danger, fontWeight: '700', fontSize: 14 },
});

export default DriverProfileScreen;
