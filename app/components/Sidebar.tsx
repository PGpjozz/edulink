'use client';

import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    Avatar,
    Divider,
    useTheme,
    useMediaQuery,
    Badge
} from '@mui/material';
import {
    Dashboard,
    School,
    Person,
    Class,
    Book,
    Assignment,
    Grade,
    Logout,
    Message,
    Payments,
    Event,
    Inventory,
    AppRegistration,
    Notifications,
    ReceiptLong,
    Brightness4,
    Brightness7,
    QuestionAnswer,
    Settings,
    AutoAwesome,
    BarChart as BarChartIcon,
    History as HistoryIcon,
    MenuBook as MenuBookIcon,
    Dashboard as DashboardIcon,
    EmojiEvents as EmojiEventsIcon
} from '@mui/icons-material';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useThemeContext } from '@/app/theme/ThemeContext';
import { useEffect, useState } from 'react';

const DRAWER_WIDTH = 280;

const TEACHING_NAV = [
    { label: 'My Subjects', icon: <Book />, path: '/dashboard/teacher' },
    { label: 'Homework', icon: <Assignment />, path: '/dashboard/teacher/homework' },
    { label: 'Gradebook', icon: <MenuBookIcon />, path: '/dashboard/teacher/gradebook' },
    { label: 'Behavior', icon: <EmojiEventsIcon />, path: '/dashboard/teacher/behavior' },
    { label: 'Quizzes', icon: <QuestionAnswer />, path: '/dashboard/teacher/quizzes' },
    { label: 'Meetings', icon: <Event />, path: '/dashboard/teacher/meetings' },
    { label: 'AI Assistant', icon: <AutoAwesome />, path: '/dashboard/teacher/ai-assistant' },
];

const ADMIN_NAV = [
    { label: 'Overview', icon: <Dashboard />, path: '/dashboard/principal' },
    { label: 'Data Hub', icon: <BarChartIcon />, path: '/dashboard/principal/analytics' },
    { label: 'Classes', icon: <Class />, path: '/dashboard/principal?tab=classes' },
    { label: 'Users', icon: <Person />, path: '/dashboard/principal?tab=users' },
    { label: 'Subjects', icon: <Book />, path: '/dashboard/principal?tab=subjects' },
    { label: 'Departments', icon: <School />, path: '/dashboard/principal?tab=departments' },
    { label: 'Admissions', icon: <AppRegistration />, path: '/dashboard/principal/admissions' },
    { label: 'Term Reports', icon: <Assignment />, path: '/dashboard/principal/reports' },
    { label: 'Library & Assets', icon: <Inventory />, path: '/dashboard/principal/assets' },
    { label: 'Finance', icon: <Payments />, path: '/dashboard/principal/finance' },
    { label: 'Subscription', icon: <ReceiptLong />, path: '/dashboard/principal/subscription' },
    { label: 'Audit Logs', icon: <HistoryIcon />, path: '/dashboard/principal/audit-logs' },
    { label: 'Settings', icon: <Settings />, path: '/dashboard/principal/settings' },
];

const HOD_NAV = [
    { label: 'Department', icon: <Dashboard />, path: '/dashboard/hod' },
    { label: 'Department Analytics', icon: <BarChartIcon />, path: '/dashboard/hod/analytics' },
    { label: 'Behavior', icon: <EmojiEventsIcon />, path: '/dashboard/teacher/behavior' },
    { label: 'Messages', icon: <Message />, path: '/dashboard/messages' },
];

const OWNER_NAV = [
    { label: 'Overview', icon: <Dashboard />, path: '/dashboard/school-owner' },
    { label: 'Invites', icon: <Person />, path: '/dashboard/school-owner/invites' },
    { label: 'Permissions', icon: <Settings />, path: '/dashboard/school-owner/permissions' },
    { label: 'School operations', icon: <School />, path: '/dashboard/principal' },
    { label: 'Subscription', icon: <ReceiptLong />, path: '/dashboard/principal/subscription' },
    { label: 'Announcements', icon: <Notifications />, path: '/dashboard/announcements' },
    { label: 'Homework', icon: <Assignment />, path: '/dashboard/teacher/homework' },
];

