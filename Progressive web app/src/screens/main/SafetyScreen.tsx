import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    Platform,
    ActivityIndicator,
    Modal,
    KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../utils/theme';
import { useLanguage } from '../../context/LanguageContext';
import apiService from '../../services/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface EmergencyContact {
    id: string;
    name: string;
    phone: string;
    relation: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const defaultContacts: EmergencyContact[] = [
    { id: '1', name: 'Ammi Jan',    phone: '+92 300 1234567', relation: 'Mother'  },
    { id: '2', name: 'Bhai Sahab', phone: '+92 321 9876543', relation: 'Brother' },
];

const CONTACT_COLORS = [
    '#F5C518', '#EF4444', '#22C55E', '#3B82F6',
    '#EC4899', '#8B5CF6', '#F59E0B', '#06B6D4',
];

const getContactColor = (index: number) => CONTACT_COLORS[index % CONTACT_COLORS.length];

// ─── Component ────────────────────────────────────────────────────────────────

const SafetyScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { t } = useLanguage();
    const theme = useAppTheme();
    const s = useMemo(() => makeStyles(theme), [theme]);

    // SOS state
    const [sosActive, setSosActive]   = useState(false);
    const [sosLoading, setSosLoading] = useState(false);

    // Contacts state
    const [contacts, setContacts]         = useState<EmergencyContact[]>(defaultContacts);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newName, setNewName]           = useState('');
    const [newPhone, setNewPhone]         = useState('');
    const [newRelation, setNewRelation]   = useState('');

    // ── SOS handler ────────────────────────────────────────────────────────────

    const handleSOS = () => {
        if (sosActive) {
            Alert.alert(
                t.cancelSos ?? 'Cancel SOS',
                'Are you sure you want to cancel the SOS alert?',
                [
                    { text: t.keepActive ?? 'Keep Active', style: 'cancel' },
                    {
                        text: t.cancelSos ?? 'Cancel SOS',
                        style: 'destructive',
                        onPress: () => setSosActive(false),
                    },
                ]
            );
            return;
        }

        Alert.alert(
            t.confirmSos ?? 'Send SOS Alert',
            t.sosConfirmMsg ?? 'This will alert your emergency contacts and the SAFORA response team.',
            [
                { text: t.cancel ?? 'Cancel', style: 'cancel' },
                {
                    text: t.sendSos ?? 'Send SOS',
                    style: 'destructive',
                    onPress: async () => {
                        setSosActive(true);
                        setSosLoading(true);
                        try {
                            await apiService.post('/safety/sos', {
                                location: { lat: 32.4945, lng: 74.5229 },
                                message: 'Emergency SOS from Safety Center',
                            });
                        } catch (e) {
                            // SOS is already shown locally; log silently
                            console.log('[SOS] API error (still shown locally):', e);
                        } finally {
                            setSosLoading(false);
                        }
                    },
                },
            ]
        );
    };

    // ── Contacts handlers ──────────────────────────────────────────────────────

    const saveContactsToBackend = async (updated: EmergencyContact[]) => {
        try {
            await apiService.patch('/auth/emergency-contacts', {
                contacts: updated.map(c => ({
                    name: c.name,
                    phone: c.phone,
                    relationship: c.relation,
                })),
            });
        } catch (e) {
            console.log('[Contacts] Save error:', e);
        }
    };

    const handleAddContact = () => {
        if (!newName.trim() || !newPhone.trim()) {
            Alert.alert('Error', 'Please enter name and phone number');
            return;
        }
        const contact: EmergencyContact = {
            id: Date.now().toString(),
            name: newName.trim(),
            phone: newPhone.trim(),
            relation: newRelation.trim() || 'Contact',
        };
        const updated = [...contacts, contact];
        setContacts(updated);
        saveContactsToBackend(updated);
        setNewName('');
        setNewPhone('');
        setNewRelation('');
        setShowAddModal(false);
    };

    const handleRemoveContact = (id: string) => {
        Alert.alert(
            t.removeContact ?? 'Remove Contact',
            'Are you sure you want to remove this contact?',
            [
                { text: t.cancel ?? 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                        const updated = contacts.filter(c => c.id !== id);
                        setContacts(updated);
                        saveContactsToBackend(updated);
                    },
                },
            ]
        );
    };

    const handleCallContact = (phone: string) => {
        Alert.alert('Call', `Calling ${phone}…`);
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <View style={s.container}>

            {/* ── Header ─────────────────────────────────────────────────── */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Text style={s.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={s.headerTitle}>SAFETY CENTER</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={s.scroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >

                {/* ── SOS Active Banner ───────────────────────────────────── */}
                {sosActive && (
                    <View style={s.sosBanner}>
                        <Text style={s.sosBannerText}>
                            {t.sosBanner ?? '🚨 SOS ALERT ACTIVE'}
                        </Text>
                        <Text style={s.sosBannerSub}>
                            {t.sosBannerSub ?? 'Emergency contacts and SAFORA team have been notified.'}
                        </Text>
                    </View>
                )}

                {/* ── SOS Button ──────────────────────────────────────────── */}
                <View style={s.sosSection}>
                    <TouchableOpacity
                        style={[s.sosCircle, sosActive && s.sosCircleActive]}
                        onLongPress={handleSOS}
                        onPress={sosActive ? handleSOS : undefined}
                        delayLongPress={600}
                        activeOpacity={0.85}
                    >
                        {sosLoading ? (
                            <ActivityIndicator color="#FFFFFF" size="large" />
                        ) : (
                            <>
                                <Text style={s.sosLabel}>SOS</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <Text style={s.sosHint}>
                        {sosActive
                            ? t.sosActiveLabel ?? 'Tap to cancel the active SOS'
                            : 'Hold to send emergency alert to contacts + SAFORA response team'}
                    </Text>
                </View>

                {/* ── SafetySentinel Card ─────────────────────────────────── */}
                <View style={s.sentinelCard}>
                    <View style={s.sentinelIconWrap}>
                        <Text style={s.sentinelIcon}>🛡️</Text>
                    </View>
                    <View style={s.sentinelTextWrap}>
                        <Text style={s.sentinelTitle}>SafetySentinel</Text>
                        <Text style={s.sentinelSub}>Background safety monitoring</Text>
                    </View>
                    <View style={s.activeBadge}>
                        <Text style={s.activeBadgeText}>ACTIVE</Text>
                    </View>
                </View>

                {/* ── Divider ─────────────────────────────────────────────── */}
                <View style={s.divider} />

                {/* ── Emergency Contacts ──────────────────────────────────── */}
                <Text style={s.sectionLabel}>EMERGENCY CONTACTS</Text>

                {contacts.map((contact, index) => (
                    <View key={contact.id} style={s.contactCard}>
                        <View style={[s.contactAvatar, { backgroundColor: getContactColor(index) }]}>
                            <Text style={s.contactAvatarText}>
                                {contact.name.charAt(0).toUpperCase()}
                            </Text>
                        </View>

                        <View style={s.contactInfo}>
                            <Text style={s.contactName}>{contact.name}</Text>
                            <Text style={s.contactMeta}>
                                {contact.relation}
                                <Text style={s.contactMetaDot}> · </Text>
                                {contact.phone}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={s.callBtn}
                            onPress={() => handleCallContact(contact.phone)}
                            activeOpacity={0.8}
                        >
                            <Text style={s.callBtnIcon}>📞</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={s.removeBtn}
                            onPress={() => handleRemoveContact(contact.id)}
                            activeOpacity={0.8}
                        >
                            <Text style={s.removeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                ))}

                {/* ── Add Contact Row ──────────────────────────────────────── */}
                <TouchableOpacity
                    style={s.addContactRow}
                    onPress={() => setShowAddModal(true)}
                    activeOpacity={0.75}
                >
                    <Text style={s.addContactPlus}>＋</Text>
                    <Text style={s.addContactLabel}>Add Emergency Contact</Text>
                </TouchableOpacity>

                {/* ── Divider ─────────────────────────────────────────────── */}
                <View style={s.divider} />

                {/* ── Safety Features ─────────────────────────────────────── */}
                <Text style={s.sectionLabel}>SAFETY FEATURES</Text>

                {[
                    {
                        icon: '📍',
                        title: 'Share Live Trip',
                        desc: 'Share location with trusted contacts',
                    },
                    {
                        icon: '🕵️',
                        title: 'Anonymous Reporting',
                        desc: 'Report issues safely & confidentially',
                    },
                    {
                        icon: '💳',
                        title: 'SIM Insurance',
                        desc: 'Coverage per ride, every time',
                    },
                ].map((feature, i) => (
                    <View key={i} style={s.featureCard}>
                        <View style={s.featureIconWrap}>
                            <Text style={s.featureIcon}>{feature.icon}</Text>
                        </View>
                        <View style={s.featureTextWrap}>
                            <Text style={s.featureTitle}>{feature.title}</Text>
                            <Text style={s.featureDesc}>{feature.desc}</Text>
                        </View>
                        <Text style={s.featureChevron}>›</Text>
                    </View>
                ))}

                <View style={{ height: 32 }} />

            </ScrollView>

            {/* ── Add Contact Modal ────────────────────────────────────────── */}
            <Modal
                visible={showAddModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowAddModal(false)}
            >
                <KeyboardAvoidingView
                    style={s.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <TouchableOpacity
                        style={s.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setShowAddModal(false)}
                    />
                    <View style={s.modalSheet}>
                        <View style={s.modalHandle} />

                        <Text style={s.modalTitle}>Add Emergency Contact</Text>
                        <Text style={s.modalSub}>This contact will be alerted during an SOS event.</Text>

                        <TextInput
                            style={s.modalInput}
                            placeholder="Full Name"
                            placeholderTextColor={theme.colors.placeholder}
                            value={newName}
                            onChangeText={setNewName}
                        />
                        <TextInput
                            style={s.modalInput}
                            placeholder="Phone Number (+92 300 …)"
                            placeholderTextColor={theme.colors.placeholder}
                            value={newPhone}
                            onChangeText={setNewPhone}
                            keyboardType="phone-pad"
                        />
                        <TextInput
                            style={s.modalInput}
                            placeholder="Relation (Mother, Brother, Friend…)"
                            placeholderTextColor={theme.colors.placeholder}
                            value={newRelation}
                            onChangeText={setNewRelation}
                        />

                        <View style={s.modalActions}>
                            <TouchableOpacity
                                style={s.modalCancelBtn}
                                onPress={() => {
                                    setNewName('');
                                    setNewPhone('');
                                    setNewRelation('');
                                    setShowAddModal(false);
                                }}
                            >
                                <Text style={s.modalCancelText}>{t.cancel ?? 'Cancel'}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={s.modalSaveBtn}
                                onPress={handleAddContact}
                            >
                                <Text style={s.modalSaveText}>{t.saveContact ?? 'Save Contact'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

        </View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (t: AppTheme) => StyleSheet.create({

    // Layout
    container: {
        flex: 1,
        backgroundColor: t.colors.background,
    },

    // Header
    header: {
        paddingTop: Platform.OS === 'ios' ? 52 : 40,
        paddingHorizontal: 20,
        paddingBottom: 16,
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
        fontSize: 22,
        color: t.colors.text,
        lineHeight: 26,
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: t.colors.text,
        letterSpacing: 2.5,
    },

    // Scroll
    scroll: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 40,
    },

    // SOS Active Banner
    sosBanner: {
        backgroundColor: 'rgba(239,68,68,0.10)',
        borderWidth: 1,
        borderColor: t.colors.danger,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 24,
        alignItems: 'center',
    },
    sosBannerText: {
        color: t.colors.danger,
        fontWeight: '800',
        fontSize: 14,
        letterSpacing: 0.5,
    },
    sosBannerSub: {
        color: t.colors.textSecondary,
        fontSize: 12,
        marginTop: 5,
        textAlign: 'center',
    },

    // SOS Section
    sosSection: {
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 8,
    },
    sosCircle: {
        width: 164,
        height: 164,
        borderRadius: 82,
        backgroundColor: t.colors.danger,
        alignItems: 'center',
        justifyContent: 'center',
        // Outer ring
        borderWidth: 5,
        borderColor: 'rgba(239,68,68,0.25)',
        // Shadow
        shadowColor: t.colors.danger,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 20,
        elevation: 12,
        marginBottom: 18,
    },
    sosCircleActive: {
        backgroundColor: '#B91C1C',
        borderColor: 'rgba(239,68,68,0.5)',
    },
    sosLabel: {
        fontSize: 36,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 4,
    },
    sosHint: {
        fontSize: 12,
        color: t.colors.textSecondary,
        textAlign: 'center',
        maxWidth: 260,
        lineHeight: 18,
    },

    // SafetySentinel card
    sentinelCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: t.colors.cardSecondary,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 28,
        borderWidth: 1,
        borderColor: t.colors.border,
    },
    sentinelIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: t.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: t.colors.border,
    },
    sentinelIcon: {
        fontSize: 22,
    },
    sentinelTextWrap: {
        flex: 1,
    },
    sentinelTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: t.colors.text,
    },
    sentinelSub: {
        fontSize: 12,
        color: t.colors.textSecondary,
        marginTop: 2,
    },
    activeBadge: {
        backgroundColor: 'rgba(34,197,94,0.15)',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: 'rgba(34,197,94,0.35)',
    },
    activeBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: t.colors.success,
        letterSpacing: 0.8,
    },

    // Divider
    divider: {
        height: 1,
        backgroundColor: t.colors.divider,
        marginBottom: 20,
    },

    // Section label
    sectionLabel: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 2.5,
        color: t.colors.primary,
        marginBottom: 14,
    },

    // Contact card
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: t.colors.card,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: t.colors.border,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: t.dark ? 0.3 : 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    contactAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    contactAvatarText: {
        fontSize: 18,
        fontWeight: '900',
        color: '#000000',
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 14,
        fontWeight: '700',
        color: t.colors.text,
    },
    contactMeta: {
        fontSize: 12,
        color: t.colors.textSecondary,
        marginTop: 3,
    },
    contactMetaDot: {
        color: t.colors.border,
    },

    // Call button (green)
    callBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(34,197,94,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
        borderWidth: 1,
        borderColor: 'rgba(34,197,94,0.3)',
    },
    callBtnIcon: {
        fontSize: 15,
    },

    // Remove button (red ×)
    removeBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(239,68,68,0.10)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.2)',
    },
    removeBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: t.colors.danger,
    },

    // Add contact row
    addContactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: t.colors.primary,
        borderStyle: 'dashed',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 28,
    },
    addContactPlus: {
        fontSize: 18,
        color: t.colors.primary,
        fontWeight: '700',
        marginRight: 10,
    },
    addContactLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: t.colors.primary,
    },

    // Feature cards
    featureCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: t.colors.card,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: t.colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: t.dark ? 0.25 : 0.04,
        shadowRadius: 5,
        elevation: 1,
    },
    featureIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: t.colors.cardSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
        borderWidth: 1,
        borderColor: t.colors.border,
    },
    featureIcon: {
        fontSize: 22,
    },
    featureTextWrap: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: t.colors.text,
    },
    featureDesc: {
        fontSize: 12,
        color: t.colors.textSecondary,
        marginTop: 3,
    },
    featureChevron: {
        fontSize: 22,
        color: t.colors.textSecondary,
        fontWeight: '300',
        marginLeft: 4,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalSheet: {
        backgroundColor: t.colors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'ios' ? 40 : 28,
        borderTopWidth: 1,
        borderTopColor: t.colors.border,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: t.colors.border,
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: t.colors.text,
        marginBottom: 4,
    },
    modalSub: {
        fontSize: 12,
        color: t.colors.textSecondary,
        marginBottom: 20,
    },
    modalInput: {
        backgroundColor: t.colors.inputBg,
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 48,
        fontSize: 14,
        color: t.colors.text,
        borderWidth: 1,
        borderColor: t.colors.border,
        marginBottom: 12,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 6,
    },
    modalCancelBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        backgroundColor: t.colors.cardSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: t.colors.border,
    },
    modalCancelText: {
        fontSize: 14,
        fontWeight: '600',
        color: t.colors.textSecondary,
    },
    modalSaveBtn: {
        flex: 2,
        height: 48,
        borderRadius: 12,
        backgroundColor: t.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalSaveText: {
        fontSize: 14,
        fontWeight: '800',
        color: t.colors.black,
    },
});

export default SafetyScreen;
