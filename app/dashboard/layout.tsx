'use client';
import { ReactNode, Suspense, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Box, AppBar, Toolbar, IconButton, Typography, useMediaQuery, useTheme } from '@mui/material';
import { Menu as MenuIcon, Brightness4, Brightness7 } from '@mui/icons-material';
import { useThemeContext } from '@/app/theme/ThemeContext';
import Sidebar from '@/app/components/Sidebar';
import { getPageTitle } from '@/lib/page-titles';

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const { mode, toggleTheme, logoUrl } = useThemeContext();
    const pathname = usePathname();
    const pageTitle = getPageTitle(pathname);

    useEffect(() => {
        setMobileOpen(false);
        if (typeof document !== 'undefined') {
            document.body.classList.remove('MuiModal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            document.documentElement.style.overflow = '';
        }
    }, [pathname]);

    const isDark = mode === 'dark';

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            <AppBar
                position="fixed"
                sx={{
                    display: { md: 'none' },
                    bgcolor: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(12px)',
                    color: 'text.primary',
                    boxShadow: 'none',
                    borderBottom: 1,
                    borderColor: 'divider',
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        sx={{ mr: 1 }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.2}>
                            EduLink
                        </Typography>
                        <Typography variant="subtitle1" noWrap fontWeight="bold">
                            {pageTitle}
                        </Typography>
                    </Box>
                    <IconButton onClick={() => toggleTheme()} color="inherit" size="small">
                        {isDark ? <Brightness7 sx={{ color: 'warning.main' }} /> : <Brightness4 />}
                    </IconButton>
                </Toolbar>
            </AppBar>

            <Suspense fallback={<Box sx={{ width: 280, display: { xs: 'none', md: 'block' } }} />}>
                <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
            </Suspense>
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: { xs: 2, sm: 3 },
                    mt: { xs: 7, md: 0 },
                    width: { md: `calc(100% - 280px)` },
                    minWidth: 0,
                }}
            >
                {children}
            </Box>
        </Box>
    );
}
