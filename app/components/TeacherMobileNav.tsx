'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Paper, BottomNavigation, BottomNavigationAction } from '@mui/material';
import { Dashboard, Assignment, MenuBook, Message } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import { useSession } from 'next-auth/react';

const TEACHER_NAV = [
    { label: 'Home', icon: <Dashboard />, path: '/dashboard/teacher' },
    { label: 'Homework', icon: <Assignment />, path: '/dashboard/teacher/homework' },
    { label: 'Gradebook', icon: <MenuBook />, path: '/dashboard/teacher/gradebook' },
    { label: 'Messages', icon: <Message />, path: '/dashboard/messages' },
];

const HOD_TEACHER_NAV = [
    { label: 'Class', icon: <Dashboard />, path: '/dashboard/teacher' },
    { label: 'Homework', icon: <Assignment />, path: '/dashboard/teacher/homework' },
    { label: 'Dept', icon: <MenuBook />, path: '/dashboard/hod' },
    { label: 'Messages', icon: <Message />, path: '/dashboard/messages' },
];

export default function TeacherMobileNav() {
    const pathname = usePathname();
    const router = useRouter();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { data: session } = useSession();

    const role = session?.user?.activeRole ?? session?.user?.role;
    const hasTeacher = session?.user?.hasTeacherProfile;
    const showNav =
        isMobile &&
        hasTeacher &&
        (role === 'TEACHER' || role === 'HOD' || role === 'PRINCIPAL' || role === 'SCHOOL_ADMIN');

    if (!showNav) return null;

    const items = role === 'HOD' ? HOD_TEACHER_NAV : TEACHER_NAV;

    const value =
        items.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))?.path ?? false;

    return (
        <Paper
            elevation={8}
            sx={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: theme.zIndex.appBar,
                display: { md: 'none' },
                borderTop: 1,
                borderColor: 'divider',
                pb: 'env(safe-area-inset-bottom, 0px)',
            }}
        >
            <BottomNavigation value={value} onChange={(_, p) => router.push(p)} showLabels sx={{ bgcolor: 'background.paper' }}>
                {items.map((item) => (
                    <BottomNavigationAction key={item.path} label={item.label} value={item.path} icon={item.icon} sx={{ minWidth: 0, py: 1.25 }} />
                ))}
            </BottomNavigation>
        </Paper>
    );
}
