'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    IconButton, Badge, Menu, MenuItem, Typography, Box, Button, Divider, ListItemText, CircularProgress,
} from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';

type Notification = {
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    link?: string | null;
};

const NOTIFY_ROLES = ['PARENT', 'TEACHER', 'HOD', 'PRINCIPAL', 'SCHOOL_ADMIN', 'SCHOOL_OWNER', 'LEARNER'];

export default function NotificationDropdown() {
    const { data: session } = useSession();
    const [anchor, setAnchor] = useState<null | HTMLElement>(null);
    const [items, setItems] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);

    const role = session?.user?.role;
    const show = role && NOTIFY_ROLES.includes(role);

    const unread = items.filter((n) => !n.isRead).length;

    const load = useCallback(() => {
        setLoading(true);
        fetch('/api/notifications')
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => setItems(Array.isArray(data) ? data : []))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!show) return;
        load();
        const id = setInterval(load, 30_000);
        return () => clearInterval(id);
    }, [show, load]);

    const markAllRead = async () => {
        await fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markAllRead: true }),
        });
        load();
    };

    const markRead = async (id: string) => {
        await fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, isRead: true }),
        });
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    };

    if (!show) return null;

    const alertsHref =
        role === 'PARENT'
            ? '/dashboard/parent/notifications'
            : '/dashboard/announcements';

    return (
        <>
            <IconButton color="inherit" onClick={(e) => { setAnchor(e.currentTarget); load(); }} aria-label="Notifications">
                <Badge badgeContent={unread} color="error" max={99}>
                    <NotificationsIcon />
                </Badge>
            </IconButton>
            <Menu
                anchorEl={anchor}
                open={Boolean(anchor)}
                onClose={() => setAnchor(null)}
                PaperProps={{ sx: { width: 360, maxHeight: 420, borderRadius: 3 } }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <Box px={2} py={1.5} display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" fontWeight="bold">Notifications</Typography>
                    {unread > 0 && (
                        <Button size="small" onClick={markAllRead}>Mark all read</Button>
                    )}
                </Box>
                <Divider />
                {loading && items.length === 0 ? (
                    <Box py={4} display="flex" justifyContent="center"><CircularProgress size={28} /></Box>
                ) : items.length === 0 ? (
                    <Box py={4} px={2} textAlign="center">
                        <Typography variant="body2" color="text.secondary">You&apos;re all caught up.</Typography>
                    </Box>
                ) : (
                    <AnimatePresence>
                        {items.slice(0, 8).map((n) => (
                            <MenuItem
                                key={n.id}
                                component={motion.div}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                onClick={() => {
                                    if (!n.isRead) markRead(n.id);
                                    setAnchor(null);
                                }}
                                sx={{ bgcolor: n.isRead ? 'transparent' : 'action.hover', alignItems: 'flex-start', py: 1.5 }}
                            >
                                <ListItemText
                                    primary={n.title}
                                    secondary={
                                        <>
                                            <Typography variant="caption" display="block" color="text.secondary">
                                                {n.message}
                                            </Typography>
                                            <Typography variant="caption" color="text.disabled">
                                                {new Date(n.createdAt).toLocaleString()}
                                            </Typography>
                                        </>
                                    }
                                    primaryTypographyProps={{ fontWeight: n.isRead ? 400 : 700, fontSize: '0.875rem' }}
                                />
                            </MenuItem>
                        ))}
                    </AnimatePresence>
                )}
                <Divider />
                <MenuItem component={Link} href={alertsHref} onClick={() => setAnchor(null)}>
                    <Typography variant="body2" color="primary" fontWeight="bold" width="100%" textAlign="center">
                        View all alerts
                    </Typography>
                </MenuItem>
            </Menu>
        </>
    );
}
