import React from 'react';
import Icon from 'react-native-vector-icons/Ionicons';
import { TextStyle } from 'react-native';

interface SaforaIconProps {
    name: string;
    size?: number;
    color?: string;
    style?: TextStyle;
}

const SaforaIcon: React.FC<SaforaIconProps> = ({ name, size, color, style }) => {
    return <Icon name={name} size={size} color={color} style={style} />;
};

export default SaforaIcon;
