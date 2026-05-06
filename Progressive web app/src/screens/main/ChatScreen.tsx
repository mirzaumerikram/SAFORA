import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
    ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../utils/theme';
import socketService from '../../services/socket.service';
import { STORAGE_KEYS } from '../../utils/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
    id: string;
    text: string;
    sender: 'passenger' | 'driver';
    senderName: string;
    timestamp: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const QUICK_REPLIES = ["I'm here 📍", "On my way", "2 more min"];

// ─── Component ────────────────────────────────────────────────────────────────

const ChatScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route      = useRoute<any>();
    const { rideId, senderRole, driverName, passengerName, rideType } = route.params || {};

    const isPinkRide = rideType?.toLowerCase() === 'pink';
    const primaryColor = isPinkRide ? '#EC4899' : '#F5C518';

    const { theme } = useAppTheme();
    const s     = useMemo(() => makeStyles(theme, primaryColor), [theme, primaryColor]);

    const flatRef                     = useRef<FlatList>(null);
    const [messages, setMessages]     = useState<Message[]>([]);
    const [text, setText]             = useState('');
    const [userName, setUserName]     = useState('');
    const [connecting, setConnecting] = useState(true);

    // ── Socket / storage setup ────────────────────────────────────────────────

    useEffect(() => {
        let mounted = true;

        AsyncStorage.getItem(STORAGE_KEYS.USER_DATA).then(raw => {
            if (raw && mounted) setUserName(JSON.parse(raw)?.name || senderRole);
        });

        socketService.connect().then(() => {
            if (!mounted) return;
            setConnecting(false);
            socketService.joinChat(rideId);
            socketService.onChatMessage((msg: Message) => {
                if (!mounted) return;
                setMessages(prev => [...prev, msg]);
                setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
            });
        }).catch(() => {
            if (mounted) setConnecting(false);
        });

        return () => {
            mounted = false;
            socketService.offChat();
        };
    }, [rideId, senderRole]);

    // ── Send ──────────────────────────────────────────────────────────────────

    const handleSend = useCallback((override?: string) => {
        const trimmed = (override ?? text).trim();
        if (!trimmed) return;
        if (!override) setText('');
        socketService.sendChatMessage(rideId, trimmed, senderRole, userName);
    }, [text, rideId, senderRole, userName]);

    const handleQuickReply = useCallback((reply: string) => {
        handleSend(reply);
    }, [handleSend]);

    // ── Render message ────────────────────────────────────────────────────────

    const renderMessage = ({ item }: { item: Message }) => {
        const isMe = item.sender === senderRole;

        return (
            <View style={[s.bubbleRow, isMe ? s.bubbleRowRight : s.bubbleRowLeft]}>
                {!isMe && (
                    <View style={[s.driverAvatar, { backgroundColor: primaryColor }]}>
                        <Text style={s.driverAvatarText}>
                            {(headerName || item.senderName || 'D').charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}

                <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
                    {!isMe && (
                        <Text style={s.bubbleSenderName}>
                            {headerName || item.senderName}
                        </Text>
                    )}
                    <Text style={[s.bubbleText, isMe && s.bubbleTextMe]}>
                        {item.text}
                    </Text>
                    <Text style={[s.bubbleTime, isMe && s.bubbleTimeMe]}>
                        {formatTime(item.timestamp)}
                    </Text>
                </View>
            </View>
        );
    };

    // ── Display name helpers ──────────────────────────────────────────────────

    const headerName = senderRole === 'passenger' ? (driverName || 'Driver') : (passengerName || 'Passenger');
    const headerInitial = headerName.charAt(0).toUpperCase();

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <KeyboardAvoidingView
            style={s.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            {/* ── Header ─────────────────────────────────────────────────── */}
            <View style={s.header}>
                {/* Back */}
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Text style={s.backText}>←</Text>
                </TouchableOpacity>

                {/* Center: avatar + name + status */}
                <View style={s.headerCenter}>
                    <View style={s.headerAvatarWrap}>
                        <View style={[s.headerAvatar, { backgroundColor: primaryColor }]}>
                            <Text style={s.headerAvatarText}>{headerInitial}</Text>
                        </View>

                        <View style={s.headerInfo}>
                            <Text style={s.headerName}>{headerName}</Text>
                            <View style={s.headerStatusRow}>
                                <View style={s.greenDot} />
                                <Text style={s.headerStatus}>
                                    {connecting ? 'Connecting...' : 'Online · Arriving soon'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Phone button */}
                <TouchableOpacity style={s.phoneBtn}>
                    <Text style={s.phoneIcon}>📞</Text>
                </TouchableOpacity>
            </View>

            {/* ── Messages ───────────────────────────────────────────────── */}
            {connecting ? (
                <View style={s.centered}>
                    <ActivityIndicator color={theme.colors.primary} size="large" />
                    <Text style={s.connectingText}>Connecting to chat...</Text>
                </View>
            ) : (
                <FlatList
                    ref={flatRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={s.messageList}
                    showsVerticalScrollIndicator={false}
                    onLayout={() => flatRef.current?.scrollToEnd({ animated: false })}
                    ListEmptyComponent={
                        <View style={s.emptyChat}>
                            <Text style={s.emptyChatIcon}>💬</Text>
                            <Text style={s.emptyChatText}>No messages yet</Text>
                            <Text style={s.emptyChatSub}>Say hello to start the conversation</Text>
                        </View>
                    }
                />
            )}

            {/* ── Bottom area ────────────────────────────────────────────── */}
            <View style={s.bottomArea}>
                {/* Quick replies */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.quickRepliesContent}
                    style={s.quickRepliesRow}
                >
                    {QUICK_REPLIES.map(reply => (
                        <TouchableOpacity
                            key={reply}
                            style={s.quickChip}
                            onPress={() => handleQuickReply(reply)}
                            activeOpacity={0.7}
                        >
                            <Text style={s.quickChipText}>{reply}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Input row */}
                <View style={s.inputBar}>
                    <TextInput
                        style={s.input}
                        placeholder="Type a message..."
                        placeholderTextColor={theme.colors.placeholder}
                        value={text}
                        onChangeText={setText}
                        multiline
                        maxLength={500}
                        returnKeyType="send"
                        onSubmitEditing={() => handleSend()}
                        blurOnSubmit={false}
                    />
                    <TouchableOpacity
                        style={[s.sendBtn, !text.trim() && s.sendBtnDisabled]}
                        onPress={() => handleSend()}
                        disabled={!text.trim()}
                        activeOpacity={0.8}
                    >
                        <Text style={s.sendIcon}>➤</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (t: AppTheme, primaryColor: string) => StyleSheet.create({

    // ── Root ──────────────────────────────────────────────────────────────────
    container: {
        flex: 1,
        backgroundColor: t.colors.background,
    },

    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    connectingText: {
        color: t.colors.textSecondary,
        fontSize: t.fontSize.xs,
        fontFamily: t.fonts.body,
    },

    // ── Header ────────────────────────────────────────────────────────────────
    header: {
        paddingTop: Platform.OS === 'ios' ? 54 : 44,
        paddingHorizontal: 16,
        paddingBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: t.colors.background,
        borderBottomWidth: 1,
        borderBottomColor: t.colors.border,
    },

    backBtn: {
        width: 40,
        height: 40,
        borderRadius: t.borderRadius.sm,
        backgroundColor: t.colors.cardSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backText: {
        fontSize: 20,
        color: t.colors.text,
        lineHeight: 24,
    },

    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerAvatarWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: primaryColor,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerAvatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000000',
    },
    headerInfo: {
        alignItems: 'flex-start',
    },
    headerName: {
        fontSize: t.fontSize.sm,
        fontWeight: t.fontWeight.bold,
        color: t.colors.text,
        fontFamily: t.fonts.bodyBold,
    },
    headerStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 2,
    },
    greenDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#22C55E',
    },
    headerStatus: {
        fontSize: 11,
        color: '#22C55E',
        fontFamily: t.fonts.body,
    },

    phoneBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: t.colors.cardSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    phoneIcon: {
        fontSize: 16,
    },

    // ── Message list ──────────────────────────────────────────────────────────
    messageList: {
        padding: 16,
        paddingBottom: 12,
        flexGrow: 1,
    },

    bubbleRow: {
        flexDirection: 'row',
        marginBottom: 14,
        alignItems: 'flex-end',
    },
    bubbleRowRight: {
        justifyContent: 'flex-end',
    },
    bubbleRowLeft: {
        justifyContent: 'flex-start',
    },

    // Driver avatar (small, beside bubble)
    driverAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F5C518',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
        marginBottom: 2,
    },
    driverAvatarText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#000000',
    },

    // Bubbles
    bubble: {
        maxWidth: '72%',
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    // Passenger bubble — dynamic
    bubbleMe: {
        backgroundColor: primaryColor,
        borderBottomRightRadius: 4,
    },
    // Driver bubble — soft theme-aware gray
    bubbleThem: {
        backgroundColor: t.colors.cardSecondary,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: t.colors.border,
    },

    bubbleSenderName: {
        fontSize: 10,
        fontWeight: '700',
        color: t.colors.textSecondary,
        marginBottom: 3,
        fontFamily: t.fonts.bodyBold,
    },
    bubbleText: {
        fontSize: t.fontSize.sm,
        color: t.colors.text,
        lineHeight: 20,
        fontFamily: t.fonts.body,
    },
    bubbleTextMe: {
        color: '#FFFFFF',
        fontFamily: t.fonts.body,
    },
    bubbleTime: {
        fontSize: 9,
        color: t.colors.textSecondary,
        marginTop: 4,
        textAlign: 'right',
        fontFamily: t.fonts.body,
    },
    bubbleTimeMe: {
        color: 'rgba(255,255,255,0.65)',
    },

    // ── Empty state ───────────────────────────────────────────────────────────
    emptyChat: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
    emptyChatIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    emptyChatText: {
        fontSize: t.fontSize.md,
        fontWeight: '700',
        color: t.colors.text,
        marginBottom: 6,
        fontFamily: t.fonts.bodyBold,
    },
    emptyChatSub: {
        fontSize: t.fontSize.xs,
        color: t.colors.textSecondary,
        fontFamily: t.fonts.body,
    },

    // ── Bottom area ───────────────────────────────────────────────────────────
    bottomArea: {
        backgroundColor: t.colors.background,
        borderTopWidth: 1,
        borderTopColor: t.colors.border,
        paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    },

    // Quick reply chips
    quickRepliesRow: {
        paddingTop: 10,
        paddingBottom: 8,
    },
    quickRepliesContent: {
        paddingHorizontal: 16,
        gap: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    quickChip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: t.borderRadius.full,
        backgroundColor: t.colors.cardSecondary,
        borderWidth: 1,
        borderColor: t.colors.border,
    },
    quickChipText: {
        fontSize: t.fontSize.xs,
        color: t.colors.text,
        fontFamily: t.fonts.body,
        fontWeight: t.fontWeight.medium,
    },

    // Input row
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
        paddingHorizontal: 16,
        paddingTop: 6,
        paddingBottom: 4,
    },
    input: {
        flex: 1,
        backgroundColor: t.colors.inputBg,
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 10,
        color: t.colors.text,
        fontSize: t.fontSize.sm,
        maxHeight: 100,
        borderWidth: 1,
        borderColor: t.colors.border,
        fontFamily: t.fonts.body,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: primaryColor,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendBtnDisabled: {
        backgroundColor: t.colors.cardSecondary,
    },
    sendIcon: {
        fontSize: 16,
        color: '#000000',
        fontWeight: '900',
    },
});

export default ChatScreen;
