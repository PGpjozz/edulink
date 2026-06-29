'use client';

import { Suspense, useEffect, useState } from 'react';
import { Paper, Typography, Stack, Chip, Button, Box, Skeleton, Alert } from '@mui/material';
import Link from 'next/link';
import { AssignmentLate, CheckCircle } from '@mui/icons-material';
import AnnouncementsFeed from '@/app/components/AnnouncementsFeed';

type HomeworkItem = {
    id: string;
    title: string;
    dueDate: string;
    submissions?: { id: string }[];
};

function LearnerTodayInner() {
    const [overdue, setOverdue] = useState<HomeworkItem[]>([]);
    const [dueSoon, setDueSoon] = useState<HomeworkItem[]>([]);
    const [allCaughtUp, setAllCaughtUp] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/homework')
            .then((r) => r.json())
            .then((d) => {
                const items = Array.isArray(d) ? d : [];
                const now = Date.now();
                const weekMs = 7 * 24 * 60 * 60 * 1000;
                const pending = items.filter((h) => !h.submissions?.length);
                setOverdue(pending.filter((h) => new Date(h.dueDate).getTime() < now));
                setDueSoon(pending.filter((h) => {
                    const due = new Date(h.dueDate).getTime();
                    return due >= now && due - now < weekMs;
                }));
                setAllCaughtUp(pending.length === 0 && items.length > 0);
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <Stack spacing={2} sx={{ mb: 3 }}>
                <Skeleton variant="rounded" height={72} />
                <Skeleton variant="rounded" height={120} />
            </Stack>
        );
    }

    return (
        <Stack spacing={2} sx={{ mb: 3 }}>
            {overdue.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: 'error.main' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle1" fontWeight="bold" color="error.main">
                            Overdue homework
                        </Typography>
                        <Button size="small" component={Link} href="/dashboard/learner/homework">View all</Button>
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        {overdue.slice(0, 4).map((h) => (
                            <Chip
                                key={h.id}
                                icon={<AssignmentLate />}
                                label={`${h.title} · ${new Date(h.dueDate).toLocaleDateString()}`}
                                size="small"
                                color="error"
                            />
                        ))}
                    </Stack>
                </Paper>
            )}

            {dueSoon.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle1" fontWeight="bold">Due this week</Typography>
                        <Button size="small" component={Link} href="/dashboard/learner/homework">View all</Button>
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        {dueSoon.slice(0, 4).map((h) => (
                            <Chip key={h.id} label={`${h.title} · ${new Date(h.dueDate).toLocaleDateString()}`} size="small" color="warning" />
                        ))}
                    </Stack>
                </Paper>
            )}

            {allCaughtUp && (
                <Alert severity="success" icon={<CheckCircle />} sx={{ borderRadius: 2 }}>
                    You&apos;re all caught up on homework!
                </Alert>
            )}

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle1" fontWeight="bold">Announcements</Typography>
                    <Button size="small" component={Link} href="/dashboard/announcements">View all</Button>
                </Box>
                <AnnouncementsFeed compact />
            </Paper>
        </Stack>
    );
}

export default function LearnerTodayPanel() {
    return (
        <Suspense fallback={<Skeleton variant="rounded" height={80} sx={{ mb: 2 }} />}>
            <LearnerTodayInner />
        </Suspense>
    );
}
