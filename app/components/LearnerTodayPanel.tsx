'use client';

import { Suspense, useEffect, useState } from 'react';
import { Typography, Stack, Chip, Button, Box } from '@mui/material';
import Link from 'next/link';
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
    const [homework, setHomework] = useState<HomeworkItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/homework')
            .then((r) => r.json())
            .then((d) => setHomework(Array.isArray(d) ? d : []))
            .finally(() => setLoading(false));
    }, []);

    const pending = homework.filter((h) => !h.submissions?.length);
    const dueSoon = pending.filter((h) => new Date(h.dueDate).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000);

    if (loading) {
        return <LoadingSkeleton variant="cards" count={2} />;
    }

    return (
        <Stack spacing={2} sx={{ mb: 3 }}>
            {dueSoon.length > 0 && (
                <ContentPanel
                    title="Homework due soon"
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
            <ContentPanel title="Announcements">
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
