import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Modal, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SaforaMap from '../../components/SaforaMap';
import { useNavigation } from '@react-navigation/native';
import theme from '../../utils/theme';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { STORAGE_KEYS } from '../../utils/constants';

const { width, height } = Dimensions.get('window');

const HomeScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { t } = useLanguage();
    const { logout } = useAuth();
    const [userName, setUserName] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEYS.USER_DATA).then(raw => {
            if (raw) {
                const user = JSON.parse(raw);
                setUserName(user?.name?.split(' ')[0] || '');
            }
        });
    }, []);

    const menuItems = [
        { icon: '👤', label: 'My Profile',      onPress: () => navigation.navigate('Profile') },
        { icon: '📍', label: 'Ride History',     onPress: () => navigation.navigate('RideHistory') },
        { icon: '🛡️', label: 'Safety Center',    onPress: () => navigation.navigate('Safety') },
        { icon: '🎀', label: 'Pink Pass',         onPress: () => navigation.navigate('PinkPass') },
        { icon: '🚪', label: 'Logout',            onPress: () => logout(), danger: true },
    ];

    const initialRegion = {
        latitude: 32.4945,
        longitude: 74.5229, // Sialkot Coordinates
        latitudeDelta: 0.015,
        longitudeDelta: 0.0121,
    };

    const handleSearchPress = () => {
        navigation.navigate('RideSelection');
    };

    return (
        <View style={styles.container}>
            <SaforaMap type="home" />

            {/* Slide-down Menu Modal */}
            <Modal
                visible={menuOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setMenuOpen(false)}
            >
                <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
                    <Pressable style={styles.menuPanel} onPress={e => e.stopPropagation()}>
                        {/* Menu Header */}
                        <View style={styles.menuHeader}>
                            <View style={styles.menuBrand}>
                                <Text style={styles.menuBrandIcon}>🛡️</Text>
                                <Text style={styles.menuBrandName}>SAFORA</Text>
                            </View>
                            <TouchableOpacity onPress={() => setMenuOpen(false)} style={styles.menuClose}>
                                <Text style={styles.menuCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.menuGreeting}>Hello, {userName || 'there'} 👋</Text>

                        {/* Menu Items */}
                        <View style={styles.menuItems}>
                            {menuItems.map((item, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={[styles.menuItem, item.danger && styles.menuItemDanger]}
                                    onPress={() => { setMenuOpen(false); item.onPress(); }}
                                >
                                    <Text style={styles.menuItemIcon}>{item.icon}</Text>
                                    <Text style={[styles.menuItemLabel, item.danger && styles.menuItemLabelDanger]}>
                                        {item.label}
                                    </Text>
                                    <Text style={styles.menuItemArrow}>›</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            <View style={styles.overlay}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.roundBtn} onPress={() => setMenuOpen(true)}>
                        <Text style={styles.btnIcon}>☰</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.roundBtn, styles.profileBtn]} onPress={() => navigation.navigate('Profile')}>
                        <Text style={styles.btnIcon}>👤</Text>
                    </TouchableOpacity>
                </View>

                {/* Bottom Sheet UI */}
                <View style={styles.bottomSheet}>
                    <View style={styles.handle} />
                    
                    <Text style={styles.title}>{t.welcomeUser}{userName ? `, ${userName}` : ''} 👋</Text>
                    <Text style={styles.subtitle}>{t.whereTo}</Text>

                    {/* Search Field */}
                    <TouchableOpacity style={styles.searchBox} onPress={handleSearchPress}>
                        <View style={styles.searchIconContainer}>
                            <View style={styles.searchDot} />
                        </View>
                        <Text style={styles.searchPlaceholder}>{t.searchPlaceholder}</Text>
                        <View style={styles.historyBtn}>
                            <Text style={styles.historyIcon}>🕒</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Quick Access Grid */}
                    <View style={styles.quickGrid}>
                        <TouchableOpacity style={styles.quickItem}>
                            <View style={[styles.quickIconBg, { backgroundColor: theme.colors.primary }]}>
                                <Text style={styles.quickEmoji}>🏠</Text>
                            </View>
                            <Text style={styles.quickLabel}>{t.homeQuick}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.quickItem}>
                            <View style={[styles.quickIconBg, { backgroundColor: '#3b3b3b' }]}>
                                <Text style={styles.quickEmoji}>💼</Text>
                            </View>
                            <Text style={styles.quickLabel}>{t.workQuick}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.quickItem}>
                            <View style={[styles.quickIconBg, { backgroundColor: theme.colors.secondary }]}>
                                <Text style={styles.quickEmoji}>🎀</Text>
                            </View>
                            <Text style={styles.quickLabel}>{t.pinkPassQuick}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Bottom Navigation */}
                <View style={styles.tabBar}>
                    <TouchableOpacity style={styles.tabItem}>
                        <Text style={[styles.tabIcon, { color: theme.colors.primary }]}>🏠</Text>
                        <View style={styles.tabActiveDot} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('RideHistory')}>
                        <Text style={styles.tabIcon}>💸</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Safety')}>
                        <Text style={styles.tabIcon}>🛡️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Profile')}>
                        <Text style={styles.tabIcon}>⚙️</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const darkMapStyle = [
    { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
    { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
    { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
];

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    map: {
        width: width,
        height: height,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'space-between',
    },
    header: {
        paddingTop: 50,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    roundBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    profileBtn: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    btnIcon: {
        fontSize: 18,
        color: '#1a1a1a',
    },
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerPulse: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.primary,
        opacity: 0.2,
        position: 'absolute',
    },
    markerInner: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: theme.colors.primary,
        borderWidth: 3,
        borderColor: theme.colors.white,
    },
    bottomSheet: {
        backgroundColor: theme.colors.card,
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        padding: 20,
        paddingBottom: 80, // leaves space for tab bar (56px) + gap
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 20,
    },
    handle: {
        width: 36,
        height: 4,
        backgroundColor: '#333',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 14,
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        color: theme.colors.text,
    },
    subtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 16,
    },
    searchBox: {
        backgroundColor: theme.colors.background,
        borderRadius: 14,
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        marginBottom: 16,
        borderWidth: 1.5,
        borderColor: '#222',
    },
    searchIconContainer: {
        marginRight: 12,
    },
    searchDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.primary,
    },
    searchPlaceholder: {
        flex: 1,
        color: theme.colors.placeholder,
        fontSize: 14,
        fontWeight: '600',
    },
    historyBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: theme.colors.cardSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyIcon: {
        fontSize: 12,
    },
    quickGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    quickItem: {
        alignItems: 'center',
        gap: 6,
    },
    quickIconBg: {
        width: 46,
        height: 46,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickEmoji: {
        fontSize: 20,
    },
    quickLabel: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    tabBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 56,
        backgroundColor: theme.colors.card,
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#1e1e1e',
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    tabIcon: {
        fontSize: 20,
        color: '#555',
    },
    tabActiveDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: theme.colors.primary,
        marginTop: 3,
    },

    // Menu modal
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-start',
    },
    menuPanel: {
        backgroundColor: theme.colors.card,
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
    menuBrandIcon: { fontSize: 22 },
    menuBrandName: {
        fontSize: 20,
        fontWeight: '900',
        color: theme.colors.primary,
        letterSpacing: 3,
    },
    menuClose: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: theme.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuCloseText: {
        color: theme.colors.textSecondary,
        fontSize: 16,
        fontWeight: '700',
    },
    menuGreeting: {
        color: theme.colors.textSecondary,
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
        backgroundColor: theme.colors.background,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#1e1e1e',
    },
    menuItemDanger: {
        borderColor: 'rgba(255,59,48,0.2)',
        backgroundColor: 'rgba(255,59,48,0.05)',
        marginTop: 8,
    },
    menuItemIcon: { fontSize: 18, width: 26 },
    menuItemLabel: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.text,
    },
    menuItemLabelDanger: {
        color: theme.colors.danger,
    },
    menuItemArrow: {
        color: theme.colors.textSecondary,
        fontSize: 20,
        fontWeight: '300',
    },
});

export default HomeScreen;
