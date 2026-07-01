'use client';

import { Suspense, useEffect, useState } from 'react';
import { Typography, Stack, Chip, Button, Box, Alert } from '@mui/material';
import Link from 'next/link';
import { AssignmentLate, CheckCircle } from '@mui/icons-material';
import AnnouncementsFeed from '@/app/components/AnnouncementsFeed';
import ContentPanel from '@/app/components/ui/ContentPanel';
import LoadingSkeleton from '@/app/components/ui/LoadingSkeleton';

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
        return <LoadingSkeleton variant="cards" count={2} />;
    }

    return (
        <Stack spacing={2} sx={{ mb: 3 }}>
            {overdue.length > 0 && (
                <ContentPanel
                    title="Overdue homework"
                    actions={
                        <Button size="small" component={Link} href="/dashboard/learner/homework">
                            View all
                        </Button>
                    }
                    sx={{ borderColor: 'error.main' }}
                >
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
                </ContentPanel>
            )}

            {dueSoon.length > 0 && (
                <ContentPanel
                    title="Due this week"
                    actions={
                        <Button size="small" component={Link} href="/dashboard/learner/homework">
                            View all
                        </Button>
                    }
                >
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        {dueSoon.slice(0, 4).map((h) => (
                            <Chip
                                key={h.id}
                                label={`${h.title} · ${new Date(h.dueDate).toLocaleDateString()}`}
                                size="small"
                                color="warning"
                            />
                        ))}
                    </Stack>
                </ContentPanel>
            )}

            {allCaughtUp && (
                <Alert severity="success" icon={<CheckCircle />} sx={{ borderRadius: 2 }}>
                    You&apos;re all caught up on homework!
                </Alert>
            )}

            <ContentPanel
                title="Announcements"
                actions={
                    <Button size="small" component={Link} href="/dashboard/announcements">
                        View all
                    </Button>
                }
            >
                <AnnouncementsFeed compact />
            </ContentPanel>
        </Stack>
    );
}

export default function LearnerTodayPanel() {
    return (
        <Suspense fallback={<LoadingSkeleton variant="cards" count={2} />}>
            <LearnerTodayInner />
        </Suspense>
    );
}
