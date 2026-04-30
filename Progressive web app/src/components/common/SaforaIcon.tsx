import React from 'react';
import { Text, TextStyle } from 'react-native';

interface SaforaIconProps {
    name: string;
    size?: number;
    color?: string;
    style?: TextStyle;
}

const SaforaIcon: React.FC<SaforaIconProps> = ({ name, size = 20, color = '#888', style }) => {
    // Simple web fallback using emojis for common icons
    const getEmoji = (iconName: string) => {
        if (iconName.includes('eye-off')) return '👁️‍🗨️';
        if (iconName.includes('eye')) return '👁️';
        if (iconName.includes('mail')) return '📧';
        if (iconName.includes('lock')) return '🔒';
        if (iconName.includes('person')) return '👤';
        if (iconName.includes('call')) return '📞';
        return '•';
    };

    return (
        <Text style={[{ fontSize: size, color }, style]}>
            {getEmoji(name)}
        </Text>
    );
};

export default SaforaIcon;
