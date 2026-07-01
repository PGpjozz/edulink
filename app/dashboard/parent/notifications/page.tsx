'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    IconButton,
    Chip,
    Button,
    Stack,
    Tooltip,
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    Circle,
    CheckCircle,
    AccessTime,
    ErrorOutline,
    EmojiEvents,
    AttachMoney,
    Settings,
} from '@mui/icons-material';
import PageHeader from '@/app/components/ui/PageHeader';
import PageTransition from '@/app/components/ui/PageTransition';
import ContentPanel from '@/app/components/ui/ContentPanel';
import LoadingSkeleton from '@/app/components/ui/LoadingSkeleton';
import EmptyState from '@/app/components/ui/EmptyState';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'ATTENDANCE' | 'BEHAVIOR' | 'BILLING' | 'ACADEMIC' | 'SYSTEM';
    isRead: boolean;
    createdAt: string;
    link: string | null;
}

export default function ParentNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('ALL');

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications');
            const data = await res.json();
            setNotifications(data);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const markAsRead = async (id: string) => {
        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isRead: true })
            });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (err) {
            console.error(err);
        }
    };

    const markAllAsRead = async () => {
        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markAllRead: true })
            });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (err) {
            console.error(err);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'ATTENDANCE': return <ErrorOutline color="error" />;
            case 'BEHAVIOR': return <EmojiEvents color="warning" />;
            case 'BILLING': return <AttachMoney color="success" />;
            case 'ACADEMIC': return <EmojiEvents color="primary" />;
            default: return <Settings color="action" />;
        }
    };

    const filteredNotifications = filter === 'ALL'
        ? notifications
        : notifications.filter(n => n.type === filter);

    if (loading) {
        return (
            <Container maxWidth="md" sx={{ mt: 4 }}>
                <LoadingSkeleton variant="list" count={5} />
            </Container>
        );
    }

    return (
        <PageTransition>
        <Container maxWidth="md" sx={{ mb: 4 }}>
            <PageHeader
                title="Alerts & notifications"
                subtitle="Stay updated with your children's school life."
                actions={
                    notifications.some(n => !n.isRead) ? (
                        <Button size="small" variant="outlined" onClick={markAllAsRead}>
                            Mark all as read
                        </Button>
                    ) : undefined
                }
            />

            <Stack direction="row" spacing={1} mb={3} sx={{ overflowX: 'auto', pb: 1 }}>
                {['ALL', 'ATTENDANCE', 'BEHAVIOR', 'BILLING', 'ACADEMIC'].map((f) => (
                    <Chip
                        key={f}
                        label={f.charAt(0) + f.slice(1).toLowerCase()}
                        onClick={() => setFilter(f)}
                        color={filter === f ? 'primary' : 'default'}
                        variant={filter === f ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 'bold' }}
                    />
                ))}
            </Stack>

            <ContentPanel noPadding>
                <List disablePadding>
                    {filteredNotifications.map((n, index) => (
                        <ListItem
                            key={n.id}
                            divider={index !== filteredNotifications.length - 1}
                            sx={{
                                bgcolor: n.isRead ? 'transparent' : 'action.hover',
                                '&:hover': { bgcolor: 'action.selected' },
                            }}
                                    secondaryAction={
                                        <Box>
                                            {!n.isRead && (
                                                <Tooltip title="Mark as Read">
                                                    <IconButton onClick={() => markAsRead(n.id)}>
                                                        <CheckCircle color="primary" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    }
                                >
                                    <ListItemIcon>
                                        <Box sx={{ position: 'relative', bgcolor: 'background.paper', p: 1, borderRadius: 2, boxShadow: 1 }}>
                                            {getTypeIcon(n.type)}
                                            {!n.isRead && (
                                                <Circle
                                                    sx={{
                                                        position: 'absolute',
                                                        top: -2,
                                                        right: -2,
                                                        fontSize: 12,
                                                        color: 'error.main',
                                                        border: '2px solid white',
                                                        borderRadius: '50%'
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </ListItemIcon>
                                    <ListItemText
                                        sx={{ ml: 1 }}
                                        primary={
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Typography fontWeight={n.isRead ? 'medium' : 'bold'}>
                                                    {n.title}
                                                </Typography>
                                                <Chip label={n.type} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 16 }} />
                                            </Stack>
                                        }
                                        secondary={
                                            <Box>
                                                <Typography variant="body2" color="text.primary" sx={{ my: 0.5 }}>
                                                    {n.message}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <AccessTime sx={{ fontSize: 12 }} />
                                                    {new Date(n.createdAt).toLocaleString()}
                                                </Typography>
                                            </Box>
                                        }
                                    />
                        </ListItem>
                    ))}

                    {filteredNotifications.length === 0 && (
                        <Box p={3}>
                            <EmptyState
                                icon={<NotificationsIcon sx={{ fontSize: 56 }} />}
                                title="All caught up!"
                                description={`No ${filter !== 'ALL' ? filter.toLowerCase() : ''} notifications at the moment.`}
                            />
                        </Box>
                    )}
                </List>
            </ContentPanel>
        </Container>
        </PageTransition>
    );
}

