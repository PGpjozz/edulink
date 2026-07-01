'use client';
import { ReactNode, Suspense, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Box, AppBar, Toolbar, IconButton, Typography, useMediaQuery, useTheme } from '@mui/material';
import { Menu as MenuIcon, Brightness4, Brightness7 } from '@mui/icons-material';
import { useThemeContext } from '@/app/theme/ThemeContext';
import Sidebar from '@/app/components/Sidebar';
import DashboardPathGuard from '@/app/components/DashboardPathGuard';
import ParentMobileNav from '@/app/components/ParentMobileNav';
import ParentChildBar from '@/app/components/ParentChildBar';
import TeacherMobileNav from '@/app/components/TeacherMobileNav';
import PrivacyConsentGate from '@/app/components/PrivacyConsentGate';
import NotificationDropdown from '@/app/components/NotificationDropdown';
import { getPageTitle } from '@/lib/page-titles';

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const { mode, toggleTheme, schoolName } = useThemeContext();
    const pathname = usePathname();
    const pageTitle = getPageTitle(pathname);
    const { data: session } = useSession();
    const isParent = session?.user?.role === 'PARENT';
    const hasTeacherProfile = session?.user?.hasTeacherProfile;
    const activeRole = session?.user?.activeRole ?? session?.user?.role;
    const showParentChrome = isParent && pathname.startsWith('/dashboard/parent');
    const showTeacherMobilePad =
        hasTeacherProfile &&
        (activeRole === 'TEACHER' || activeRole === 'HOD' || activeRole === 'PRINCIPAL' || activeRole === 'SCHOOL_ADMIN');

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
                            {schoolName || 'EduLink'}
                        </Typography>
                        <Typography variant="subtitle1" noWrap fontWeight="bold">
                            {pageTitle}
                        </Typography>
                    </Box>
                    <NotificationDropdown />
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
                    mb: isParent && isMobile ? 8 : showTeacherMobilePad && isMobile ? 8 : 0,
                    width: { md: `calc(100% - 280px)` },
                    minWidth: 0,
                }}
            >
                <DashboardPathGuard />
                <PrivacyConsentGate />
                {!isMobile && (
                    <Box display="flex" justifyContent="flex-end" alignItems="center" gap={1} mb={2}>
                        <NotificationDropdown />
                        <IconButton onClick={() => toggleTheme()} size="small" aria-label="Toggle theme">
                            {isDark ? <Brightness7 sx={{ color: 'warning.main' }} /> : <Brightness4 />}
                        </IconButton>
                    </Box>
                )}
                {showParentChrome && (
                    <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 2 }}>
                        <ParentChildBar />
                    </Box>
                )}
                {children}
            </Box>
            {isParent && <ParentMobileNav />}
            {showTeacherMobilePad && <TeacherMobileNav />}
        </Box>
    );
}
