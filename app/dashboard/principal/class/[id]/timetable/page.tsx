'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    Grid,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    IconButton,
    Card,
    CardContent,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import { ArrowBack, Delete, Add } from '@mui/icons-material';
import { useRouter, useParams } from 'next/navigation';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = [
    { num: 1, time: '08:00 - 09:00' },
    { num: 2, time: '09:00 - 10:00' },
    { num: 3, time: '10:00 - 11:00' },
    { num: 4, time: '11:30 - 12:30' }, // Break 11:00-11:30
    { num: 5, time: '12:30 - 13:30' }
];

export default function TimetableEditor() {
    const { id: classId } = useParams();
    const router = useRouter();

    const [timetable, setTimetable] = useState<any>({}); // { Monday: [{ period: 1, subjectId: '...', ... }] }
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Edit Dialog State
    const [openDialog, setOpenDialog] = useState(false);
    const [currentSlot, setCurrentSlot] = useState<{ day: string, period: number } | null>(null);
    const [selectedSubject, setSelectedSubject] = useState('');

    useEffect(() => {
        const fetchall = async () => {
            try {
                // Fetch Subjects
                const subRes = await fetch('/api/subjects');
                const subData = await subRes.json();
                setSubjects(subData);

                // Fetch Existing Timetable
                const ttRes = await fetch(`/api/classes/${classId}/timetable`);
                const ttData = await ttRes.json();
                setTimetable(ttData || {});
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchall();
    }, [classId]);

    const handleCellClick = (day: string, period: number) => {
        setCurrentSlot({ day, period });
        // Check if exists
        const daySlots = timetable[day] || [];
        const existing = daySlots.find((s: any) => s.period === period);
        setSelectedSubject(existing ? existing.subjectId : '');
        setOpenDialog(true);
    };

    const handleSaveSlot = () => {
        if (!currentSlot) return;
        const { day, period } = currentSlot;

        const newTimetable = { ...timetable };
        if (!newTimetable[day]) newTimetable[day] = [];

        // Remove existing for this slot
        newTimetable[day] = newTimetable[day].filter((s: any) => s.period !== period);

        // Add new if subject selected
        if (selectedSubject) {
            const subj = subjects.find(s => s.id === selectedSubject);
            newTimetable[day].push({
                period,
                time: PERIODS.find(p => p.num === period)?.time,
                subjectId: selectedSubject,
                subjectName: subj?.name || 'Unknown'
            });
        }

        setTimetable(newTimetable);
        setOpenDialog(false);
    };

    const handleSaveTimetable = async () => {
        setSaving(true);
        try {
            await fetch(`/api/classes/${classId}/timetable`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(timetable)
            });
            alert('Timetable saved!');
        } catch (e) {
            alert('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Box p={4} display="flex" justifyItems="center"><CircularProgress /></Box>;

    return (
        <Container maxWidth="xl" sx={{ mt: 4 }}>
            <Box mb={4} display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center" gap={2}>
                    <IconButton onClick={() => router.back()}><ArrowBack /></IconButton>
                    <Typography variant="h4" fontWeight="bold">Edit Timetable</Typography>
                </Box>
                <Button variant="contained" onClick={handleSaveTimetable} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Timetable'}
                </Button>
            </Box>

            <Paper sx={{ overflowX: 'auto', p: 2 }}>
                <Box sx={{ minWidth: 800 }}>
                    {/* Header Row */}
                    <Box display="flex" borderBottom={1} borderColor="divider" pb={2} mb={2}>
                        <Box width={100} fontWeight="bold" color="text.secondary">Time</Box>
                        {DAYS.map(day => (
                            <Box key={day} flex={1} textAlign="center" fontWeight="bold">
                                {day}
                            </Box>
                        ))}
                    </Box>

                    {/* Period Rows */}
                    {PERIODS.map((period) => (
                        <Box key={period.num} display="flex" mb={2} alignItems="stretch">
                            <Box width={100} display="flex" flexDirection="column" justifyContent="center">
                                <Typography variant="subtitle2" fontWeight="bold">Period {period.num}</Typography>
                                <Typography variant="caption" color="text.secondary">{period.time}</Typography>
                            </Box>
                            {DAYS.map(day => {
                                const slot = timetable[day]?.find((s: any) => s.period === period.num);
                                return (
                                    <Box key={day} flex={1} px={1}>
                                        <Paper
                                            variant="outlined"
                                            sx={{
                                                p: 2,
                                                height: '100%',
                                                minHeight: 80,
                                                cursor: 'pointer',
                                                bgcolor: slot ? 'secondary.light' : 'transparent',
                                                color: slot ? 'white' : 'inherit',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexDirection: 'column',
                                                '&:hover': { bgcolor: slot ? 'secondary.main' : 'action.hover' }
                                            }}
                                            onClick={() => handleCellClick(day, period.num)}
                                        >
                                            {slot ? (
                                                <>
                                                    <Typography fontWeight="bold" textAlign="center">{slot.subjectName}</Typography>
                                                </>
                                            ) : (
                                                <Add color="action" />
                                            )}
                                        </Paper>
                                    </Box>
                                );
                            })}
                        </Box>
                    ))}
                </Box>
            </Paper>

            {/* Edit Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                <DialogTitle>Assign Subject</DialogTitle>
                <DialogContent sx={{ minWidth: 300, mt: 1 }}>
                    <FormControl fullWidth size="medium" sx={{ mt: 1 }}>
                        <InputLabel>Subject</InputLabel>
                        <Select
                            value={selectedSubject}
                            label="Subject"
                            onChange={(e) => setSelectedSubject(e.target.value)}
                        >
                            <MenuItem value=""><em>Free Period / None</em></MenuItem>
                            {subjects.map(s => (
                                <MenuItem key={s.id} value={s.id}>{s.name} ({s.code})</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleSaveSlot} variant="contained">Set</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
