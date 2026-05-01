import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../utils/theme';

type ThemeType = 'light' | 'dark';

interface ThemeContextType {
  theme: typeof lightTheme;
  themeType: ThemeType;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeType, setThemeType] = useState<ThemeType>('light');

  useEffect(() => {
    // Load saved theme preference
    AsyncStorage.getItem('@safora_theme_preference').then(savedTheme => {
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeType(savedTheme);
      } else if (systemColorScheme) {
        setThemeType(systemColorScheme as ThemeType);
      }
    });
  }, []);

  const toggleTheme = () => {
    const newTheme = themeType === 'light' ? 'dark' : 'light';
    setThemeType(newTheme);
    AsyncStorage.setItem('@safora_theme_preference', newTheme);
  };

  const theme = themeType === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      themeType, 
      toggleTheme, 
      isDark: themeType === 'dark' 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
};
