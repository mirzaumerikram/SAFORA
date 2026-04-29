import React from 'react';
import LinearGradient from 'react-native-linear-gradient';
import { ViewStyle } from 'react-native';

interface SaforaGradientProps {
    colors: string[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    style?: ViewStyle;
    children?: React.ReactNode;
}

const SaforaGradient: React.FC<SaforaGradientProps> = ({ 
    colors, 
    start = { x: 0, y: 0 }, 
    end = { x: 1, y: 0 }, 
    style, 
    children 
}) => {
    return (
        <LinearGradient 
            colors={colors} 
            start={start} 
            end={end} 
            style={style}
        >
            {children}
        </LinearGradient>
    );
};

export default SaforaGradient;
