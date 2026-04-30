import React, { useState } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import theme from '../../utils/theme';
import { useLanguage } from '../../context/LanguageContext';
import apiService from '../../services/api';

interface EmergencyContact {
    id: string;
    name: string;
    phone: string;
    relation: string;
}

const defaultContacts: EmergencyContact[] = [
    { id: '1', name: 'Ammi Jan', phone: '+92 300 1234567', relation: 'Mother' },
    { id: '2', name: 'Bhai Sahab', phone: '+92 321 9876543', relation: 'Brother' },
];

const SafetyScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { t } = useLanguage();
    const [sosActive, setSosActive] = useState(false);
    const [sosLoading, setSosLoading] = useState(false);
    const [contacts, setContacts] = useState<EmergencyContact[]>(defaultContacts);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newRelation, setNewRelation] = useState('');

    const handleSOS = () => {
        if (sosActive) {
            Alert.alert(
                t.cancelSos,
                'Are you sure you want to cancel the SOS alert?',
                [
                    { text: t.keepActive, style: 'cancel' },
                    {
                        text: t.cancelSos,
                        style: 'destructive',
                        onPress: () => setSosActive(false),
                    },
                ]
            );
            return;
        }

        Alert.alert(
            t.confirmSos,
            t.sosConfirmMsg,
            [
                { text: t.cancel, style: 'cancel' },
                {
                    text: t.sendSos,
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

    const saveContactsToBackend = async (updated: EmergencyContact[]) => {
        try {
            await apiService.patch('/auth/emergency-contacts', {
                contacts: updated.map(c => ({ name: c.name, phone: c.phone, relationship: c.relation }))
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
        setShowAddForm(false);
    };

    const handleRemoveContact = (id: string) => {
        Alert.alert(t.removeContact, t.removeContact, [
            { text: t.cancel, style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: () => {
                    const updated = contacts.filter(c => c.id !== id);
                    setContacts(updated);
                    saveContactsToBackend(updated);
                },
            },
        ]);
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t.safetyCenter}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* SOS Status Banner */}
                {sosActive && (
                    <View style={styles.sosBanner}>
                        <Text style={styles.sosBannerText}>{t.sosBanner}</Text>
                        <Text style={styles.sosBannerSub}>{t.sosBannerSub}</Text>
                    </View>
                )}

                {/* Big SOS Button */}
                <View style={styles.sosSection}>
                    <Text style={styles.sosSectionLabel}>{t.emergency}</Text>
                    <TouchableOpacity
                        style={[styles.sosBtn, sosActive && styles.sosBtnActive]}
                        onPress={handleSOS}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.sosPulse, sosActive && styles.sosPulseActive]} />
                        <Text style={styles.sosIcon}>🆘</Text>
                        <Text style={styles.sosBtnText}>{sosActive ? t.sos.toUpperCase() + ' ACTIVE' : t.sos}</Text>
                        <Text style={styles.sosBtnSub}>
                            {sosActive ? t.sosActiveLabel : t.holdForEmergency}
                        </Text>
                    </TouchableOpacity>

                    {/* Quick Info */}
                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoIcon}>📍</Text>
                            <Text style={styles.infoText}>Live{"\n"}Location</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoIcon}>📱</Text>
                            <Text style={styles.infoText}>SMS{"\n"}Contacts</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoIcon}>🛡️</Text>
                            <Text style={styles.infoText}>Safety{"\n"}Team</Text>
                        </View>
                    </View>
                </View>

                {/* SafetySentinel Status */}
                <View style={styles.sentinelCard}>
                    <View style={styles.sentinelLeft}>
                        <View style={styles.sentinelDot} />
                        <View>
                            <Text style={styles.sentinelTitle}>{t.sentinelActive}</Text>
                            <Text style={styles.sentinelSub}>{t.sentinelSub}</Text>
                        </View>
                    </View>
                    <Text style={styles.sentinelStatus}>ON</Text>
                </View>

                {/* Emergency Contacts */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{t.emergencyContacts}</Text>
                        <TouchableOpacity
                            style={styles.addBtn}
                            onPress={() => setShowAddForm(!showAddForm)}
                        >
                            <Text style={styles.addBtnText}>{showAddForm ? t.cancelAdd : t.addContact}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Add Contact Form */}
                    {showAddForm && (
                        <View style={styles.addForm}>
                            <TextInput
                                style={styles.formInput}
                                placeholder="Full Name"
                                placeholderTextColor={theme.colors.placeholder}
                                value={newName}
                                onChangeText={setNewName}
                            />
                            <TextInput
                                style={styles.formInput}
                                placeholder="Phone (+92 300 ...)"
                                placeholderTextColor={theme.colors.placeholder}
                                value={newPhone}
                                onChangeText={setNewPhone}
                                keyboardType="phone-pad"
                            />
                            <TextInput
                                style={styles.formInput}
                                placeholder="Relation (Mother, Brother...)"
                                placeholderTextColor={theme.colors.placeholder}
                                value={newRelation}
                                onChangeText={setNewRelation}
                            />
                            <TouchableOpacity style={styles.saveBtn} onPress={handleAddContact}>
                                <Text style={styles.saveBtnText}>{t.saveContact}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {contacts.map(contact => (
                        <View key={contact.id} style={styles.contactCard}>
                            <View style={styles.contactAvatar}>
                                <Text style={styles.contactAvatarText}>
                                    {contact.name.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.contactInfo}>
                                <Text style={styles.contactName}>{contact.name}</Text>
                                <Text style={styles.contactPhone}>{contact.phone}</Text>
                                <View style={styles.relationBadge}>
                                    <Text style={styles.relationText}>{contact.relation}</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={styles.removeBtn}
                                onPress={() => handleRemoveContact(contact.id)}
                            >
                                <Text style={styles.removeText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    ))}

                    {contacts.length === 0 && (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>{t.noContacts}</Text>
                            <Text style={styles.emptySubText}>{t.noContactsSub}</Text>
                        </View>
                    )}
                </View>

                {/* Safety Tips */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t.safetyTips}</Text>
                    {[
                        { icon: '🔍', tip: t.tip1 },
                        { icon: '📸', tip: t.tip2 },
                        { icon: '🚪', tip: t.tip3 },
                        { icon: '📍', tip: t.tip4 },
                    ].map((item, i) => (
                        <View key={i} style={styles.tipRow}>
                            <Text style={styles.tipIcon}>{item.icon}</Text>
                            <Text style={styles.tipText}>{item.tip}</Text>
                        </View>
                    ))}
                </View>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
        paddingTop: Platform.OS === 'ios' ? 50 : 40,
        paddingHorizontal: 20,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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

    sosBanner: {
        backgroundColor: 'rgba(255,68,68,0.15)',
        borderWidth: 1, borderColor: theme.colors.danger,
        borderRadius: 14, padding: 14,
        marginBottom: 20, alignItems: 'center',
    },
    sosBannerText: {
        color: theme.colors.danger, fontWeight: '800',
        fontSize: 14, letterSpacing: 1,
    },
    sosBannerSub: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 },

    sosSection: { alignItems: 'center', marginBottom: 28 },
    sosSectionLabel: {
        fontSize: 10, letterSpacing: 3, fontWeight: '800',
        color: theme.colors.textSecondary, marginBottom: 20,
    },
    sosBtn: {
        width: 160, height: 160, borderRadius: 80,
        backgroundColor: theme.colors.card,
        borderWidth: 3, borderColor: theme.colors.danger,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 28, position: 'relative', overflow: 'visible',
    },
    sosBtnActive: {
        backgroundColor: 'rgba(255,68,68,0.15)',
        borderColor: theme.colors.danger,
    },
    sosPulse: {
        position: 'absolute', width: 180, height: 180,
        borderRadius: 90, borderWidth: 1.5,
        borderColor: 'rgba(255,68,68,0.2)',
    },
    sosPulseActive: { borderColor: 'rgba(255,68,68,0.5)' },
    sosIcon: { fontSize: 36, marginBottom: 4 },
    sosBtnText: {
        fontSize: 18, fontWeight: '900', color: theme.colors.danger,
        letterSpacing: 2,
    },
    sosBtnSub: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 4 },

    infoRow: { flexDirection: 'row', gap: 32 },
    infoItem: { alignItems: 'center', gap: 6 },
    infoIcon: { fontSize: 22 },
    infoText: {
        fontSize: 10, color: theme.colors.textSecondary,
        textAlign: 'center', fontWeight: '600',
    },

    sentinelCard: {
        backgroundColor: theme.colors.card,
        borderRadius: 16, padding: 16, marginBottom: 28,
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1, borderColor: '#1E1E1E',
    },
    sentinelLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    sentinelDot: {
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: theme.colors.success,
    },
    sentinelTitle: { color: theme.colors.text, fontWeight: '700', fontSize: 13 },
    sentinelSub: { color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 },
    sentinelStatus: {
        color: theme.colors.success, fontWeight: '900',
        fontSize: 12, letterSpacing: 1,
    },

    section: { marginBottom: 28 },
    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 10, letterSpacing: 3, fontWeight: '800',
        color: theme.colors.textSecondary,
    },
    addBtn: {
        backgroundColor: 'rgba(245,197,24,0.12)',
        borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
        borderWidth: 1, borderColor: 'rgba(245,197,24,0.2)',
    },
    addBtnText: { color: theme.colors.primary, fontSize: 12, fontWeight: '700' },

    addForm: {
        backgroundColor: theme.colors.card, borderRadius: 14,
        padding: 16, marginBottom: 12, gap: 10,
        borderWidth: 1, borderColor: theme.colors.border,
    },
    formInput: {
        backgroundColor: theme.colors.background,
        borderRadius: 10, paddingHorizontal: 14,
        height: 44, fontSize: 13, color: theme.colors.text,
        borderWidth: 1, borderColor: theme.colors.border,
    },
    saveBtn: {
        backgroundColor: theme.colors.primary,
        borderRadius: 10, paddingVertical: 12,
        alignItems: 'center', marginTop: 4,
    },
    saveBtnText: { color: theme.colors.black, fontWeight: '700', fontSize: 13 },

    contactCard: {
        backgroundColor: theme.colors.card, borderRadius: 14,
        padding: 14, marginBottom: 10,
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor: '#1E1E1E',
    },
    contactAvatar: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: theme.colors.primary,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 12,
    },
    contactAvatarText: { color: theme.colors.black, fontWeight: '900', fontSize: 18 },
    contactInfo: { flex: 1 },
    contactName: { color: theme.colors.text, fontWeight: '700', fontSize: 14 },
    contactPhone: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
    relationBadge: {
        alignSelf: 'flex-start', marginTop: 4,
        backgroundColor: 'rgba(245,197,24,0.1)',
        borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
    },
    relationText: { color: theme.colors.primary, fontSize: 10, fontWeight: '700' },
    removeBtn: {
        width: 32, height: 32, borderRadius: 8,
        backgroundColor: 'rgba(255,68,68,0.1)',
        alignItems: 'center', justifyContent: 'center',
    },
    removeText: { color: theme.colors.danger, fontSize: 12, fontWeight: '700' },

    emptyState: { alignItems: 'center', padding: 24 },
    emptyText: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
    emptySubText: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 6 },

    tipRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: theme.colors.card, borderRadius: 12,
        padding: 14, marginBottom: 8,
        borderWidth: 1, borderColor: '#1E1E1E',
    },
    tipIcon: { fontSize: 20 },
    tipText: { color: theme.colors.textSecondary, fontSize: 13, flex: 1 },
});

export default SafetyScreen;
