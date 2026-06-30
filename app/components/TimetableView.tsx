'use client';

import { Box, Paper, Typography } from '@mui/material';
import {
    TIMETABLE_DAYS,
    TIMETABLE_PERIODS,
    type ClassTimetable,
    getSlotPeriod,
    getSlotSubjectName,
} from '@/lib/timetable';

interface TimetableViewProps {
    timetable?: ClassTimetable | null;
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
                    <Box width={100} fontWeight="bold" color="text.secondary">
                        Time
                    </Box>
                    {TIMETABLE_DAYS.map((day) => (
                        <Box key={day} flex={1} textAlign="center" fontWeight="bold">
                            {day}
                        </Box>
                    ))}
                </Box>

                {TIMETABLE_PERIODS.map((period) => (
                    <Box key={period.num} display="flex" mb={1} alignItems="stretch">
                        <Box width={100} display="flex" flexDirection="column" justifyContent="center">
                            <Typography variant="caption" fontWeight="bold">
                                Period {period.num}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {period.time}
                            </Typography>
                        </Box>
                        {TIMETABLE_DAYS.map((day) => {
                            const slot = timetable[day]?.find((s) => getSlotPeriod(s) === period.num);
                            const subjectName = slot ? getSlotSubjectName(slot) : '';
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
                                            borderColor: subjectName ? 'primary.main' : 'divider',
                                        }}
                                    >
                                        <Typography
                                            variant="body2"
                                            fontWeight={subjectName ? 'bold' : 'normal'}
                                            textAlign="center"
                                        >
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
