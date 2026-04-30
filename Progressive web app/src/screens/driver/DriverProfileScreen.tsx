import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, ActivityIndicator, Platform, Alert,
    RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../../utils/theme';
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
    vehicle: {
        make: string;
        model: string;
        year: number;
        color: string;
        plateNumber: string;
    };
    pinkPassStatus: 'none' | 'pending_review' | 'approved' | 'rejected';
    backgroundCheck: { status: string };
    joinedAt: string;
}

const PINK_STATUS_CONFIG = {
    none:           { label: 'Not Applied',      color: theme.colors.textSecondary, bg: '#1A1A1A',                     icon: '—' },
    pending_review: { label: 'Under Review',     color: '#FFA000',                  bg: 'rgba(255,160,0,0.1)',         icon: '⏳' },
    approved:       { label: 'Certified',         color: '#00E676',                  bg: 'rgba(0,230,118,0.1)',         icon: '✓' },
    rejected:       { label: 'Rejected',          color: theme.colors.danger,        bg: 'rgba(255,68,68,0.1)',         icon: '✗' },
};

const DriverProfileScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const [profile, setProfile]     = useState<DriverProfile | null>(null);
    const [loading, setLoading]     = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [localUser, setLocalUser] = useState<any>(null);

    const loadProfile = useCallback(async () => {
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
            if (raw) setLocalUser(JSON.parse(raw));

            const res: any = await apiService.get('/drivers/me');
            if (res.success) setProfile(res.driver);
        } catch (e) {
            console.log('[Profile] load error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadProfile(); }, [loadProfile]);

    const handleLogout = () => {
        Alert.alert(
            'Log Out',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out', style: 'destructive',
                    onPress: async () => {
                        await AsyncStorage.multiRemove([
                            STORAGE_KEYS.AUTH_TOKEN,
                            STORAGE_KEYS.USER_DATA,
                        ]);
                        navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    const pinkCfg = PINK_STATUS_CONFIG[profile?.pinkPassStatus ?? 'none'];
    const isFemale = (profile?.gender === 'female') || (localUser?.gender === 'female');
    const canApplyPinkPass = isFemale && profile?.pinkPassStatus !== 'approved';

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => { setRefreshing(true); loadProfile(); }}
                    tintColor={theme.colors.primary}
                />
            }
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>MY PROFILE</Text>
            </View>

            {/* Avatar + Name */}
            <View style={styles.avatarSection}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {(profile?.name ?? localUser?.name ?? 'D').charAt(0).toUpperCase()}
                    </Text>
                </View>
                <Text style={styles.driverName}>{profile?.name ?? localUser?.name ?? 'Driver'}</Text>
                <Text style={styles.driverPhone}>{profile?.phone ?? localUser?.phone ?? ''}</Text>

                {/* Rating row */}
                <View style={styles.ratingRow}>
                    <View style={styles.ratingPill}>
                        <Text style={styles.ratingIcon}>⭐</Text>
                        <Text style={styles.ratingVal}>{profile?.rating?.toFixed(1) ?? '5.0'}</Text>
                    </View>
                    <View style={styles.ratingPill}>
                        <Text style={styles.ratingIcon}>🚗</Text>
                        <Text style={styles.ratingVal}>{profile?.totalRides ?? 0} rides</Text>
                    </View>
                    <View style={styles.ratingPill}>
                        <Text style={styles.ratingIcon}>💰</Text>
                        <Text style={styles.ratingVal}>RS {profile?.totalEarnings ?? 0}</Text>
                    </View>
                </View>
            </View>

            {/* Pink Pass Card */}
            <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Pink Pass Status</Text>
                    <View style={[styles.statusBadge, { backgroundColor: pinkCfg.bg }]}>
                        <Text style={[styles.statusText, { color: pinkCfg.color }]}>
                            {pinkCfg.icon} {pinkCfg.label}
                        </Text>
                    </View>
                </View>

                {profile?.pinkPassStatus === 'approved' && (
                    <Text style={styles.pinkCertText}>
                        You are a certified Pink Pass driver. You will receive Pink Pass ride requests from female passengers.
                    </Text>
                )}

                {profile?.pinkPassStatus === 'pending_review' && (
                    <Text style={styles.pinkPendingText}>
                        Your application is being reviewed by our team. This typically takes 24-48 hours.
                    </Text>
                )}

                {profile?.pinkPassStatus === 'rejected' && (
                    <Text style={styles.pinkRejectedText}>
                        Your application was rejected. Please re-apply with a clearer CNIC photo and ensure you are in good lighting during the liveness test.
                    </Text>
                )}

                {!isFemale && profile?.pinkPassStatus === 'none' && (
                    <Text style={styles.pinkInfoText}>
                        Pink Pass is exclusively for verified female drivers. Gender must be set to Female in your profile.
                    </Text>
                )}

                {canApplyPinkPass && (
                    <TouchableOpacity
                        style={styles.pinkPassBtn}
                        onPress={() => navigation.navigate('PinkPassDriver')}
                    >
                        <Text style={styles.pinkPassBtnText}>
                            {profile?.pinkPassStatus === 'rejected' ? '↺ Re-Apply' : '🎀 Apply for Pink Pass'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Account Status */}
            <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Account Status</Text>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Background Check</Text>
                    <Text style={[
                        styles.infoVal,
                        profile?.backgroundCheck?.status === 'approved'
                            ? { color: theme.colors.success }
                            : { color: '#FFA000' }
                    ]}>
                        {profile?.backgroundCheck?.status === 'approved' ? '✓ Approved' : '⏳ Pending'}
                    </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Member Since</Text>
                    <Text style={styles.infoVal}>
                        {profile?.joinedAt
                            ? new Date(profile.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                            : '—'}
                    </Text>
                </View>
            </View>

            {/* License & Documents */}
            <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Documents</Text>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>License Number</Text>
                    <Text style={styles.infoVal}>{profile?.licenseNumber ?? '—'}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>CNIC</Text>
                    <Text style={styles.infoVal}>
                        {profile?.cnic ? `••••••••${profile.cnic.slice(-3)}` : '—'}
                    </Text>
                </View>
            </View>

            {/* Vehicle Info */}
            {profile?.vehicle && (
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Vehicle</Text>
                    <View style={styles.vehicleGrid}>
                        <View style={styles.vehicleItem}>
                            <Text style={styles.vehicleLabel}>MAKE</Text>
                            <Text style={styles.vehicleVal}>{profile.vehicle.make}</Text>
                        </View>
                        <View style={styles.vehicleItem}>
                            <Text style={styles.vehicleLabel}>MODEL</Text>
                            <Text style={styles.vehicleVal}>{profile.vehicle.model}</Text>
                        </View>
                        <View style={styles.vehicleItem}>
                            <Text style={styles.vehicleLabel}>YEAR</Text>
                            <Text style={styles.vehicleVal}>{profile.vehicle.year}</Text>
                        </View>
                        <View style={styles.vehicleItem}>
                            <Text style={styles.vehicleLabel}>COLOR</Text>
                            <Text style={styles.vehicleVal}>{profile.vehicle.color}</Text>
                        </View>
                    </View>
                    <View style={styles.plateBox}>
                        <Text style={styles.plateText}>{profile.vehicle.plateNumber}</Text>
                    </View>
                </View>
            )}

            {/* Logout */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>

            <Text style={styles.version}>SAFORA Driver v1.0 · FYP26-CS-G11</Text>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container:    { flex: 1, backgroundColor: theme.colors.background },
    scroll:       { paddingBottom: 40 },
    centered:     { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
    header:       {
        paddingTop: Platform.OS === 'ios' ? 54 : 44,
        paddingHorizontal: 20, paddingBottom: 8, alignItems: 'center',
    },
    headerTitle:  { fontSize: 13, fontWeight: '900', color: theme.colors.text, letterSpacing: 3 },

    avatarSection:{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
    avatar:       {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center',
        marginBottom: 12,
    },
    avatarText:   { fontSize: 32, fontWeight: '900', color: theme.colors.black },
    driverName:   { fontSize: 20, fontWeight: '900', color: theme.colors.text, marginBottom: 4 },
    driverPhone:  { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 16 },
    ratingRow:    { flexDirection: 'row', gap: 8 },
    ratingPill:   {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: theme.colors.card, borderRadius: 20,
        paddingHorizontal: 12, paddingVertical: 7,
        borderWidth: 1, borderColor: '#222',
    },
    ratingIcon:   { fontSize: 13 },
    ratingVal:    { fontSize: 12, fontWeight: '700', color: theme.colors.text },

    sectionCard:  {
        backgroundColor: theme.colors.card, borderRadius: 18,
        marginHorizontal: 20, marginBottom: 14,
        padding: 18, borderWidth: 1, borderColor: '#1E1E1E',
    },
    sectionHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 14, fontWeight: '900', color: theme.colors.text, marginBottom: 12 },
    statusBadge:  { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
    statusText:   { fontSize: 11, fontWeight: '700' },

    pinkCertText:     { fontSize: 12, color: theme.colors.success, lineHeight: 18 },
    pinkPendingText:  { fontSize: 12, color: '#FFA000', lineHeight: 18 },
    pinkRejectedText: { fontSize: 12, color: theme.colors.danger, lineHeight: 18 },
    pinkInfoText:     { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 },

    pinkPassBtn:  {
        backgroundColor: 'rgba(255,105,180,0.15)', borderRadius: 12,
        paddingVertical: 12, alignItems: 'center', marginTop: 12,
        borderWidth: 1, borderColor: 'rgba(255,105,180,0.3)',
    },
    pinkPassBtnText: { color: '#FF69B4', fontWeight: '700', fontSize: 13 },

    infoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    infoLabel: { fontSize: 13, color: theme.colors.textSecondary },
    infoVal:   { fontSize: 13, fontWeight: '700', color: theme.colors.text },
    divider:   { height: 1, backgroundColor: '#222', marginVertical: 4 },

    vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
    vehicleItem: {
        width: '47%', backgroundColor: '#111',
        borderRadius: 10, padding: 12,
    },
    vehicleLabel:{ fontSize: 9, fontWeight: '800', color: theme.colors.textSecondary, letterSpacing: 1.5, marginBottom: 4 },
    vehicleVal:  { fontSize: 14, fontWeight: '700', color: theme.colors.text },
    plateBox:    {
        backgroundColor: '#111', borderRadius: 10,
        padding: 12, alignItems: 'center',
        borderWidth: 1, borderColor: theme.colors.primary,
    },
    plateText:   { fontSize: 18, fontWeight: '900', color: theme.colors.primary, letterSpacing: 3 },

    logoutBtn:   {
        marginHorizontal: 20, marginTop: 8, marginBottom: 12,
        backgroundColor: 'rgba(255,68,68,0.08)', borderRadius: 16,
        paddingVertical: 16, alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,68,68,0.2)',
    },
    logoutText:  { color: theme.colors.danger, fontWeight: '700', fontSize: 14 },
    version:     { textAlign: 'center', fontSize: 10, color: '#333', marginBottom: 8 },
});

export default DriverProfileScreen;
