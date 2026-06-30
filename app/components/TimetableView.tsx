'use client';

import { Box, Paper, Typography } from '@mui/material';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = [
    { num: 1, time: '08:00 - 09:00' },
    { num: 2, time: '09:00 - 10:00' },
    { num: 3, time: '10:00 - 11:00' },
    { num: 4, time: '11:30 - 12:30' },
    { num: 5, time: '12:30 - 13:30' }
];

type TimetableSlot = {
    period?: number;
    p?: number;
    subject?: string;
    subjectName?: string;
    time?: string;
};

interface TimetableViewProps {
    timetable?: Record<string, TimetableSlot[]> | null;
}

function getPeriod(slot: TimetableSlot) {
    return slot.period ?? slot.p;
}

function getSubjectName(slot: TimetableSlot) {
    return slot.subjectName ?? slot.subject ?? '';
}

export default function TimetableView({ timetable }: TimetableViewProps) {
    if (!timetable || Object.keys(timetable).length === 0) {
        return (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                <Typography color="text.secondary">No timetable scheduled yet.</Typography>
            </Paper>
        );
    }

    return (
        <Paper sx={{ overflowX: 'auto', p: 3, borderRadius: 2 }}>
            <Box sx={{ minWidth: 800 }}>
                <Box display="flex" borderBottom={1} borderColor="divider" pb={2} mb={2}>
                    <Box width={100} fontWeight="bold" color="text.secondary">Time</Box>
                    {DAYS.map(day => (
                        <Box key={day} flex={1} textAlign="center" fontWeight="bold">
                            {day}
                        </Box>
                    ))}
                </Box>

                {PERIODS.map((period) => (
                    <Box key={period.num} display="flex" mb={1} alignItems="stretch">
                        <Box width={100} display="flex" flexDirection="column" justifyContent="center">
                            <Typography variant="caption" fontWeight="bold">Period {period.num}</Typography>
                            <Typography variant="caption" color="text.secondary">{period.time}</Typography>
                        </Box>
                        {DAYS.map(day => {
                            const slot = timetable[day]?.find((s) => getPeriod(s) === period.num);
                            const subjectName = slot ? getSubjectName(slot) : '';
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
                                            bgcolor: subjectName ? 'primary.50' : 'transparent',
                                            borderColor: subjectName ? 'primary.main' : 'divider'
                                        }}
                                    >
                                        <Typography variant="body2" fontWeight={subjectName ? 'bold' : 'normal'} textAlign="center">
                                            {subjectName || '-'}
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
