import React, { useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, TextInput, Alert, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../utils/theme';
import apiService from '../../services/api';

const RatePassengerScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route      = useRoute<any>();
    const { theme }  = useAppTheme();
    const s          = useMemo(() => makeStyles(theme), [theme]);

    const { rideId, passengerName, fare, distance } = route.params as {
        rideId: string;
        passengerName: string;
        fare: number;
        distance: number;
    };

    const [rating, setRating]   = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const QUICK_TAGS = ['Polite', 'On time', 'Easy pickup', 'Good tipper', 'Respectful'];

    const handleSubmit = async () => {
        if (rating === 0) {
            Alert.alert('Rate Passenger', 'Please select a star rating before submitting.');
            return;
        }
        setSubmitting(true);
        try {
            await apiService.post(`/rides/${rideId}/rate`, {
                score: rating,
                comment: comment.trim() || undefined,
                raterRole: 'driver',
            });
        } catch { /* non-blocking — rating failed, still navigate */ }
        finally {
            setSubmitting(false);
            // Go back to driver dashboard
            navigation.reset({ index: 0, routes: [{ name: 'DriverApp' }] });
        }
    };

    const handleSkip = () => {
        navigation.reset({ index: 0, routes: [{ name: 'DriverApp' }] });
    };

    return (
        <View style={s.container}>
            {/* Header */}
            <View style={s.header}>
                <Text style={s.headerLabel}>RIDE COMPLETED</Text>
                <Text style={s.headerTitle}>How was your passenger?</Text>
            </View>

            {/* Trip summary */}
            <View style={s.summaryCard}>
                <View style={s.summaryRow}>
                    <Text style={s.summaryLabel}>Passenger</Text>
                    <Text style={s.summaryVal}>{passengerName}</Text>
                </View>
                <View style={s.summaryDivider} />
                <View style={s.summaryRow}>
                    <Text style={s.summaryLabel}>Fare Earned</Text>
                    <Text style={[s.summaryVal, { color: theme.colors.primary }]}>RS {fare}</Text>
                </View>
                <View style={s.summaryDivider} />
                <View style={s.summaryRow}>
                    <Text style={s.summaryLabel}>Distance</Text>
                    <Text style={s.summaryVal}>{distance?.toFixed(1) || '—'} km</Text>
                </View>
            </View>

            {/* Stars */}
            <Text style={s.sectionLabel}>Your Rating</Text>
            <View style={s.starsRow}>
                {[1, 2, 3, 4, 5].map(star => (
                    <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                        <Text style={[s.star, star <= rating && s.starActive]}>★</Text>
                    </TouchableOpacity>
                ))}
            </View>
            {rating > 0 && (
                <Text style={s.ratingLabel}>
                    {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
                </Text>
            )}

            {/* Quick tags */}
            <Text style={s.sectionLabel}>Quick Tags (optional)</Text>
            <View style={s.tagsRow}>
                {QUICK_TAGS.map(tag => {
                    const selected = comment.includes(tag);
                    return (
                        <TouchableOpacity
                            key={tag}
                            style={[s.tag, selected && s.tagActive]}
                            onPress={() => {
                                if (selected) {
                                    setComment(comment.replace(tag, '').replace('  ', ' ').trim());
                                } else {
                                    setComment(prev => prev ? `${prev} ${tag}` : tag);
                                }
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={[s.tagText, selected && s.tagTextActive]}>{tag}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Comment box */}
            <Text style={s.sectionLabel}>Add a comment (optional)</Text>
            <TextInput
                style={s.commentInput}
                placeholder="Any feedback about this passenger…"
                placeholderTextColor={theme.colors.placeholder}
                value={comment}
                onChangeText={setComment}
                multiline
                maxLength={300}
            />

            {/* Buttons */}
            <TouchableOpacity
                style={[s.submitBtn, (rating === 0 || submitting) && s.submitDisabled]}
                onPress={handleSubmit}
                disabled={rating === 0 || submitting}
            >
                {submitting
                    ? <ActivityIndicator color={theme.colors.black} />
                    : <Text style={s.submitText}>Submit Rating</Text>
                }
            </TouchableOpacity>

            <TouchableOpacity style={s.skipBtn} onPress={handleSkip}>
                <Text style={s.skipText}>Skip</Text>
            </TouchableOpacity>
        </View>
    );
};

const makeStyles = (t: AppTheme) => StyleSheet.create({
    container: {
        flex: 1, backgroundColor: t.colors.background,
        paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 48,
    },

    header:      { marginBottom: 24 },
    headerLabel: { fontSize: 11, fontWeight: '800', color: t.colors.primary, letterSpacing: 2, marginBottom: 6 },
    headerTitle: { fontSize: 26, fontWeight: '900', color: t.colors.text },

    summaryCard: {
        backgroundColor: t.colors.card, borderRadius: 18,
        padding: 18, marginBottom: 28,
        borderWidth: 1, borderColor: t.colors.border,
    },
    summaryRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    summaryLabel:   { fontSize: 13, color: t.colors.textSecondary },
    summaryVal:     { fontSize: 14, fontWeight: '700', color: t.colors.text },
    summaryDivider: { height: 1, backgroundColor: t.colors.divider, marginVertical: 2 },

    sectionLabel: { fontSize: 10, fontWeight: '800', color: t.colors.textSecondary, letterSpacing: 1.5, marginBottom: 12 },

    starsRow:    { flexDirection: 'row', gap: 8, marginBottom: 8 },
    star:        { fontSize: 44, color: t.dark ? '#333' : '#DDD' },
    starActive:  { color: '#F5C518' },
    ratingLabel: { fontSize: 15, fontWeight: '700', color: t.colors.text, marginBottom: 24 },

    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    tag:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: t.colors.card, borderWidth: 1, borderColor: t.colors.border },
    tagActive:     { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
    tagText:       { fontSize: 13, color: t.colors.textSecondary, fontWeight: '600' },
    tagTextActive: { color: t.colors.black, fontWeight: '700' },

    commentInput: {
        backgroundColor: t.colors.card, borderRadius: 14, padding: 14,
        fontSize: 14, color: t.colors.text, borderWidth: 1, borderColor: t.colors.border,
        minHeight: 80, textAlignVertical: 'top', marginBottom: 24,
    },

    submitBtn:      { backgroundColor: t.colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
    submitDisabled: { opacity: 0.4 },
    submitText:     { fontSize: 15, fontWeight: '900', color: t.colors.black },
    skipBtn:        { alignItems: 'center', paddingVertical: 12 },
    skipText:       { fontSize: 14, color: t.colors.textSecondary },
});

export default RatePassengerScreen;
