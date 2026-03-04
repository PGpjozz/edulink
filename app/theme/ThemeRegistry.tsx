import * as React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';

import { ThemeContextProvider } from './ThemeContext';

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
    return (
        <AppRouterCacheProvider options={{ key: 'mui' }}>
            <ThemeContextProvider>
                <CssBaseline />
                {children}
            </ThemeContextProvider>
        </AppRouterCacheProvider>
    );
}