const NAV_ITEMS: Record<string, { label: string; icon: React.ReactNode; path: string }[]> = {
    PROVIDER: [
        { label: 'Dashboard', icon: <Dashboard />, path: '/dashboard/provider' }
    ],
    SCHOOL_OWNER: OWNER_NAV,
    PRINCIPAL: [
        ...ADMIN_NAV,
        { label: 'Announcements', icon: <Notifications />, path: '/dashboard/announcements' },
        { label: 'Homework', icon: <Assignment />, path: '/dashboard/teacher/homework' },
    ],
    SCHOOL_ADMIN: [
        ...ADMIN_NAV,
        { label: 'Announcements', icon: <Notifications />, path: '/dashboard/announcements' },
        { label: 'Homework', icon: <Assignment />, path: '/dashboard/teacher/homework' },
    ],
    HOD: [
        ...HOD_NAV,
        { label: 'Announcements', icon: <Notifications />, path: '/dashboard/announcements' },
        { label: 'Homework', icon: <Assignment />, path: '/dashboard/teacher/homework' },
    ],
    TEACHER: [
        ...TEACHING_NAV,
        { label: 'Announcements', icon: <Notifications />, path: '/dashboard/announcements' },
        { label: 'Messages', icon: <Message />, path: '/dashboard/messages' },
    ],
    LEARNER: [
        { label: 'My Progress', icon: <Grade />, path: '/dashboard/learner' },
        { label: 'Homework', icon: <Assignment />, path: '/dashboard/learner/homework' },
        { label: 'Announcements', icon: <Notifications />, path: '/dashboard/announcements' },
        { label: 'Digital Library', icon: <Book />, path: '/dashboard/learner/library' },
        { label: 'Quizzes', icon: <QuestionAnswer />, path: '/dashboard/learner/quizzes' },
        { label: 'Academic Report', icon: <Assignment />, path: '/dashboard/learner/report' },
        { label: 'Messages', icon: <Message />, path: '/dashboard/messages' }
    ],
    PARENT: [
        { label: 'Children', icon: <Person />, path: '/dashboard/parent' },
        { label: 'Homework', icon: <Assignment />, path: '/dashboard/parent/homework' },
        { label: 'Announcements', icon: <Notifications />, path: '/dashboard/announcements' },
        { label: 'Meetings', icon: <Event />, path: '/dashboard/parent/meetings' },
        { label: 'Billing', icon: <Payments />, path: '/dashboard/parent/billing' },
        { label: 'Alerts', icon: <Notifications />, path: '/dashboard/parent/notifications' },
        { label: 'Messages', icon: <Message />, path: '/dashboard/messages' }
    ]
};

function getNavItems(role: string, hasTeacherProfile: boolean) {
    const base = NAV_ITEMS[role] || [];
    const shared = [{ label: 'Messages', icon: <Message />, path: '/dashboard/messages' }];

    if ((role === 'PRINCIPAL' || role === 'SCHOOL_ADMIN' || role === 'SCHOOL_OWNER') && hasTeacherProfile) {
        return [
            ...base,
            { label: '— Teaching —', icon: <Book />, path: '/dashboard/teacher' },
            ...TEACHING_NAV.filter((i) => i.path !== '/dashboard/teacher'),
            ...shared.filter((s) => !base.some((b) => b.path === s.path)),
        ];
    }

    if (role === 'HOD' && hasTeacherProfile) {
        return [
            ...base,
            { label: '— My classes —', icon: <Book />, path: '/dashboard/teacher' },
            ...TEACHING_NAV.filter((i) => i.path !== '/dashboard/teacher'),
        ];
    }

    return base;
}

