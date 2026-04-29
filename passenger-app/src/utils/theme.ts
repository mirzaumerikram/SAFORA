// Theme configuration for SAFORA – Sleek Dark Mode
export const theme = {
    colors: {
        primary: '#F5C518', // SAFORA Yellow
        secondary: '#FF6B9D', // Pink Pass
        success: '#00E676', // Online status
        warning: '#FFA000',
        danger: '#FF4444', // SOS
        background: '#0A0A0A', // Deep Black
        card: '#1A1A1A', // Dark Gray Cards
        cardSecondary: '#2A2A2A',
        text: '#F0F0F0', // Off-white
        textSecondary: '#888888', // Muted Gray
        border: '#2A2A2A',
        placeholder: '#444444',
        white: '#FFFFFF',
        black: '#000000',
        divider: '#1E1E1E',
    },
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
        heading: 'BebasNeue_400Regular', // Impactful headers
        body: 'DMSans_400Regular',
        bodyMedium: 'DMSans_500Medium',
        bodyBold: 'DMSans_700Bold',
    },
    shadows: {
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
        },
        primary: {
            shadowColor: '#F5C518',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 10,
        },
        dark: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 15,
        },
    },
};

export default theme;
