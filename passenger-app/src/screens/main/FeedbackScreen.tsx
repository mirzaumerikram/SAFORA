import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import theme from '../../utils/theme';

const tags = ["Professional", "Helpful", "Clean vehicle", "On-time", "Great music", "Safe Driving"];

const FeedbackScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const [rating, setRating] = useState(5);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>RATE YOUR{"\n"}JOURNEY</Text>
            </View>

            <View style={styles.profileSection}>
                <Image 
                    source={{ uri: 'https://via.placeholder.com/100' }} 
                    style={styles.driverImg} 
                />
                <Text style={styles.driverName}>Ahmed Khan</Text>
                <Text style={styles.carInfo}>White Toyota Corolla • LEC-405</Text>
            </View>

            <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRating(star)}>
                        <Text style={[styles.star, star <= rating && styles.starActive]}>
                            {star <= rating ? '⭐' : '☆'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.sectionLabel}>WHAT WENT WELL?</Text>
            <View style={styles.tagGrid}>
                {tags.map((tag) => (
                    <TouchableOpacity 
                        key={tag} 
                        style={[styles.tag, selectedTags.includes(tag) && styles.tagSelected]}
                        onPress={() => toggleTag(tag)}
                    >
                        <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextSelected]}>
                            {tag}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TextInput 
                style={styles.commentInput} 
                placeholder="Leave a comment (Optional)"
                placeholderTextColor={theme.colors.placeholder}
                multiline
            />

            <TouchableOpacity 
                style={styles.submitBtn} 
                onPress={() => navigation.navigate('FareBreakdown')}
            >
                <Text style={styles.submitText}>Submit Feedback →</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: theme.colors.background,
        padding: 24,
        paddingTop: 60,
    },
    header: {
        marginBottom: 32,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: theme.colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#222',
    },
    backText: {
        color: theme.colors.text,
        fontSize: 20,
    },
    title: {
        fontSize: 36,
        color: theme.colors.text,
        fontWeight: '900',
        letterSpacing: 2,
        lineHeight: 38,
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    driverImg: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: theme.colors.card,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    driverName: {
        fontSize: 20,
        fontWeight: '900',
        color: theme.colors.text,
        marginBottom: 4,
    },
    carInfo: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    ratingRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 40,
    },
    star: {
        fontSize: 34,
        color: '#333',
    },
    starActive: {
        color: theme.colors.primary,
    },
    sectionLabel: {
        fontSize: 10,
        letterSpacing: 3,
        color: theme.colors.primary,
        fontWeight: '800',
        marginBottom: 16,
    },
    tagGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 32,
    },
    tag: {
        backgroundColor: theme.colors.card,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#222',
    },
    tagSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: 'rgba(245,197,24,0.08)',
    },
    tagText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    tagTextSelected: {
        color: theme.colors.primary,
    },
    commentInput: {
        backgroundColor: theme.colors.card,
        borderRadius: 16,
        padding: 16,
        height: 100,
        color: theme.colors.text,
        textAlignVertical: 'top',
        fontSize: 14,
        marginBottom: 40,
        borderWidth: 1,
        borderColor: '#222',
    },
    submitBtn: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 'auto',
    },
    submitText: {
        color: theme.colors.black,
        fontSize: 15,
        fontWeight: '900',
    },
});

export default FeedbackScreen;
