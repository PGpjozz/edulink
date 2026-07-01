'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Paper, BottomNavigation, BottomNavigationAction } from '@mui/material';
import { Person, Notifications, Message, Payments } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';

const NAV_ITEMS = [
    { label: 'Children', icon: <Person />, path: '/dashboard/parent' },
    { label: 'Alerts', icon: <Notifications />, path: '/dashboard/parent/notifications' },
    { label: 'Messages', icon: <Message />, path: '/dashboard/messages' },
    { label: 'Billing', icon: <Payments />, path: '/dashboard/parent/billing' },
];

export default function ParentMobileNav() {
    const pathname = usePathname();
    const router = useRouter();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    if (!isMobile) return null;

    const value = NAV_ITEMS.find((item) =>
        item.path === '/dashboard/parent'
            ? pathname === '/dashboard/parent' || pathname.startsWith('/dashboard/parent/child')
            : pathname.startsWith(item.path),
    )?.path ?? false;

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
            <BottomNavigation
                value={value}
                onChange={(_, newPath) => router.push(newPath)}
                showLabels
                sx={{ bgcolor: 'background.paper' }}
            >
                {NAV_ITEMS.map((item) => (
                    <BottomNavigationAction
                        key={item.path}
                        label={item.label}
                        value={item.path}
                        icon={item.icon}
                        sx={{ minWidth: 0, py: 1.25 }}
                    />
                ))}
            </BottomNavigation>
        </Paper>
    );
}
