'use client';
import { ReactNode, Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Box, AppBar, Toolbar, IconButton, Typography, useMediaQuery, useTheme, CircularProgress } from '@mui/material';
import { Menu as MenuIcon, Brightness4, Brightness7 } from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { useThemeContext } from '@/app/theme/ThemeContext';
import Sidebar from '@/app/components/Sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const { mode, toggleTheme } = useThemeContext();
    const pathname = usePathname();
    const router = useRouter();
    // Gate dashboard content on a confirmed session so child pages only mount
    // (and fire their data fetches) once the auth cookie is established. This
    // avoids the post-login flash where requests 401 and pages render empty.
    const { status } = useSession();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.replace('/auth/signin');
        }
    }, [status, router]);

    useEffect(() => {
        setMobileOpen(false);

        // Defensive: ensure any previous modal/drawer scroll-lock is cleared on navigation
        if (typeof document !== 'undefined') {
            document.body.classList.remove('MuiModal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            document.documentElement.style.overflow = '';
        }
    }, [pathname]);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const isDark = mode === 'dark';

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Mobile AppBar */}
            <AppBar
                position="fixed"
                sx={{
                    display: { md: 'none' },
                    bgcolor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(8px)',
                    color: 'text.primary',
                    boxShadow: 'none',
                    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'}`
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap fontWeight="bold" sx={{ color: 'primary.main', flexGrow: 1 }}>
                        EduLink
                    </Typography>
                    <IconButton onClick={() => toggleTheme()} color="inherit">
                        {isDark ? <Brightness7 sx={{ color: 'warning.main' }} /> : <Brightness4 />}
                    </IconButton>
                </Toolbar>
            </AppBar>

            <Suspense fallback={
                <Box sx={{ width: 280, display: { xs: 'none', md: 'block' } }} />
            }>
                <Sidebar mobileOpen={mobileOpen} onClose={handleDrawerToggle} />
            </Suspense>
                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        p: 3,
                        mt: { xs: 8, md: 0 }, // Offset for AppBar on mobile
                        width: { md: `calc(100% - 280px)` },
                    }}
                >
                    {status === 'authenticated' ? (
                        children
                    ) : (
                        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                            <CircularProgress />
                        </Box>
                    )}
                </Box>
        </Box>
    );
}