interface SidebarProps {
    mobileOpen?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
    const theme = useTheme();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentTab = searchParams.get('tab');
    const router = useRouter();
    const { data: session } = useSession();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { mode, toggleTheme, logoUrl } = useThemeContext();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (session?.user?.role === 'PARENT') {
            fetch('/api/notifications')
                .then(res => res.json())
                .then(data => {
                    const unread = data.filter((n: any) => !n.isRead).length;
                    setUnreadCount(unread);
                })
                .catch(err => console.error('Failed to fetch unread count', err));
        }
    }, [session]);

    if (!session) return null;

    const role = session.user.role;
    const items = getNavItems(role, Boolean(session.user.hasTeacherProfile));

    const drawerContent = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box p={3} display="flex" alignItems="center" gap={2}>
                {logoUrl ? (
                    <Box component="img" src={logoUrl} alt="School Logo" sx={{ width: 40, height: 40, borderRadius: 1 }} />
                ) : (
                    <Avatar sx={{ bgcolor: theme.palette.primary.main }}>EL</Avatar>
                )}
                <Typography variant="h6" fontWeight="bold" sx={{ color: 'primary.main' }}>
                    EduLink
                </Typography>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Box px={2} mb={4}>
                <Box p={2} sx={{ bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderRadius: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold">{session.user.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{session.user.role}</Typography>
                </Box>
            </Box>

            <List sx={{ flexGrow: 1 }}>
                {items.map((item) => {
                    const isSection = item.label.startsWith('—');
                    if (isSection) {
                        return (
                            <ListItem key={item.label} sx={{ px: 3, py: 1 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                    {item.label.replace(/—/g, '').trim()}
                                </Typography>
                            </ListItem>
                        );
                    }
                    const tabParam = item.path.includes('?tab=')
                        ? item.path.split('?tab=')[1]?.split('&')[0]
                        : null;
                    const isPrincipalRoot = item.path === '/dashboard/principal';
                    const isActive = tabParam
                        ? pathname === '/dashboard/principal' && currentTab === tabParam
                        : isPrincipalRoot
                            ? pathname === '/dashboard/principal' && !currentTab
                            : pathname === item.path || (item.path.includes('?') && pathname === item.path.split('?')[0] && !tabParam);
                    return (
                        <ListItem key={item.path} disablePadding sx={{ mb: 1 }}>
                            <ListItemButton
                                onClick={() => {
                                    router.push(item.path);
                                    requestAnimationFrame(() => (document.activeElement as HTMLElement | null)?.blur?.());
                                    if (onClose) onClose();
                                }}
                                sx={{
                                    borderRadius: 2,
                                    mx: 2,
                                    bgcolor: isActive ? 'primary.light' : 'transparent',
                                    color: isActive ? 'primary.contrastText' : 'inherit',
                                    '&:hover': {
                                        bgcolor: isActive ? 'primary.main' : (mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)')
                                    }
                                }}
                            >
                                <ListItemIcon sx={{ color: isActive ? 'inherit' : 'gray' }}>
                                    {item.label === 'Alerts' && unreadCount > 0 ? (
                                        <Badge badgeContent={unreadCount} color="error">
                                            {item.icon}
                                        </Badge>
                                    ) : (
                                        item.icon
                                    )}
                                </ListItemIcon>
                                <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: isActive ? 'bold' : 'medium' }} />
                            </ListItemButton>
                        </ListItem>
                    )
                })}
            </List>

            <Box p={2} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <ListItemButton
                    onClick={() => toggleTheme()}
                    sx={{
                        borderRadius: 2,
                        bgcolor: 'rgba(0,0,0,0.04)',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.08)' }
                    }}
                >
                    <ListItemIcon>
                        {mode === 'dark' ? <Brightness7 sx={{ color: 'warning.main' }} /> : <Brightness4 />}
                    </ListItemIcon>
                    <ListItemText primary={mode === 'dark' ? 'Light Mode' : 'Dark Mode'} />
                </ListItemButton>

                <ListItemButton onClick={() => signOut()} sx={{ borderRadius: 2, color: 'error.main' }}>
                    <ListItemIcon sx={{ color: 'error.main' }}><Logout /></ListItemIcon>
                    <ListItemText primary="Sign Out" />
                </ListItemButton>
            </Box>
        </Box>
    );

    return (
        <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
            {/* Mobile Drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={onClose}
                ModalProps={{ keepMounted: true, disableScrollLock: true }} // Better open performance on mobile.
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': {
                        width: DRAWER_WIDTH,
                        boxSizing: 'border-box',
                        bgcolor: 'background.paper',
                        backgroundImage: 'none'
                    },
                }}
            >
                {drawerContent}
            </Drawer>

            {/* Desktop Drawer */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', md: 'block' },
                    '& .MuiDrawer-paper': {
                        width: DRAWER_WIDTH,
                        boxSizing: 'border-box',
                        bgcolor: mode === 'dark' ? '#1e293b' : 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(12px)',
                        borderRight: mode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0, 0, 0, 0.12)',
                        color: theme.palette.text.primary
                    },
                }}
                open
            >
                {drawerContent}
            </Drawer>
        </Box>
    );
}
