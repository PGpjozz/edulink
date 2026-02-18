'use client';

import * as React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import NextAppDirEmotionCacheProvider from './EmotionCache';

import { ThemeContextProvider } from './ThemeContext';

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
    return (
        <NextAppDirEmotionCacheProvider options={{ key: 'mui' }}>
            <ThemeContextProvider>
                {/* CssBaseline is now inside ThemeContextProvider or we can put it here */}
                {/* Actually, let's put CssBaseline inside the context provider so it reacts to theme changes */}
                <CssBaseline />
                {children}
            </ThemeContextProvider>
        </NextAppDirEmotionCacheProvider>
    );
}
