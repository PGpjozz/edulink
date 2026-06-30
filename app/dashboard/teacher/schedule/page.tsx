'use client';

import { useEffect, useState } from 'react';
import {
    Container,
    Typography,
    Box,
    Paper,
    Stack,
    Chip,
    Skeleton,
    Alert,
} from '@mui/material';
import { Schedule, Class as ClassIcon } from '@mui/icons-material';
import TeacherScheduleView from '@/app/components/TeacherScheduleView';

type ScheduleSlot = {
    day: string;
    period: number;
    time: string;
    classId: string;
    className: string;
    grade: string;
    subjectId: string;
    subjectName: string;
};

export default function TeacherSchedulePage() {
    const [slots, setSlots] = useState<ScheduleSlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todaySlots = slots.filter((slot) => slot.day === today);

    useEffect(() => {
        fetch('/api/teacher/schedule')
            .then((r) => {
                if (!r.ok) throw new Error('Failed to load schedule');
                return r.json();
            })
            .then((data) => setSlots(Array.isArray(data.slots) ? data.slots : []))
            .catch(() => setError('Could not load your teaching schedule'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box mb={4}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    My Teaching Schedule
                </Typography>
                <Typography color="text.secondary">
                    See which classes you teach and when they are scheduled each week.
                </Typography>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Skeleton variant="rounded" height={400} />
            ) : (
                <>
                    <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                            <Schedule color="primary" />
                            <Typography variant="h6" fontWeight="bold">
                                Today — {today}
                            </Typography>
                        </Stack>
                        {todaySlots.length === 0 ? (
                            <Typography color="text.secondary">
                                No classes scheduled for you today.
                            </Typography>
                        ) : (
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap">
                                {todaySlots.map((slot) => (
                                    <Paper
                                        key={`${slot.classId}-${slot.period}`}
                                        variant="outlined"
                                        sx={{ p: 1.5, minWidth: 180, bgcolor: 'primary.50', borderColor: 'primary.main' }}
                                    >
                                        <Typography variant="caption" color="text.secondary">
                                            Period {slot.period} · {slot.time}
                                        </Typography>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            {slot.className}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {slot.subjectName}
                                        </Typography>
                                        <Chip
                                            size="small"
                                            icon={<ClassIcon sx={{ fontSize: 14 }} />}
                                            label={`Grade ${slot.grade}`}
                                            sx={{ mt: 0.5 }}
                                        />
                                    </Paper>
                                ))}
                            </Stack>
                        )}
                    </Paper>

                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Weekly Overview
                    </Typography>
                    <TeacherScheduleView slots={slots} highlightDay={today} />
                </>
            )}
        </Container>
    );
}
