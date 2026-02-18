// Theme configuration for SAFORA Passenger App
export const theme = {
    colors: {
        primary: '#6C63FF',
        secondary: '#FF6584',
        success: '#4CAF50',
        warning: '#FF9800',
        danger: '#F44336',
        background: '#F5F7FA',
        card: '#FFFFFF',
        text: '#2C3E50',
        textSecondary: '#7F8C8D',
        border: '#E0E0E0',
        placeholder: '#BDC3C7',
        white: '#FFFFFF',
        black: '#000000',
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
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
        full: 9999,
    },
    fontSize: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 24,
        xxl: 32,
    },
    fontWeight: {
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
    },
    shadows: {
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 4,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 8,
        },
    },
};

export default theme;
