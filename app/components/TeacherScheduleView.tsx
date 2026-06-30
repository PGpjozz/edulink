'use client';

import { Box, Paper, Typography, Chip, Stack } from '@mui/material';
import { Class as ClassIcon } from '@mui/icons-material';
import {
    TIMETABLE_DAYS,
    TIMETABLE_PERIODS,
    type TimetableSlot,
} from '@/lib/timetable';

type TeacherScheduleSlot = {
    day: string;
    period: number;
    time: string;
    classId: string;
    className: string;
    grade: string;
    subjectId: string;
    subjectName: string;
};

interface TeacherScheduleViewProps {
    slots: TeacherScheduleSlot[];
    highlightDay?: string;
}

function getPeriod(slot: TimetableSlot) {
    return slot.period ?? slot.p;
}

function getSubjectName(slot: TimetableSlot) {
    return slot.subjectName ?? slot.subject ?? '';
}

export default function TeacherScheduleView({ slots, highlightDay }: TeacherScheduleViewProps) {
    const today =
        highlightDay ??
        new Date().toLocaleDateString('en-US', { weekday: 'long' });

    if (slots.length === 0) {
        return (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                <Typography color="text.secondary">
                    No teaching periods scheduled yet. Your classes will appear here once timetables are set up.
                </Typography>
            </Paper>
        );
    }

    const slotMap = new Map<string, TeacherScheduleSlot[]>();
    for (const slot of slots) {
        const key = `${slot.day}:${slot.period}`;
        const existing = slotMap.get(key) ?? [];
        existing.push(slot);
        slotMap.set(key, existing);
    }

    return (
        <Paper sx={{ overflowX: 'auto', p: 3, borderRadius: 2 }}>
            <Box sx={{ minWidth: 800 }}>
                <Box display="flex" borderBottom={1} borderColor="divider" pb={2} mb={2}>
                    <Box width={100} fontWeight="bold" color="text.secondary">
                        Time
                    </Box>
                    {TIMETABLE_DAYS.map((day) => (
                        <Box
                            key={day}
                            flex={1}
                            textAlign="center"
                            fontWeight="bold"
                            sx={{
                                color: day === today ? 'primary.main' : 'text.primary',
                            }}
                        >
                            {day}
                            {day === today && (
                                <Typography component="span" variant="caption" display="block" color="primary.main">
                                    Today
                                </Typography>
                            )}
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
                            const daySlots = slotMap.get(`${day}:${period.num}`) ?? [];
                            const isToday = day === today;
                            return (
                                <Box key={day} flex={1} px={0.5}>
                                    <Paper
                                        variant="outlined"
                                        sx={{
                                            p: 1,
                                            height: '100%',
                                            minHeight: 72,
                                            bgcolor: daySlots.length
                                                ? isToday
                                                    ? 'primary.50'
                                                    : 'action.hover'
                                                : 'transparent',
                                            borderColor: daySlots.length
                                                ? isToday
                                                    ? 'primary.main'
                                                    : 'divider'
                                                : 'divider',
                                            borderWidth: isToday && daySlots.length ? 2 : 1,
                                        }}
                                    >
                                        {daySlots.length === 0 ? (
                                            <Typography
                                                variant="body2"
                                                color="text.disabled"
                                                textAlign="center"
                                                sx={{ py: 2 }}
                                            >
                                                —
                                            </Typography>
                                        ) : (
                                            <Stack spacing={0.75}>
                                                {daySlots.map((slot) => (
                                                    <Box key={`${slot.classId}-${slot.subjectId}`}>
                                                        <Typography variant="body2" fontWeight="bold" textAlign="center">
                                                            {slot.className}
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            display="block"
                                                            textAlign="center"
                                                        >
                                                            {slot.subjectName}
                                                        </Typography>
                                                        <Box display="flex" justifyContent="center" mt={0.25}>
                                                            <Chip
                                                                size="small"
                                                                icon={<ClassIcon sx={{ fontSize: 14 }} />}
                                                                label={`Grade ${slot.grade}`}
                                                                sx={{ height: 20, fontSize: '0.65rem' }}
                                                            />
                                                        </Box>
                                                    </Box>
                                                ))}
                                            </Stack>
                                        )}
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

// Re-export helpers for TimetableView compatibility
export { getPeriod, getSubjectName };
