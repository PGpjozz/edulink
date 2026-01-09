'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    IconButton,
    Chip,
    Divider,
    Button,
    CircularProgress,
    Stack,
    Tooltip
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    Circle,
    CheckCircle,
    Delete,
    AccessTime,
    ErrorOutline,
    EmojiEvents,
    AttachMoney,
    Settings
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

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

    if (loading) return <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>;

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }} component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <NotificationsIcon color="primary" fontSize="large" />
                        Alerts & Notifications
                    </Typography>
                    <Typography color="text.secondary">Stay updated with your children's school life.</Typography>
                </Box>
                {notifications.some(n => !n.isRead) && (
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => notifications.filter(n => !n.isRead).forEach(n => markAsRead(n.id))}
                    >
                        Mark all as read
                    </Button>
                )}
            </Box>

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

            <Card sx={{ borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.05)' }}>
                <CardContent sx={{ p: 0 }}>
                    <List disablePadding>
                        <AnimatePresence mode="popLayout" initial={false}>
                            {filteredNotifications.map((n, index) => (
                                <ListItem
                                    key={n.id}
                                    divider={index !== filteredNotifications.length - 1}
                                    component={motion.div}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    sx={{
                                        bgcolor: n.isRead ? 'transparent' : 'rgba(37, 99, 235, 0.04)',
                                        transition: '0.3s',
                                        '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.02)' }
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
                        </AnimatePresence>

                        {filteredNotifications.length === 0 && (
                            <Box py={12} textAlign="center">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <NotificationsIcon sx={{ fontSize: 80, color: 'grey.200', mb: 2 }} />
                                    <Typography variant="h6" color="text.secondary" fontWeight="bold">All caught up!</Typography>
                                    <Typography color="text.secondary">No {filter !== 'ALL' ? filter.toLowerCase() : ''} notifications at the moment.</Typography>
                                </motion.div>
                            </Box>
                        )}
                    </List>
                </CardContent>
            </Card>
        </Container>
    );
}

