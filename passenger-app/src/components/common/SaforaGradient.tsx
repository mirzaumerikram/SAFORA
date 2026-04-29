import React from 'react';
import { View, ViewStyle } from 'react-native';

interface SaforaGradientProps {
    colors: string[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    style?: ViewStyle;
    children?: React.ReactNode;
}

const SaforaGradient: React.FC<SaforaGradientProps> = ({ 
    colors, 
    style, 
    children 
}) => {
    // Basic web shim using a solid background (first color) or a CSS linear-gradient if we wanted to be fancy.
    // To keep it simple and avoid complex style mapping, we use the primary color/first color.
    return (
        <View style={[style, { backgroundColor: colors[0] }]}>
            {children}
        </View>
    );
};

export default SaforaGradient;
