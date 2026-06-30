'use client';

import { useEffect, useState } from 'react';
import { Paper, Typography, Box, Stack, Chip, Button, Skeleton } from '@mui/material';
import { Assignment, EventAvailable } from '@mui/icons-material';
import Link from 'next/link';

type HomeworkItem = {
    id: string;
    title: string;
    dueDate: string;
    _count?: { submissions: number };
};

type ClassItem = { id: string; name: string };

export default function TeacherTodayPanel() {
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [dueSoon, setDueSoon] = useState<HomeworkItem[]>([]);
    const [needsGrading, setNeedsGrading] = useState<HomeworkItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('/api/homework').then((r) => (r.ok ? r.json() : [])),
            fetch('/api/classes').then((r) => (r.ok ? r.json() : [])),
        ]).then(([hw, cls]) => {
            const homework: HomeworkItem[] = Array.isArray(hw) ? hw : [];
            setClasses(Array.isArray(cls) ? cls : []);

            // Derive time-based values here (in an effect) to keep render pure.
            const now = Date.now();
            const weekMs = 7 * 24 * 60 * 60 * 1000;
            setDueSoon(
                homework.filter((h) => {
                    const due = new Date(h.dueDate).getTime();
                    return due >= now && due <= now + weekMs;
                })
            );
            setNeedsGrading(homework.filter((h) => (h._count?.submissions ?? 0) > 0));
        }).catch(() => {
            setClasses([]);
            setDueSoon([]);
            setNeedsGrading([]);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <Skeleton variant="rounded" height={120} sx={{ mb: 3 }} />;
    }

    if (dueSoon.length === 0 && needsGrading.length === 0 && classes.length === 0) {
        return null;
    }

    return (
        <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Today</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
                {classes.length > 0 && (
                    <Box>
                        <Typography variant="caption" color="text.secondary">Attendance</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                            {classes.slice(0, 3).map((c) => (
                                <Button
                                    key={c.id}
                                    size="small"
                                    variant="outlined"
                                    component={Link}
                                    href={`/dashboard/teacher/class/${c.id}/attendance`}
                                    startIcon={<EventAvailable />}
                                >
                                    {c.name}
                                </Button>
                            ))}
                        </Stack>
                    </Box>
                )}
                {dueSoon.length > 0 && (
                    <Box>
                        <Typography variant="caption" color="text.secondary">Due this week</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                            {dueSoon.slice(0, 3).map((h) => (
                                <Chip key={h.id} size="small" label={`${h.title} · ${new Date(h.dueDate).toLocaleDateString()}`} />
                            ))}
                        </Stack>
                    </Box>
                )}
                {needsGrading.length > 0 && (
                    <Box>
                        <Typography variant="caption" color="text.secondary">Submissions to review</Typography>
                        <Box sx={{ mt: 0.5 }}>
                            <Button size="small" variant="contained" component={Link} href="/dashboard/teacher/homework" startIcon={<Assignment />}>
                                {needsGrading.length} homework item{needsGrading.length > 1 ? 's' : ''}
                            </Button>
                        </Box>
                    </Box>
                )}
            </Stack>
        </Paper>
    );
}
