import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../../utils/theme';
import socketService from '../../services/socket.service';
import { STORAGE_KEYS } from '../../utils/constants';

interface Message {
    id: string;
    text: string;
    sender: 'passenger' | 'driver';
    senderName: string;
    timestamp: string;
}

const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const ChatScreen: React.FC = () => {
    const navigation  = useNavigation<any>();
    const route       = useRoute<any>();
    const { rideId, senderRole, driverName } = route.params || {};

    const flatRef                     = useRef<FlatList>(null);
    const [messages, setMessages]     = useState<Message[]>([]);
    const [text, setText]             = useState('');
    const [userName, setUserName]     = useState('');
    const [connecting, setConnecting] = useState(true);

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

    const handleSend = useCallback(() => {
        const trimmed = text.trim();
        if (!trimmed) return;
        setText('');
        socketService.sendChatMessage(rideId, trimmed, senderRole, userName);
    }, [text, rideId, senderRole, userName]);

    const renderMessage = ({ item }: { item: Message }) => {
        const isMe = item.sender === senderRole;
        return (
            <View style={[styles.bubbleRow, isMe ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
                {!isMe && (
                    <View style={styles.avatarSmall}>
                        <Text style={styles.avatarSmallText}>
                            {(driverName || item.senderName || 'D').charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                    {!isMe && (
                        <Text style={styles.bubbleSenderName}>
                            {driverName || item.senderName}
                        </Text>
                    )}
                    <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                        {item.text}
                    </Text>
                    <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                        {formatTime(item.timestamp)}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>
                        {senderRole === 'passenger' ? (driverName || 'Driver') : 'Passenger'}
                    </Text>
                    <View style={styles.livePill}>
                        <View style={[styles.liveDot, !connecting && styles.liveDotOn]} />
                        <Text style={styles.liveText}>{connecting ? 'Connecting...' : 'Live'}</Text>
                    </View>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {connecting ? (
                <View style={styles.centered}>
                    <ActivityIndicator color={theme.colors.primary} />
                    <Text style={styles.connectingText}>Connecting to chat...</Text>
                </View>
            ) : (
                <FlatList
                    ref={flatRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.messageList}
                    showsVerticalScrollIndicator={false}
                    onLayout={() => flatRef.current?.scrollToEnd({ animated: false })}
                    ListEmptyComponent={
                        <View style={styles.emptyChat}>
                            <Text style={styles.emptyChatIcon}>💬</Text>
                            <Text style={styles.emptyChatText}>No messages yet</Text>
                            <Text style={styles.emptyChatSub}>Say hello to start the conversation</Text>
                        </View>
                    }
                />
            )}

            <View style={styles.inputBar}>
                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    placeholderTextColor={theme.colors.placeholder}
                    value={text}
                    onChangeText={setText}
                    multiline
                    maxLength={500}
                    returnKeyType="send"
                    onSubmitEditing={handleSend}
                    blurOnSubmit={false}
                />
                <TouchableOpacity
                    style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
                    onPress={handleSend}
                    disabled={!text.trim()}
                >
                    <Text style={styles.sendIcon}>↑</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container:       { flex: 1, backgroundColor: theme.colors.background },
    centered:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    connectingText:  { color: theme.colors.textSecondary, fontSize: 13 },

    header: {
        paddingTop: Platform.OS === 'ios' ? 54 : 44,
        paddingHorizontal: 20, paddingBottom: 14,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderBottomWidth: 1, borderBottomColor: '#1A1A1A',
    },
    backBtn:       { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center' },
    backText:      { color: theme.colors.text, fontSize: 20 },
    headerCenter:  { alignItems: 'center' },
    headerTitle:   { fontSize: 15, fontWeight: '900', color: theme.colors.text },
    livePill:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
    liveDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: '#555' },
    liveDotOn:     { backgroundColor: theme.colors.success },
    liveText:      { fontSize: 10, color: theme.colors.textSecondary },

    messageList:   { padding: 16, paddingBottom: 8, flexGrow: 1 },

    bubbleRow:      { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
    bubbleRowRight: { justifyContent: 'flex-end' },
    bubbleRowLeft:  { justifyContent: 'flex-start' },

    avatarSmall:    {
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: '#2A2A2A',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 8, marginBottom: 2,
    },
    avatarSmallText: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },

    bubble:        { maxWidth: '72%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
    bubbleMe:      { backgroundColor: theme.colors.primary, borderBottomRightRadius: 4 },
    bubbleThem:    { backgroundColor: theme.colors.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#2A2A2A' },

    bubbleSenderName: { fontSize: 10, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 3 },
    bubbleText:    { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
    bubbleTextMe:  { color: theme.colors.black },
    bubbleTime:    { fontSize: 9, color: theme.colors.textSecondary, marginTop: 4, textAlign: 'right' },
    bubbleTimeMe:  { color: 'rgba(0,0,0,0.45)' },

    emptyChat:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyChatIcon: { fontSize: 48, marginBottom: 12 },
    emptyChatText: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 6 },
    emptyChatSub:  { fontSize: 12, color: theme.colors.textSecondary },

    inputBar:      {
        flexDirection: 'row', alignItems: 'flex-end', gap: 10,
        paddingHorizontal: 16, paddingVertical: 12,
        borderTopWidth: 1, borderTopColor: '#1A1A1A',
        backgroundColor: theme.colors.background,
    },
    input:         {
        flex: 1, backgroundColor: theme.colors.card,
        borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
        color: theme.colors.text, fontSize: 14, maxHeight: 100,
        borderWidth: 1, borderColor: '#2A2A2A',
    },
    sendBtn:       { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
    sendBtnDisabled: { backgroundColor: '#2A2A2A' },
    sendIcon:      { fontSize: 18, color: theme.colors.black, fontWeight: '900' },
});

export default ChatScreen;
