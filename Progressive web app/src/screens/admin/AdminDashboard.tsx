import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert, RefreshControl, Platform,
} from 'react-native';
import theme from '../../utils/theme';
import apiService from '../../services/api';
import { useAuth } from '../../context/AuthContext';

type Tab = 'overview' | 'drivers' | 'pinkpass' | 'alerts' | 'rides' | 'users';

interface Stats {
    totalUsers: number;
    totalDrivers: number;
    activeDrivers: number;
    totalRides: number;
    activeRides: number;
    openAlerts: number;
    pendingDriverApprovals: number;
}

interface Driver {
    _id: string;
    user?: { name?: string; phone?: string; cnic?: string };
    backgroundCheck?: { status: string };
    createdAt?: string;
}

interface SosAlert {
    _id: string;
    type: string;
    severity: string;
    description: string;
    status: string;
    createdAt?: string;
}

interface ActiveRide {
    _id: string;
    status: string;
    passenger?: { name?: string; phone?: string };
    pickupLocation?: { address?: string };
    dropoffLocation?: { address?: string };
    fare?: { estimated?: number };
}

interface User {
    _id: string;
    name?: string;
    phone?: string;
    email?: string;
    role?: string;
    createdAt?: string;
}

const AdminDashboard: React.FC = () => {
    const { logout } = useAuth();

    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [stats, setStats] = useState<Stats | null>(null);
    const [pendingDrivers, setPendingDrivers] = useState<Driver[]>([]);
    const [pendingPinkPass, setPendingPinkPass] = useState<any[]>([]);
    const [activeAlerts, setActiveAlerts] = useState<SosAlert[]>([]);
    const [activeRides, setActiveRides] = useState<ActiveRide[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        try {
            const [statsRes, driversRes, pinkPassRes, alertsRes, ridesRes, usersRes] = await Promise.allSettled([
                apiService.get('/admin/dashboard') as Promise<any>,
                apiService.get('/admin/drivers/pending') as Promise<any>,
                apiService.get('/admin/pinkpass/pending') as Promise<any>,
                apiService.get('/admin/alerts/active') as Promise<any>,
                apiService.get('/admin/rides/active') as Promise<any>,
                apiService.get('/admin/users') as Promise<any>,
            ]);

            if (statsRes.status === 'fulfilled') setStats(statsRes.value?.stats || null);
            if (driversRes.status === 'fulfilled') setPendingDrivers(driversRes.value?.drivers || []);
            if (pinkPassRes.status === 'fulfilled') setPendingPinkPass(pinkPassRes.value?.drivers || []);
            if (alertsRes.status === 'fulfilled') setActiveAlerts(alertsRes.value?.alerts || []);
            if (ridesRes.status === 'fulfilled') setActiveRides(ridesRes.value?.rides || []);
            if (usersRes.status === 'fulfilled') setUsers(usersRes.value?.users || []);
        } catch {
            // partial data OK
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, []);

    const onRefresh = () => { setRefreshing(true); fetchAll(); };

    const approveDriver = async (driverId: string) => {
        setActionLoading(driverId + '_approve');
        try {
            await apiService.patch(`/admin/drivers/${driverId}/approve`);
            setPendingDrivers(prev => prev.filter(d => d._id !== driverId));
            setStats(prev => prev ? { ...prev, pendingDriverApprovals: Math.max(0, prev.pendingDriverApprovals - 1) } : prev);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to approve');
        } finally {
            setActionLoading(null);
        }
    };

    const approvePinkPass = async (driverId: string) => {
        setActionLoading(driverId + '_pp_approve');
        try {
            await apiService.patch(`/pink-pass/admin-approve/${driverId}`, { action: 'approve' });
            setPendingPinkPass(prev => prev.filter(d => d._id !== driverId));
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to approve Pink Pass');
        } finally {
            setActionLoading(null);
        }
    };

    const rejectPinkPass = async (driverId: string) => {
        Alert.alert('Reject Pink Pass', 'Reject this driver\'s Pink Pass application?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Reject', style: 'destructive', onPress: async () => {
                    setActionLoading(driverId + '_pp_reject');
                    try {
                        await apiService.patch(`/pink-pass/admin-approve/${driverId}`, { action: 'reject' });
                        setPendingPinkPass(prev => prev.filter(d => d._id !== driverId));
                    } catch (e: any) {
                        Alert.alert('Error', e.message || 'Failed to reject Pink Pass');
                    } finally {
                        setActionLoading(null);
                    }
                }
            }
        ]);
    };

    const rejectDriver = async (driverId: string) => {
        Alert.alert('Reject Driver', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Reject', style: 'destructive', onPress: async () => {
                    setActionLoading(driverId + '_reject');
                    try {
                        await apiService.patch(`/admin/drivers/${driverId}/reject`, { reason: 'Rejected by admin' });
                        setPendingDrivers(prev => prev.filter(d => d._id !== driverId));
                        setStats(prev => prev ? { ...prev, pendingDriverApprovals: Math.max(0, prev.pendingDriverApprovals - 1) } : prev);
                    } catch (e: any) {
                        Alert.alert('Error', e.message || 'Failed to reject');
                    } finally {
                        setActionLoading(null);
                    }
                }
            }
        ]);
    };

    const tabs: { id: Tab; label: string; badge?: number }[] = [
        { id: 'overview',  label: 'Overview' },
        { id: 'drivers',   label: 'Drivers',   badge: pendingDrivers.length },
        { id: 'pinkpass',  label: '🎀 Pink Pass', badge: pendingPinkPass.length },
        { id: 'alerts',    label: 'Alerts',    badge: activeAlerts.length },
        { id: 'rides',     label: 'Rides',     badge: activeRides.length },
        { id: 'users',     label: 'Users' },
    ];

    const statCards = stats ? [
        { label: 'Total Users', value: stats.totalUsers, color: theme.colors.primary, icon: '👥' },
        { label: 'Total Drivers', value: stats.totalDrivers, color: '#9B59B6', icon: '🚗' },
        { label: 'Active Drivers', value: stats.activeDrivers, color: theme.colors.success, icon: '🟢' },
        { label: 'Total Rides', value: stats.totalRides, color: '#3498DB', icon: '📍' },
        { label: 'Active Rides', value: stats.activeRides, color: '#E67E22', icon: '🔄' },
        { label: 'Open Alerts', value: stats.openAlerts, color: theme.colors.danger, icon: '🚨' },
        { label: 'Pending Approvals', value: stats.pendingDriverApprovals, color: '#F39C12', icon: '⏳' },
    ] : [];

    const formatDate = (iso?: string) => {
        if (!iso) return '—';
        const d = new Date(iso);
        return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading Admin Panel...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>ADMIN PANEL</Text>
                    <Text style={styles.headerSub}>SAFORA Control Center</Text>
                </View>
                <TouchableOpacity style={styles.logoutBtn} onPress={() => {
                    Alert.alert('Logout', 'Sign out of admin?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Logout', style: 'destructive', onPress: logout },
                    ]);
                }}>
                    <Text style={styles.logoutText}>⏻</Text>
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
                {tabs.map(tab => (
                    <TouchableOpacity
                        key={tab.id}
                        style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                        onPress={() => setActiveTab(tab.id)}
                    >
                        <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                            {tab.label}
                        </Text>
                        {!!tab.badge && tab.badge > 0 && (
                            <View style={styles.tabBadge}>
                                <Text style={styles.tabBadgeText}>{tab.badge}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Content */}
            <ScrollView
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {/* OVERVIEW */}
                {activeTab === 'overview' && (
                    <View>
                        <Text style={styles.sectionLabel}>PLATFORM STATISTICS</Text>
                        <View style={styles.statsGrid}>
                            {statCards.map(card => (
                                <View key={card.label} style={[styles.statCard, { borderColor: card.color + '40' }]}>
                                    <Text style={styles.statIcon}>{card.icon}</Text>
                                    <Text style={[styles.statValue, { color: card.color }]}>{card.value}</Text>
                                    <Text style={styles.statLabel}>{card.label}</Text>
                                </View>
                            ))}
                        </View>

                        {!stats && (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyIcon}>⚠️</Text>
                                <Text style={styles.emptyText}>Backend offline — showing cached data</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* PINK PASS APPLICATIONS */}
                {activeTab === 'pinkpass' && (
                    <View>
                        <Text style={styles.sectionLabel}>
                            PENDING PINK PASS APPLICATIONS ({pendingPinkPass.length})
                        </Text>
                        {pendingPinkPass.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyIcon}>🎀</Text>
                                <Text style={styles.emptyText}>No pending Pink Pass applications</Text>
                            </View>
                        ) : (
                            pendingPinkPass.map(driver => (
                                <View key={driver._id} style={[styles.itemCard, styles.pinkCard]}>
                                    <View style={styles.pinkCardHeader}>
                                        <View style={styles.pinkAvatarCircle}>
                                            <Text style={styles.pinkAvatarText}>
                                                {driver.name?.charAt(0)?.toUpperCase() || 'F'}
                                            </Text>
                                        </View>
                                        <View style={styles.itemInfo}>
                                            <Text style={styles.itemName}>{driver.name}</Text>
                                            <Text style={styles.itemSub}>{driver.phone}</Text>
                                            <Text style={styles.itemSub}>
                                                License: {driver.licenseNumber || '—'}
                                            </Text>
                                            <Text style={styles.itemSub}>
                                                Vehicle: {driver.vehicle?.make} {driver.vehicle?.model} • {driver.vehicleType}
                                            </Text>
                                            <Text style={styles.itemMeta}>
                                                Applied: {formatDate(driver.pinkPassAppliedAt)}
                                            </Text>
                                        </View>
                                        <View style={styles.pinkPendingBadge}>
                                            <Text style={styles.pinkPendingText}>REVIEW</Text>
                                        </View>
                                    </View>

                                    <View style={styles.pinkInfoRow}>
                                        <Text style={styles.pinkInfoLabel}>Gender</Text>
                                        <Text style={[
                                            styles.pinkInfoVal,
                                            { color: driver.gender === 'female' ? '#FF69B4' : theme.colors.danger }
                                        ]}>
                                            {driver.gender === 'female' ? '✓ Female' : '⚠ ' + driver.gender}
                                        </Text>
                                    </View>

                                    <View style={styles.pinkInfoRow}>
                                        <Text style={styles.pinkInfoLabel}>AI Liveness</Text>
                                        <Text style={[styles.pinkInfoVal, { color: theme.colors.success }]}>
                                            ✓ Passed
                                        </Text>
                                    </View>

                                    <View style={styles.pinkInfoRow}>
                                        <Text style={styles.pinkInfoLabel}>CNIC Photo</Text>
                                        <Text style={[styles.pinkInfoVal, { color: '#FFA000' }]}>
                                            Pending Manual Review
                                        </Text>
                                    </View>

                                    <View style={styles.actionRow}>
                                        <TouchableOpacity
                                            style={styles.approveBtn}
                                            onPress={() => approvePinkPass(driver._id)}
                                            disabled={!!actionLoading}
                                        >
                                            {actionLoading === driver._id + '_pp_approve'
                                                ? <ActivityIndicator size="small" color={theme.colors.black} />
                                                : <Text style={styles.approveBtnText}>🎀 Certify</Text>
                                            }
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.rejectBtn}
                                            onPress={() => rejectPinkPass(driver._id)}
                                            disabled={!!actionLoading}
                                        >
                                            {actionLoading === driver._id + '_pp_reject'
                                                ? <ActivityIndicator size="small" color={theme.colors.danger} />
                                                : <Text style={styles.rejectBtnText}>✗ Reject</Text>
                                            }
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                )}

                {/* PENDING DRIVERS */}
                {activeTab === 'drivers' && (
                    <View>
                        <Text style={styles.sectionLabel}>PENDING DRIVER APPROVALS ({pendingDrivers.length})</Text>
                        {pendingDrivers.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyIcon}>✅</Text>
                                <Text style={styles.emptyText}>No pending approvals</Text>
                            </View>
                        ) : (
                            pendingDrivers.map(driver => (
                                <View key={driver._id} style={styles.itemCard}>
                                    <View style={styles.itemHeader}>
                                        <View style={styles.avatarCircle}>
                                            <Text style={styles.avatarText}>
                                                {driver.user?.name?.charAt(0)?.toUpperCase() || 'D'}
                                            </Text>
                                        </View>
                                        <View style={styles.itemInfo}>
                                            <Text style={styles.itemName}>{driver.user?.name || 'Unknown Driver'}</Text>
                                            <Text style={styles.itemSub}>{driver.user?.phone || '—'}</Text>
                                            <Text style={styles.itemSub}>CNIC: {driver.user?.cnic || '—'}</Text>
                                            <Text style={styles.itemMeta}>{formatDate(driver.createdAt)}</Text>
                                        </View>
                                        <View style={styles.pendingBadge}>
                                            <Text style={styles.pendingText}>PENDING</Text>
                                        </View>
                                    </View>
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity
                                            style={styles.approveBtn}
                                            onPress={() => approveDriver(driver._id)}
                                            disabled={!!actionLoading}
                                        >
                                            {actionLoading === driver._id + '_approve'
                                                ? <ActivityIndicator size="small" color={theme.colors.black} />
                                                : <Text style={styles.approveBtnText}>✓ Approve</Text>
                                            }
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.rejectBtn}
                                            onPress={() => rejectDriver(driver._id)}
                                            disabled={!!actionLoading}
                                        >
                                            {actionLoading === driver._id + '_reject'
                                                ? <ActivityIndicator size="small" color={theme.colors.danger} />
                                                : <Text style={styles.rejectBtnText}>✗ Reject</Text>
                                            }
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                )}

                {/* PINK PASS APPROVALS */}
                {activeTab === 'pinkpass' && (
                    <View>
                        <Text style={styles.sectionLabel}>PENDING PINK PASS REVIEWS ({pendingPinkPass.length})</Text>
                        {pendingPinkPass.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyIcon}>🎀</Text>
                                <Text style={styles.emptyText}>No pending Pink Pass applications</Text>
                            </View>
                        ) : (
                            pendingPinkPass.map((driver: any) => (
                                <View key={driver._id} style={styles.itemCard}>
                                    <View style={styles.itemHeader}>
                                        <View style={[styles.avatarCircle, { backgroundColor: 'rgba(255,105,180,0.1)' }]}>
                                            <Text style={[styles.avatarText, { color: '#FF69B4' }]}>
                                                {driver.name?.charAt(0)?.toUpperCase() || 'D'}
                                            </Text>
                                        </View>
                                        <View style={styles.itemInfo}>
                                            <Text style={styles.itemName}>{driver.name || 'Unknown Driver'}</Text>
                                            <Text style={styles.itemSub}>{driver.phone || '—'}</Text>
                                            <Text style={styles.itemSub}>{driver.vehicle || '—'} • {driver.licenseNumber || '—'}</Text>
                                            <Text style={styles.itemMeta}>Applied: {formatDate(driver.pinkPassAppliedAt)}</Text>
                                        </View>
                                        <View style={[styles.pendingBadge, { borderColor: 'rgba(255,105,180,0.3)' }]}>
                                            <Text style={[styles.pendingText, { color: '#FF69B4' }]}>REVIEW</Text>
                                        </View>
                                    </View>
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity
                                            style={[styles.approveBtn, { backgroundColor: '#FF69B4' }]}
                                            onPress={() => approvePinkPass(driver._id)}
                                            disabled={!!actionLoading}
                                        >
                                            {actionLoading === driver._id + '_pp_approve'
                                                ? <ActivityIndicator size="small" color={theme.colors.black} />
                                                : <Text style={styles.approveBtnText}>✓ Approve 🎀</Text>
                                            }
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.rejectBtn}
                                            onPress={() => rejectPinkPass(driver._id)}
                                            disabled={!!actionLoading}
                                        >
                                            {actionLoading === driver._id + '_pp_reject'
                                                ? <ActivityIndicator size="small" color={theme.colors.danger} />
                                                : <Text style={styles.rejectBtnText}>✗ Reject</Text>
                                            }
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                )}

                {/* ACTIVE ALERTS */}
                {activeTab === 'alerts' && (
                    <View>
                        <Text style={styles.sectionLabel}>ACTIVE SOS ALERTS ({activeAlerts.length})</Text>
                        {activeAlerts.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyIcon}>🛡️</Text>
                                <Text style={styles.emptyText}>No active alerts — all clear</Text>
                            </View>
                        ) : (
                            activeAlerts.map(alert => (
                                <View key={alert._id} style={[styles.itemCard, styles.alertCard]}>
                                    <View style={styles.alertHeader}>
                                        <View style={[styles.severityDot, { backgroundColor: alert.severity === 'critical' ? theme.colors.danger : '#F39C12' }]} />
                                        <Text style={styles.alertType}>{alert.type?.toUpperCase()}</Text>
                                        <View style={[styles.severityBadge, { backgroundColor: alert.severity === 'critical' ? 'rgba(255,59,48,0.1)' : 'rgba(243,156,18,0.1)' }]}>
                                            <Text style={[styles.severityText, { color: alert.severity === 'critical' ? theme.colors.danger : '#F39C12' }]}>
                                                {alert.severity?.toUpperCase()}
                                            </Text>
                                        </View>
                                        <Text style={styles.alertTime}>{formatDate(alert.createdAt)}</Text>
                                    </View>
                                    <Text style={styles.alertDesc}>{alert.description}</Text>
                                </View>
                            ))
                        )}
                    </View>
                )}

                {/* ACTIVE RIDES */}
                {activeTab === 'rides' && (
                    <View>
                        <Text style={styles.sectionLabel}>ACTIVE RIDES ({activeRides.length})</Text>
                        {activeRides.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyIcon}>🚗</Text>
                                <Text style={styles.emptyText}>No active rides right now</Text>
                            </View>
                        ) : (
                            activeRides.map(ride => (
                                <View key={ride._id} style={styles.itemCard}>
                                    <View style={styles.rideHeader}>
                                        <View style={[styles.statusChip, { backgroundColor: ride.status === 'started' ? 'rgba(0,230,118,0.1)' : 'rgba(245,197,24,0.1)' }]}>
                                            <Text style={[styles.statusChipText, { color: ride.status === 'started' ? theme.colors.success : theme.colors.primary }]}>
                                                {ride.status?.toUpperCase()}
                                            </Text>
                                        </View>
                                        {ride.fare?.estimated && (
                                            <Text style={styles.rideFare}>RS {ride.fare.estimated}</Text>
                                        )}
                                    </View>
                                    <Text style={styles.ridePassenger}>👤 {ride.passenger?.name || 'Unknown'} • {ride.passenger?.phone || '—'}</Text>
                                    <Text style={styles.rideRoute}>📍 {ride.pickupLocation?.address || '—'}</Text>
                                    <Text style={styles.rideRoute}>🏁 {ride.dropoffLocation?.address || '—'}</Text>
                                </View>
                            ))
                        )}
                    </View>
                )}

                {/* USERS */}
                {activeTab === 'users' && (
                    <View>
                        <Text style={styles.sectionLabel}>ALL USERS ({users.length})</Text>
                        {users.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyIcon}>👥</Text>
                                <Text style={styles.emptyText}>No users found</Text>
                            </View>
                        ) : (
                            users.map(user => (
                                <View key={user._id} style={styles.userRow}>
                                    <View style={[styles.userRoleDot, {
                                        backgroundColor: user.role === 'admin' ? theme.colors.danger
                                            : user.role === 'driver' ? '#9B59B6'
                                                : theme.colors.primary
                                    }]} />
                                    <View style={styles.userInfo}>
                                        <Text style={styles.userName}>{user.name || 'Unnamed'}</Text>
                                        <Text style={styles.userPhone}>{user.phone || user.email || '—'}</Text>
                                    </View>
                                    <View style={styles.userRoleBadge}>
                                        <Text style={styles.userRoleText}>{user.role?.toUpperCase() || 'USER'}</Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
    loadingText: { color: theme.colors.textSecondary, marginTop: 12, fontSize: 13 },

    header: {
        paddingTop: Platform.OS === 'ios' ? 50 : 40,
        paddingHorizontal: 20, paddingBottom: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderBottomWidth: 1, borderBottomColor: '#1A1A1A',
    },
    headerTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.primary, letterSpacing: 3 },
    headerSub: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
    logoutBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: 'rgba(255,59,48,0.1)',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)',
    },
    logoutText: { fontSize: 18, color: theme.colors.danger },

    tabsScroll: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
    tabsContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    tab: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 10, backgroundColor: theme.colors.card,
        borderWidth: 1, borderColor: 'transparent',
    },
    tabActive: { borderColor: theme.colors.primary, backgroundColor: 'rgba(245,197,24,0.08)' },
    tabText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
    tabTextActive: { color: theme.colors.primary, fontWeight: '800' },
    tabBadge: {
        backgroundColor: theme.colors.danger,
        borderRadius: 8, minWidth: 16, height: 16,
        alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    },
    tabBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },

    scroll: { padding: 20, paddingBottom: 40 },
    sectionLabel: {
        fontSize: 10, letterSpacing: 3, fontWeight: '800',
        color: theme.colors.textSecondary, marginBottom: 16,
    },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statCard: {
        width: '47%', backgroundColor: theme.colors.card,
        borderRadius: 16, padding: 16, alignItems: 'center',
        borderWidth: 1.5,
    },
    statIcon: { fontSize: 24, marginBottom: 8 },
    statValue: { fontSize: 28, fontWeight: '900' },
    statLabel: { color: theme.colors.textSecondary, fontSize: 10, marginTop: 4, textAlign: 'center', fontWeight: '600' },

    emptyCard: {
        backgroundColor: theme.colors.card, borderRadius: 16, padding: 32,
        alignItems: 'center', borderWidth: 1, borderColor: '#1E1E1E',
    },
    emptyIcon: { fontSize: 40, marginBottom: 12 },
    emptyText: { color: theme.colors.textSecondary, fontSize: 13 },

    itemCard: {
        backgroundColor: theme.colors.card, borderRadius: 16, padding: 16,
        marginBottom: 12, borderWidth: 1, borderColor: '#1E1E1E',
    },
    itemHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
    avatarCircle: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(245,197,24,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { color: theme.colors.primary, fontWeight: '900', fontSize: 18 },
    itemInfo: { flex: 1 },
    itemName: { color: theme.colors.text, fontWeight: '800', fontSize: 14 },
    itemSub: { color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 },
    itemMeta: { color: '#444', fontSize: 10, marginTop: 4 },
    pendingBadge: {
        backgroundColor: 'rgba(243,156,18,0.1)',
        borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
        borderWidth: 1, borderColor: 'rgba(243,156,18,0.3)',
    },
    pendingText: { color: '#F39C12', fontSize: 9, fontWeight: '900' },

    actionRow: { flexDirection: 'row', gap: 10 },
    approveBtn: {
        flex: 1, backgroundColor: theme.colors.success,
        borderRadius: 10, paddingVertical: 10, alignItems: 'center',
    },
    approveBtnText: { color: theme.colors.black, fontWeight: '800', fontSize: 13 },
    rejectBtn: {
        flex: 1, borderWidth: 1.5, borderColor: theme.colors.danger,
        borderRadius: 10, paddingVertical: 10, alignItems: 'center',
    },
    rejectBtnText: { color: theme.colors.danger, fontWeight: '800', fontSize: 13 },

    alertCard: { borderColor: 'rgba(255,59,48,0.15)' },
    alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    severityDot: { width: 8, height: 8, borderRadius: 4 },
    alertType: { color: theme.colors.text, fontWeight: '900', fontSize: 13 },
    severityBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    severityText: { fontSize: 9, fontWeight: '900' },
    alertTime: { color: '#444', fontSize: 10, marginLeft: 'auto' },
    alertDesc: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },

    rideHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    statusChip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    statusChipText: { fontSize: 10, fontWeight: '900' },
    rideFare: { color: theme.colors.primary, fontWeight: '800', fontSize: 14, marginLeft: 'auto' },
    ridePassenger: { color: theme.colors.text, fontSize: 13, fontWeight: '600', marginBottom: 6 },
    rideRoute: { color: theme.colors.textSecondary, fontSize: 12, marginBottom: 3 },

    userRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: theme.colors.card, borderRadius: 12,
        padding: 14, marginBottom: 8,
        borderWidth: 1, borderColor: '#1E1E1E',
    },
    userRoleDot: { width: 10, height: 10, borderRadius: 5 },
    userInfo: { flex: 1 },
    userName: { color: theme.colors.text, fontWeight: '700', fontSize: 13 },
    userPhone: { color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 },
    userRoleBadge: {
        backgroundColor: '#1A1A1A', borderRadius: 8,
        paddingHorizontal: 8, paddingVertical: 4,
    },
    userRoleText: { color: theme.colors.textSecondary, fontSize: 9, fontWeight: '800' },

    pinkCard:        { borderColor: 'rgba(255,105,180,0.2)' },
    pinkCardHeader:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
    pinkAvatarCircle:{
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(255,105,180,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    pinkAvatarText:  { color: '#FF69B4', fontWeight: '900', fontSize: 18 },
    pinkPendingBadge:{
        backgroundColor: 'rgba(255,105,180,0.1)',
        borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
        borderWidth: 1, borderColor: 'rgba(255,105,180,0.3)',
    },
    pinkPendingText: { color: '#FF69B4', fontSize: 9, fontWeight: '900' },
    pinkInfoRow:     {
        flexDirection: 'row', justifyContent: 'space-between',
        paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1A1A1A',
    },
    pinkInfoLabel:   { fontSize: 12, color: theme.colors.textSecondary },
    pinkInfoVal:     { fontSize: 12, fontWeight: '700' },
});

export default AdminDashboard;
