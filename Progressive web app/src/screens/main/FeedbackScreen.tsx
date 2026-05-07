import React, { useState, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../utils/theme';
import apiService from '../../services/api';

const TAGS = [
    'Professional',
    'Safe Driving',
    'Clean Vehicle',
    'On Time',
    'Polite',
    'Great Music',
];

const FeedbackScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { rideId } = route.params || {};

    const [rating, setRating] = useState(0);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);

    const [driverName, setDriverName] = useState('Driver');
    const [carInfo, setCarInfo] = useState('');
    const [distance, setDistance] = useState<string>('--');
    const [duration, setDuration] = useState<string>('--');
    const [fare, setFare] = useState<number | null>(null);

    useEffect(() => {
        const fetchRide = async () => {
            if (!rideId) return;
            try {
                const res: any = await apiService.get(`/rides/${rideId}`);
                if (res.success && res.ride) {
                    setDriverName(res.ride.driver?.user?.name || 'Driver');
                    setCarInfo(`${res.ride.driver?.vehicle?.model || 'Car'} • ${res.ride.driver?.vehicle?.licensePlate || 'N/A'}`);
                    setDistance(res.ride.distance?.toFixed(1) || '--');
                    setDuration(res.ride.estimatedDuration ? `${Math.round(res.ride.estimatedDuration)} min` : '-- min');
                    setFare(res.ride.estimatedPrice);
                }
            } catch (err) {
                console.log('Failed to fetch ride details for feedback', err);
            }
        };
        fetchRide();
    }, [rideId]);

    const { theme } = useAppTheme();
    const s = useMemo(() => makeStyles(theme), [theme]);

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const handleSubmit = async () => {
        if (!rideId) {
            navigation.navigate('FareBreakdown', { rideId });
            return;
        }
        setLoading(true);
        try {
            await apiService.post('/rides/feedback', {
                rideId,
                rating,
                tags: selectedTags,
                comment,
            });
            navigation.navigate('FareBreakdown', { rideId });
        } catch (err: any) {
            Alert.alert('Submission Failed', err.message || 'Could not submit feedback. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView
            contentContainerStyle={s.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            {/* Arrived safely badge */}
            <View style={s.badgeRow}>
                <View style={s.badge}>
                    <Text style={s.badgeText}>✓  ARRIVED SAFELY</Text>
                </View>
            </View>

            {/* Title + subtitle */}
            <Text style={s.title}>RATE YOUR RIDE</Text>
            <Text style={s.subtitle}>
                Help us keep SAFORA safe for everyone. Your feedback matters.
            </Text>

            {/* Driver info card */}
            <View style={s.driverCard}>
                <View style={s.driverLeft}>
                    <View style={s.avatar}>
                        <Text style={s.avatarText}>{driverName.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={s.driverInfo}>
                        <Text style={s.driverName}>{driverName}</Text>
                        <Text style={s.driverSub}>{carInfo}</Text>
                    </View>
                </View>
                <View style={s.driverRight}>
                    <View style={s.distanceBadge}>
                        <Text style={s.distanceBadgeText}>{distance}KM</Text>
                    </View>
                    <Text style={s.durationText}>{duration}</Text>
                </View>
            </View>

            {/* Display Fare */}
            {fare !== null && (
                <View style={{ alignItems: 'center', marginBottom: 24 }}>
                    <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 }}>TOTAL FARE</Text>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: theme.colors.primary }}>RS {fare}</Text>
                </View>
            )}

            {/* Overall rating */}
            <Text style={s.sectionLabel}>OVERALL RATING</Text>
            <View style={s.starsRow}>
                {[1, 2, 3, 4, 5].map(star => (
                    <TouchableOpacity
                        key={star}
                        onPress={() => setRating(star)}
                        activeOpacity={0.7}
                        style={s.starBtn}
                    >
                        <Text style={[s.star, star <= rating && s.starFilled]}>
                            {star <= rating ? '★' : '☆'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Quick tags */}
            <Text style={s.sectionLabel}>QUICK TAGS</Text>
            <View style={s.tagsRow}>
                {TAGS.map(tag => {
                    const active = selectedTags.includes(tag);
                    return (
                        <TouchableOpacity
                            key={tag}
                            style={[s.tag, active && s.tagActive]}
                            onPress={() => toggleTag(tag)}
                            activeOpacity={0.75}
                        >
                            <Text style={[s.tagText, active && s.tagTextActive]}>
                                {tag}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Comment input */}
            <TextInput
                style={s.commentInput}
                placeholder="Tell us more about your experience..."
                placeholderTextColor={theme.colors.placeholder}
                multiline
                value={comment}
                onChangeText={setComment}
                textAlignVertical="top"
            />

            {/* Submit button */}
            <TouchableOpacity
                style={[s.submitBtn, loading && s.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
            >
                {loading ? (
                    <ActivityIndicator color={theme.colors.black} />
                ) : (
                    <Text style={s.submitText}>Submit Feedback →</Text>
                )}
            </TouchableOpacity>

            {/* Skip link */}
            <TouchableOpacity
                style={s.skipBtn}
                onPress={() => navigation.navigate('FareBreakdown', { rideId })}
                activeOpacity={0.6}
            >
                <Text style={s.skipText}>Skip for now</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const makeStyles = (t: AppTheme) =>
    StyleSheet.create({
        container: {
            flexGrow: 1,
            backgroundColor: t.colors.background,
            paddingHorizontal: 24,
            paddingTop: 64,
            paddingBottom: 40,
        },

        /* Arrived safely badge */
        badgeRow: {
            alignItems: 'flex-start',
            marginBottom: 20,
        },
        badge: {
            backgroundColor: t.colors.success,
            borderRadius: t.borderRadius.full,
            paddingHorizontal: 14,
            paddingVertical: 6,
        },
        badgeText: {
            color: '#FFFFFF',
            fontSize: t.fontSize.xs,
            fontWeight: t.fontWeight.heavy,
            letterSpacing: 1.2,
        },

        /* Title & subtitle */
        title: {
            fontSize: 38,
            fontWeight: t.fontWeight.heavy,
            color: t.colors.text,
            letterSpacing: 1.5,
            lineHeight: 42,
            marginBottom: 10,
            fontFamily: t.fonts.heading,
        },
        subtitle: {
            fontSize: t.fontSize.sm,
            color: t.colors.textSecondary,
            lineHeight: 20,
            marginBottom: 28,
            fontFamily: t.fonts.body,
        },

        /* Driver card */
        driverCard: {
            backgroundColor: t.colors.cardSecondary,
            borderRadius: t.borderRadius.xl,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 32,
            borderWidth: 1,
            borderColor: t.colors.border,
        },
        driverLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        avatar: {
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: t.colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
        },
        avatarText: {
            fontSize: t.fontSize.xl,
            fontWeight: t.fontWeight.heavy,
            color: t.colors.black,
        },
        driverInfo: {
            gap: 3,
        },
        driverName: {
            fontSize: t.fontSize.md,
            fontWeight: t.fontWeight.heavy,
            color: t.colors.text,
            fontFamily: t.fonts.bodyBold,
        },
        driverSub: {
            fontSize: t.fontSize.xs,
            color: t.colors.textSecondary,
            fontFamily: t.fonts.body,
        },
        driverRight: {
            alignItems: 'flex-end',
            gap: 4,
        },
        distanceBadge: {
            backgroundColor: t.colors.primary,
            borderRadius: t.borderRadius.sm,
            paddingHorizontal: 10,
            paddingVertical: 4,
        },
        distanceBadgeText: {
            fontSize: t.fontSize.xs,
            fontWeight: t.fontWeight.heavy,
            color: t.colors.black,
            letterSpacing: 0.5,
        },
        durationText: {
            fontSize: t.fontSize.xs,
            color: t.colors.textSecondary,
            fontFamily: t.fonts.body,
        },

        /* Section labels */
        sectionLabel: {
            fontSize: 10,
            letterSpacing: 3,
            color: t.colors.textSecondary,
            fontWeight: t.fontWeight.heavy,
            marginBottom: 14,
            fontFamily: t.fonts.bodyBold,
        },

        /* Stars */
        starsRow: {
            flexDirection: 'row',
            gap: 8,
            marginBottom: 32,
        },
        starBtn: {
            padding: 4,
        },
        star: {
            fontSize: 36,
            color: t.colors.border,
        },
        starFilled: {
            color: t.colors.primary,
        },

        /* Tags */
        tagsRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 28,
        },
        tag: {
            borderWidth: 1.5,
            borderColor: t.colors.border,
            borderRadius: t.borderRadius.full,
            paddingHorizontal: 16,
            paddingVertical: 9,
            backgroundColor: 'transparent',
        },
        tagActive: {
            backgroundColor: t.colors.primary,
            borderColor: t.colors.primary,
        },
        tagText: {
            fontSize: t.fontSize.xs,
            fontWeight: t.fontWeight.semibold,
            color: t.colors.textSecondary,
            fontFamily: t.fonts.bodyMedium,
        },
        tagTextActive: {
            color: t.colors.black,
        },

        /* Comment input */
        commentInput: {
            backgroundColor: t.colors.inputBg,
            borderRadius: t.borderRadius.lg,
            padding: 16,
            minHeight: 110,
            color: t.colors.text,
            fontSize: t.fontSize.sm,
            marginBottom: 32,
            borderWidth: 1,
            borderColor: t.colors.border,
            fontFamily: t.fonts.body,
        },

        /* Submit button */
        submitBtn: {
            backgroundColor: t.colors.primary,
            paddingVertical: 17,
            borderRadius: t.borderRadius.lg,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            ...(t.shadows.primary as object),
        },
        submitBtnDisabled: {
            opacity: 0.6,
        },
        submitText: {
            color: t.colors.black,
            fontSize: t.fontSize.md,
            fontWeight: t.fontWeight.heavy,
            letterSpacing: 0.5,
            fontFamily: t.fonts.bodyBold,
        },

        /* Skip */
        skipBtn: {
            alignItems: 'center',
            paddingVertical: 8,
        },
        skipText: {
            fontSize: t.fontSize.sm,
            color: t.colors.textSecondary,
            fontFamily: t.fonts.body,
            textDecorationLine: 'underline',
        },
    });

export default FeedbackScreen;
