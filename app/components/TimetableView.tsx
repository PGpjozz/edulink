'use client';

import { Box, Paper, Typography, Grid, Chip } from '@mui/material';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = [
    { num: 1, time: '08:00 - 09:00' },
    { num: 2, time: '09:00 - 10:00' },
    { num: 3, time: '10:00 - 11:00' },
    { num: 4, time: '11:30 - 12:30' },
    { num: 5, time: '12:30 - 13:30' }
];

interface TimetableSlot {
    period: number;
    subjectName: string;
    time?: string;
}

interface TimetableViewProps {
    timetable: unknown;
}

function normalizeSlot(raw: Record<string, unknown>): TimetableSlot | null {
    const period = (raw.period ?? raw.p) as number | undefined;
    const subjectName = (raw.subjectName ?? raw.subject) as string | undefined;
    if (!period || !subjectName) return null;
    return {
        period,
        subjectName,
        time: raw.time as string | undefined,
    };
}

function normalizeTimetable(timetable: Record<string, unknown> | unknown[]): Record<string, TimetableSlot[]> {
    if (Array.isArray(timetable)) {
        return {};
    }
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const normalized: Record<string, TimetableSlot[]> = {};

    for (const day of days) {
        const slots = timetable[day];
        if (!Array.isArray(slots)) continue;
        normalized[day] = slots
            .map((slot) => normalizeSlot(slot as Record<string, unknown>))
            .filter((slot): slot is TimetableSlot => slot !== null);
    }

    return normalized;
}

export default function TimetableView({ timetable }: TimetableViewProps) {
    const normalized = timetable && typeof timetable === 'object' && !Array.isArray(timetable)
        ? normalizeTimetable(timetable as Record<string, unknown>)
        : null;

    if (!normalized || Object.keys(normalized).length === 0) {
        return (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                <Typography color="text.secondary">No timetable scheduled yet.</Typography>
            </Paper>
        );
    }

    return (
        <Paper sx={{ overflowX: 'auto', p: 3, borderRadius: 2 }}>
            <Box sx={{ minWidth: 800 }}>
                {/* Header */}
                <Box display="flex" borderBottom={1} borderColor="divider" pb={2} mb={2}>
                    <Box width={100} fontWeight="bold" color="text.secondary">Time</Box>
                    {DAYS.map(day => (
                        <Box key={day} flex={1} textAlign="center" fontWeight="bold">
                            {day}
                        </Box>
                    ))}
                </Box>

                {/* Rows */}
                {PERIODS.map((period) => (
                    <Box key={period.num} display="flex" mb={1} alignItems="stretch">
                        <Box width={100} display="flex" flexDirection="column" justifyContent="center">
                            <Typography variant="caption" fontWeight="bold">Period {period.num}</Typography>
                            <Typography variant="caption" color="text.secondary">{period.time}</Typography>
                        </Box>
                        {DAYS.map(day => {
                            const slot = normalized[day]?.find((s) => s.period === period.num);
                            return (
                                <Box key={day} flex={1} px={0.5}>
                                    <Paper
                                        variant="outlined"
                                        sx={{
                                            p: 1.5,
                                            height: '100%',
                                            minHeight: 60,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            bgcolor: slot ? 'primary.50' : 'transparent',
                                            borderColor: slot ? 'primary.main' : 'divider'
                                        }}
                                    >
                                        <Typography variant="body2" fontWeight={slot ? 'bold' : 'normal'} textAlign="center">
                                            {slot ? slot.subjectName : '-'}
                                        </Typography>
                                    </Paper>
                                </Box>
                            );
                        })}
                    </Box>
                ))}
            </Box>
        </Paper>
    );
}
