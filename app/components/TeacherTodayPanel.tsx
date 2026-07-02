'use client';

import { useEffect, useState } from 'react';
import { Typography, Box, Stack, Chip, Button } from '@mui/material';
import { Assignment, EventAvailable, Schedule } from '@mui/icons-material';
import Link from 'next/link';
import ContentPanel from '@/app/components/ui/ContentPanel';
import LoadingSkeleton from '@/app/components/ui/LoadingSkeleton';

type HomeworkItem = {
    id: string;
    title: string;
    dueDate: string;
    _count?: { submissions: number };
};

type ClassItem = { id: string; name: string };

export default function TeacherTodayPanel() {
    const [dueSoon, setDueSoon] = useState<HomeworkItem[]>([]);
    const [needsGrading, setNeedsGrading] = useState<HomeworkItem[]>([]);
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('/api/homework').then((r) => r.json()),
            fetch('/api/classes').then((r) => r.json()),
        ])
            .then(([hw, cls]) => {
                const homework: HomeworkItem[] = Array.isArray(hw) ? hw : [];
                const now = Date.now();
                const weekMs = 7 * 24 * 60 * 60 * 1000;
                setDueSoon(homework.filter((h) => {
                    const due = new Date(h.dueDate).getTime();
                    return due >= now && due <= now + weekMs;
                }));
                setNeedsGrading(homework.filter((h) => (h._count?.submissions ?? 0) > 0));
                setClasses(Array.isArray(cls) ? cls : []);
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <LoadingSkeleton variant="list" count={1} />;
    }

    return (
        <ContentPanel
            title="Today's focus"
            subtitle="Quick actions for your classes and homework"
            sx={{
                mb: 3,
                bgcolor: 'action.hover',
                borderColor: 'primary.light',
            }}
        >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} flexWrap="wrap">
                {classes.length > 0 && (
                    <Box flex={1} minWidth={200}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">
                            TAKE ATTENDANCE
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                            {classes.slice(0, 4).map((c) => (
                                <Button
                                    key={c.id}
                                    size="medium"
                                    variant="contained"
                                    component={Link}
                                    href={`/dashboard/teacher/class/${c.id}/attendance`}
                                    startIcon={<EventAvailable />}
                                    sx={{ minHeight: 44 }}
                                >
                                    {c.name}
                                </Button>
                            ))}
                        </Stack>
                    </Box>
                )}
                {dueSoon.length > 0 && (
                    <Box flex={1} minWidth={200}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">
                            DUE THIS WEEK
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                            {dueSoon.slice(0, 3).map((h) => (
                                <Chip
                                    key={h.id}
                                    size="small"
                                    color="warning"
                                    label={`${h.title} · ${new Date(h.dueDate).toLocaleDateString()}`}
                                />
                            ))}
                        </Stack>
                    </Box>
                )}
                {needsGrading.length > 0 && (
                    <Box flex={1} minWidth={200}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">
                            REVIEW SUBMISSIONS
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                            <Button
                                size="medium"
                                variant="outlined"
                                component={Link}
                                href="/dashboard/teacher/homework"
                                startIcon={<Assignment />}
                                sx={{ minHeight: 44 }}
                            >
                                {needsGrading.length} to grade
                            </Button>
                        </Box>
                    </Box>
                )}
                {classes.length === 0 && dueSoon.length === 0 && needsGrading.length === 0 && (
                    <Box display="flex" alignItems="center" gap={1} color="text.secondary">
                        <Schedule fontSize="small" />
                        <Typography variant="body2">No urgent tasks today — you&apos;re all caught up.</Typography>
                    </Box>
                )}
            </Stack>
        </ContentPanel>
    );
}
