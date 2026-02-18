'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Button,
    TextField,
    RadioGroup,
    FormControlLabel,
    Radio,
    LinearProgress,
    Alert,
    IconButton
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material'; // Simplified back
import { useParams, useRouter } from 'next/navigation';

export default function AttendancePage() {
    const { id: classId } = useParams();
    const router = useRouter();

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    type ClassLearner = { id: string; firstName: string; lastName: string; idNumber?: string };
    type AttendanceRecord = { learnerId: string; status: string };
    const [learners, setLearners] = useState<ClassLearner[]>([]);
    const [attendance, setAttendance] = useState<Record<string, string>>({}); // learnerId -> status
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');

    const fetchLearnersAndAttendance = useCallback(async () => {
        setLoading(true);
        try {
            const learnersRes = await fetch(`/api/classes/${classId}/learners`);
            if (!learnersRes.ok) throw new Error('Failed to fetch learners');
            const classLearners: ClassLearner[] = await learnersRes.json();

            const attRes = await fetch(`/api/attendance?classId=${classId}&date=${date}`);
            const existingAtt: AttendanceRecord[] = attRes.ok ? await attRes.json() : [];

            const attMap: Record<string, string> = {};
            classLearners.forEach((l) => {
                const found = existingAtt.find((a) => a.learnerId === l.id);
                attMap[l.id] = found ? found.status : 'PRESENT';
            });

            setLearners(classLearners);
            setAttendance(attMap);
        } catch {
            // swallow to avoid noisy logs
        } finally {
            setLoading(false);
        }
    }, [classId, date]);

    useEffect(() => {
        // Fetch class learners first
        // Ideally we'd have a specific endpoint for "learners in class", but we use the generic one or custom
        // For now, let's assume we can fetch attendance which includes learners? 
        // Or better: Fetch Class Rosters.
        // Let's use `api/users` but filtered? No, `api/classes` includes count but not list.
        // We need a way to get learners in a class.
        // Let's rely on the `GET /api/attendance` to return *existing* records, 
        // BUT if no records exist, we still need the list of students to mark them!
        // So we need: GET /api/classes/[id]/learners. 
        // I haven't built that yet. I'll mock-fetch or build it.
        // Actually, `api/users` returns all users. 
        // Quickest path: Build `api/classes/[id]/learners` or similar.

        // Wait, I can reuse `api/subjects/[id]/learners` logic but for class.
        fetchLearnersAndAttendance();
    }, [fetchLearnersAndAttendance]);

    const handleSave = async () => {
        setSaving(true);
        setSuccess('');
        try {
            const records = learners.map(l => ({
                learnerId: l.id,
                status: attendance[l.id],
                reason: ''
            }));

            await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ classId, date, records })
            });

            setSuccess('Attendance saved successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch {
            alert('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Container maxWidth="lg">
            <Box mb={4} display="flex" alignItems="center" gap={2}>
                <IconButton onClick={() => router.back()}><ArrowBack /></IconButton>
                <Typography variant="h4" fontWeight="bold">Class Attendance</Typography>
            </Box>

            <Paper sx={{ p: 3, mb: 3 }}>
                <Box display="flex" gap={2} alignItems="center" mb={2}>
                    <TextField
                        label="Date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                    />
                    <Button variant="contained" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Attendance'}
                    </Button>
                </Box>

                {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
                {loading && <LinearProgress />}

                {!loading && (
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Learner</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {learners.map((learner) => (
                                <TableRow key={learner.id}>
                                    <TableCell>
                                        <Typography variant="subtitle1">{learner.firstName} {learner.lastName}</Typography>
                                        <Typography variant="caption" color="text.secondary">{learner.idNumber}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <RadioGroup
                                            row
                                            value={attendance[learner.id]}
                                            onChange={(e) => setAttendance({ ...attendance, [learner.id]: e.target.value })}
                                        >
                                            <FormControlLabel value="PRESENT" control={<Radio color="success" />} label="Present" />
                                            <FormControlLabel value="ABSENT" control={<Radio color="error" />} label="Absent" />
                                            <FormControlLabel value="LATE" control={<Radio color="warning" />} label="Late" />
                                        </RadioGroup>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Paper>
        </Container>
    );
}
