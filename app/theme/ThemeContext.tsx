'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { useSession } from 'next-auth/react';
import { getTheme } from './theme';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
    mode: ThemeMode;
    toggleTheme: () => void;
    primaryColor: string;
    setPrimaryColor: (color: string) => void;
    logoUrl: string;
    setLogoUrl: (url: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeContext = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useThemeContext must be used within a ThemeContextProvider');
    }
    return context;
};

export const ThemeContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mode, setMode] = useState<ThemeMode>('light');
    const [primaryColor, setPrimaryColor] = useState('#4338ca');
    const [logoUrl, setLogoUrl] = useState('');
    const { data: session } = useSession();

    // Load preferences from localStorage on mount
    useEffect(() => {
        const savedMode = localStorage.getItem('themeMode') as ThemeMode;
        if (savedMode) setMode(savedMode);

        const savedColor = localStorage.getItem('primaryColor');
        if (savedColor) setPrimaryColor(savedColor);
    }, []);

    // Fetch school-specific branding when session is available
    useEffect(() => {
        if (session?.user?.schoolId) {
            fetch('/api/school/branding')
                .then(res => res.json())
                .then(data => {
                    if (data.primaryColor) {
                        setPrimaryColor(data.primaryColor);
                        localStorage.setItem('primaryColor', data.primaryColor);
                    }
                    if (data.logoUrl) {
                        setLogoUrl(data.logoUrl);
                    }
                })
                .catch(() => { });
        }
    }, [session?.user?.schoolId]);

    const toggleTheme = () => {
        const newMode = mode === 'light' ? 'dark' : 'light';
        setMode(newMode);
        localStorage.setItem('themeMode', newMode);
    };

    const handleSetPrimaryColor = (color: string) => {
        setPrimaryColor(color);
        localStorage.setItem('primaryColor', color);
    };

    const theme = useMemo(() => getTheme(mode, primaryColor), [mode, primaryColor]);

    const value = useMemo(() => ({
        mode,
        toggleTheme,
        primaryColor,
        setPrimaryColor: handleSetPrimaryColor,
        logoUrl,
        setLogoUrl
    }), [mode, primaryColor, logoUrl]);

    return (
        <ThemeContext.Provider value={value}>
            <ThemeProvider theme={theme}>
                {children}
            </ThemeProvider>
        </ThemeContext.Provider>
    );
};
