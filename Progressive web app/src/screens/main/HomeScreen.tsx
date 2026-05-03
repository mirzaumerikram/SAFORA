import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Pressable,
    StatusBar,
    Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SaforaMap from '../../components/SaforaMap';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../utils/theme';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { STORAGE_KEYS } from '../../utils/constants';

// ─── Tab definitions ──────────────────────────────────────────────────────────
type TabId = 'ride' | 'history' | 'safety' | 'profile';

interface Tab {
    id: TabId;
    icon: string;
    label: string;
    route?: string;
}

const TABS: Tab[] = [
    { id: 'ride',    icon: '🚗', label: 'Ride' },
    { id: 'history', icon: '🕒', label: 'History', route: 'RideHistory' },
    { id: 'safety',  icon: '🛡️', label: 'Safety',  route: 'Safety' },
    { id: 'profile', icon: '👤', label: 'Profile',  route: 'Profile' },
];

// ─── Quick shortcuts ──────────────────────────────────────────────────────────
interface Shortcut {
    icon: string;
    label: string;
    subtitle: string;
    bg: string;
    route?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
const HomeScreen: React.FC = () => {
    const navigation    = useNavigation<any>();
    const { t }         = useLanguage();
    const { logout }    = useAuth();
    const { theme, isDark } = useAppTheme();
    const s                 = useMemo(() => makeStyles(theme), [theme]);

    const [userName, setUserName]   = useState('');
    const [fullName, setFullName]   = useState('');
    const [menuOpen, setMenuOpen]   = useState(false);
    const [activeTab, setActiveTab] = useState<TabId>('ride');
    const [homeAddr, setHomeAddr]   = useState('');
    const [workAddr, setWorkAddr]   = useState('');
    const [profilePicture, setProfilePicture] = useState('');

    // Load user data whenever screen comes into focus
    useEffect(() => {
        const loadData = () => {
            AsyncStorage.getItem(STORAGE_KEYS.USER_DATA).then(raw => {
                if (raw) {
                    const user = JSON.parse(raw);
                    const name: string = user?.name || '';
                    setFullName(name);
                    setUserName(name.split(' ')[0] || '');
                    setHomeAddr(user?.homeAddress || '');
                    setWorkAddr(user?.workAddress || '');
                    setProfilePicture(user?.profilePicture || '');
                }
            });
        };

        loadData(); // Initial load
        const unsubscribe = navigation.addListener('focus', loadData);
        return unsubscribe;
    }, [navigation]);

    // Derive user initial for avatar
    const userInitial = userName ? userName.charAt(0).toUpperCase() : 'A';

    // Greeting based on time of day
    const { greetingText, emoji } = (() => {
        const h = new Date().getHours();
        if (h >= 5 && h < 12) return { greetingText: 'Good morning', emoji: '☀️' };
        if (h >= 12 && h < 17) return { greetingText: 'Good afternoon', emoji: '🌤️' };
        if (h >= 17 && h < 21) return { greetingText: 'Good evening', emoji: '🌅' };
        return { greetingText: 'Good night', emoji: '🌙' };
    })();

    // Menu items
    const menuItems = [
        { icon: '👤', label: 'My Profile',    onPress: () => navigation.navigate('Profile'),     danger: false },
        { icon: '📍', label: 'Ride History',   onPress: () => navigation.navigate('RideHistory'), danger: false },
        { icon: '🛡️', label: 'Safety Center',  onPress: () => navigation.navigate('Safety'),      danger: false },
        { icon: '🎀', label: 'Pink Pass',       onPress: () => navigation.navigate('PinkPass'),    danger: false },
        { icon: '🔄', label: 'Hard Refresh App', onPress: async () => {
            await AsyncStorage.clear();
            window.location.reload();
        }, danger: true },
        { icon: '🚪', label: 'Logout',          onPress: () => logout(),                           danger: true  },
    ];

    // Quick shortcuts
    const shortcuts: Shortcut[] = [
        {
            icon: '🎀',
            label: 'Pink Pass',
            subtitle: 'Women Only',
            bg: theme.colors.secondary,
            route: 'PinkPass',
        },
        {
            icon: '🏢',
            label: 'Work',
            subtitle: workAddr || 'Add Address',
            bg: theme.colors.primary,
            route: 'Profile', // Send to profile to set/change address
        },
        {
            icon: '🏠',
            label: 'Home',
            subtitle: homeAddr || 'Add Address',
            bg: theme.colors.cardSecondary,
            route: 'Profile', // Send to profile to set/change address
        },
    ];

    const handleSearchPress = () => {
        navigation.navigate('BookingLocation');
    };

    const handleTabPress = (tab: Tab) => {
        setActiveTab(tab.id);
        if (tab.route) {
            navigation.navigate(tab.route);
        }
    };

    return (
        <View style={s.root}>
            <StatusBar translucent backgroundColor="transparent" barStyle={isDark ? "light-content" : "dark-content"} />

            {/* ── Full-screen map ── */}
            <View style={s.mapContainer}>
                <SaforaMap type="home" />
            </View>

            {/* ── Full-screen overlay ── */}
            <View style={s.overlay} pointerEvents="box-none">

                {/* ── Top header ── */}
                <View style={s.header}>
                    {/* Left: Pink Pass badge + greeting stack */}
                    <View style={s.headerLeft}>
                        <TouchableOpacity
                            style={s.pinkPassBadge}
                            onPress={() => navigation.navigate('PinkPass')}
                            activeOpacity={0.85}
                        >
                            <Text style={s.pinkPassBadgeIcon}>🎀</Text>
                            <Text style={s.pinkPassBadgeText}>PINK PASS</Text>
                        </TouchableOpacity>

                        <Text style={s.greetingText}>
                            {greetingText}, {fullName || 'Ali'} {emoji}
                        </Text>
                    </View>

                    {/* Right: Avatar + hamburger */}
                    <View style={s.headerRight}>
                        <TouchableOpacity
                            style={s.avatarCircle}
                            onPress={() => navigation.navigate('Profile')}
                            activeOpacity={0.8}
                        >
                            {profilePicture ? (
                                <Image source={{ uri: profilePicture }} style={s.avatarImage} />
                            ) : (
                                <Text style={s.avatarText}>{userInitial}</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={s.hamburgerBtn}
                            onPress={() => setMenuOpen(true)}
                            activeOpacity={0.85}
                        >
                            <Text style={s.hamburgerIcon}>☰</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Spacer — pushes bottom sheet to bottom */}
                <View style={s.flex1} pointerEvents="none" />

                {/* ── Bottom white card ── */}
                <View style={s.bottomCard}>
                    {/* Drag handle */}
                    <View style={s.dragHandle} />

                    {/* Search bar */}
                    <TouchableOpacity
                        style={s.searchBar}
                        onPress={handleSearchPress}
                        activeOpacity={0.8}
                    >
                        <Text style={s.searchIcon}>🔍</Text>
                        <Text style={s.searchPlaceholder}>Where to?</Text>
                        <View style={s.searchActionBtn}>
                            <Text style={s.searchActionIcon}>➤</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Quick shortcuts */}
                    <View style={s.shortcuts}>
                        {shortcuts.map((sc, i) => (
                            <TouchableOpacity
                                key={i}
                                style={s.shortcutItem}
                                onPress={() => sc.route && navigation.navigate(sc.route)}
                                activeOpacity={0.75}
                            >
                                <View style={[s.shortcutCircle, { backgroundColor: sc.bg }]}>
                                    <Text style={s.shortcutEmoji}>{sc.icon}</Text>
                                </View>
                                <Text style={s.shortcutLabel}>{sc.label}</Text>
                                <Text style={s.shortcutSubtitle}>{sc.subtitle}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* ── Tab bar ── */}
                <View style={s.tabBar}>
                    {TABS.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <TouchableOpacity
                                key={tab.id}
                                style={s.tabItem}
                                onPress={() => handleTabPress(tab)}
                                activeOpacity={0.7}
                            >
                                <Text style={[s.tabIcon, isActive && s.tabIconActive]}>
                                    {tab.icon}
                                </Text>
                                <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>
                                    {tab.label}
                                </Text>
                                {isActive && <View style={s.tabActiveDot} />}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* ── Slide-down hamburger menu modal ── */}
            <Modal
                visible={menuOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setMenuOpen(false)}
            >
                <Pressable style={s.menuOverlay} onPress={() => setMenuOpen(false)}>
                    <Pressable style={s.menuPanel} onPress={e => e.stopPropagation()}>

                        {/* Menu header */}
                        <View style={s.menuHeader}>
                            <View style={s.menuBrand}>
                                <Text style={s.menuBrandIcon}>🛡️</Text>
                                <Text style={s.menuBrandName}>SAFORA</Text>
                            </View>
                            <TouchableOpacity
                                style={s.menuCloseBtn}
                                onPress={() => setMenuOpen(false)}
                                activeOpacity={0.7}
                            >
                                <Text style={s.menuCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={s.menuGreeting}>
                            Hello, {userName || 'there'} 👋
                        </Text>

                        {/* Menu items */}
                        <View style={s.menuItems}>
                            {menuItems.map((item, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={[s.menuItem, item.danger && s.menuItemDanger]}
                                    onPress={() => {
                                        setMenuOpen(false);
                                        item.onPress();
                                    }}
                                    activeOpacity={0.75}
                                >
                                    <Text style={s.menuItemIcon}>{item.icon}</Text>
                                    <Text style={[s.menuItemLabel, item.danger && s.menuItemLabelDanger]}>
                                        {item.label}
                                    </Text>
                                    <Text style={s.menuItemArrow}>›</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
};

// ─── Styles factory ───────────────────────────────────────────────────────────
const makeStyles = (t: AppTheme) => StyleSheet.create({

    root: {
        flex: 1,
        backgroundColor: t.colors.background,
    },

    // ── Map ──
    mapContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },

    // ── Overlay ──
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-end',
    },

    flex1: {
        flex: 1,
    },

    // ── Header ──
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 52,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        zIndex: 10,
    },

    headerLeft: {
        flex: 1,
        gap: 6,
    },

    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },

    // Pink Pass badge pill
    pinkPassBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: t.colors.primary,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 5,
        alignSelf: 'flex-start',
        gap: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 5,
    },
    pinkPassBadgeIcon: {
        fontSize: 13,
    },
    pinkPassBadgeText: {
        fontSize: 11,
        fontWeight: '900',
        color: t.colors.black,
        letterSpacing: 1,
    },

    // Greeting
    greetingText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },

    // Avatar circle
    avatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: t.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: t.colors.primary,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
    },
    avatarText: {
        fontSize: 17,
        fontWeight: '900',
        color: t.colors.black,
    },

    // Hamburger
    hamburgerBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 5,
    },
    hamburgerIcon: {
        fontSize: 17,
        color: t.colors.black,
    },

    // ── Bottom card ──
    bottomCard: {
        backgroundColor: t.colors.card,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 80, // space for tab bar (56px) + gap
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 18,
    },

    dragHandle: {
        width: 38,
        height: 4,
        borderRadius: 2,
        backgroundColor: t.colors.border,
        alignSelf: 'center',
        marginBottom: 18,
    },

    // ── Search bar ──
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: t.dark ? t.colors.card : '#F7F7F7',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: t.colors.border,
        height: 52,
        paddingHorizontal: 14,
        marginBottom: 20,
        gap: 10,
    },
    searchIcon: {
        fontSize: 16,
    },
    searchPlaceholder: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: t.colors.placeholder,
    },
    searchActionBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: t.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchActionIcon: {
        fontSize: 14,
        color: t.colors.black,
        fontWeight: '700',
    },

    // ── Quick shortcuts ──
    shortcuts: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },

    shortcutItem: {
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },

    shortcutCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },

    shortcutEmoji: {
        fontSize: 22,
    },

    shortcutLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: t.colors.text,
        textAlign: 'center',
    },

    shortcutSubtitle: {
        fontSize: 10,
        fontWeight: '500',
        color: t.colors.textSecondary,
        textAlign: 'center',
    },

    // ── Tab bar ──
    tabBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        backgroundColor: t.colors.card,
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: t.colors.divider,
        paddingBottom: 6,
    },

    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 8,
        gap: 2,
    },

    tabIcon: {
        fontSize: 22,
        opacity: 0.45,
    },

    tabIconActive: {
        opacity: 1,
    },

    tabLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: t.colors.textSecondary,
    },

    tabLabelActive: {
        color: t.colors.primary,
        fontWeight: '700',
    },

    tabActiveDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: t.colors.primary,
        marginTop: 1,
    },

    // ── Menu modal ──
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-start',
    },

    menuPanel: {
        backgroundColor: t.colors.card,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        paddingTop: 56,
        paddingBottom: 24,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 20,
    },

    menuHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },

    menuBrand: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    menuBrandIcon: {
        fontSize: 22,
    },

    menuBrandName: {
        fontSize: 20,
        fontWeight: '900',
        color: t.colors.primary,
        letterSpacing: 3,
    },

    menuCloseBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: t.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },

    menuCloseText: {
        color: t.colors.textSecondary,
        fontSize: 16,
        fontWeight: '700',
    },

    menuGreeting: {
        color: t.colors.textSecondary,
        fontSize: 13,
        marginBottom: 20,
    },

    menuItems: {
        gap: 4,
    },

    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: t.colors.background,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: t.colors.divider,
    },

    menuItemDanger: {
        borderColor: 'rgba(255,59,48,0.2)',
        backgroundColor: 'rgba(255,59,48,0.05)',
        marginTop: 8,
    },

    menuItemIcon: {
        fontSize: 18,
        width: 26,
    },

    menuItemLabel: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
        color: t.colors.text,
    },

    menuItemLabelDanger: {
        color: t.colors.danger,
    },

    menuItemArrow: {
        color: t.colors.textSecondary,
        fontSize: 20,
        fontWeight: '300',
    },
});

export default HomeScreen;
