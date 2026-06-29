'use client';

import { Suspense, useEffect, useState } from 'react';
import { Paper, Typography, Stack, Chip, Button, Box, Skeleton } from '@mui/material';
import Link from 'next/link';
import AnnouncementsFeed from '@/app/components/AnnouncementsFeed';

type HomeworkItem = {
    id: string;
    title: string;
    dueDate: string;
    submissions?: { id: string }[];
};

function LearnerTodayInner() {
    const [homework, setHomework] = useState<HomeworkItem[]>([]);

    useEffect(() => {
        fetch('/api/homework')
            .then((r) => r.json())
            .then((d) => setHomework(Array.isArray(d) ? d : []));
    }, []);

    const pending = homework.filter((h) => !h.submissions?.length);
    const dueSoon = pending.filter((h) => new Date(h.dueDate).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000);

    return (
        <Stack spacing={2} sx={{ mb: 3 }}>
            {dueSoon.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle1" fontWeight="bold">Homework due soon</Typography>
                        <Button size="small" component={Link} href="/dashboard/learner/homework">View all</Button>
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        {dueSoon.slice(0, 4).map((h) => (
                            <Chip key={h.id} label={`${h.title} · ${new Date(h.dueDate).toLocaleDateString()}`} size="small" color="warning" />
                        ))}
                    </Stack>
                </Paper>
            )}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Announcements</Typography>
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
