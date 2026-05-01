// SAFORA Design System - Dual Theme Support
export type ThemeColors = {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  background: string;
  card: string;
  cardSecondary: string;
  text: string;
  textSecondary: string;
  border: string;
  placeholder: string;
  white: string;
  black: string;
  divider: string;
  shadow: string;
};

const common = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
    xxl: 28,
    full: 9999,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    title: 32,
    huge: 42,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '900' as const,
  },
  fonts: {
    heading: 'BebasNeue_400Regular',
    body: 'DMSans_400Regular',
    bodyMedium: 'DMSans_500Medium',
    bodyBold: 'DMSans_700Bold',
  },
};

export const lightTheme = {
  ...common,
  dark: false,
  colors: {
    primary: '#F5C518',
    secondary: '#EC4899',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    background: '#FFFFFF',
    card: '#F8F9FA',
    cardSecondary: '#F1F3F5',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    placeholder: '#9CA3AF',
    white: '#FFFFFF',
    black: '#000000',
    divider: '#F3F4F6',
    shadow: '#000000',
  },
};

export const darkTheme = {
  ...common,
  dark: true,
  colors: {
    primary: '#F5C518',
    secondary: '#EC4899',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    background: '#0A0E1A',
    card: '#161B22',
    cardSecondary: '#21262D',
    text: '#F0F6FC',
    textSecondary: '#8B949E',
    border: '#30363D',
    placeholder: '#484F58',
    white: '#FFFFFF',
    black: '#000000',
    divider: '#21262D',
    shadow: '#000000',
  },
};

export default lightTheme;
