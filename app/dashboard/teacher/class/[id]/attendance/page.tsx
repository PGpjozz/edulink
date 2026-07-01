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
    LinearProgress,
    Alert,
    IconButton,
    Chip,
    Stack,
} from '@mui/material';
import { ArrowBack, CheckCircle } from '@mui/icons-material';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import PageHeader from '@/app/components/ui/PageHeader';
import PageTransition from '@/app/components/ui/PageTransition';
import ContentPanel from '@/app/components/ui/ContentPanel';
import LoadingSkeleton from '@/app/components/ui/LoadingSkeleton';

const STATUS_OPTIONS = [
    { value: 'PRESENT', label: 'Present', color: 'success' as const },
    { value: 'LATE', label: 'Late', color: 'warning' as const },
    { value: 'ABSENT', label: 'Absent', color: 'error' as const },
];

export default function AttendancePage() {
    const { id: classId } = useParams();
    const router = useRouter();

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    type ClassLearner = { id: string; firstName: string; lastName: string; idNumber?: string };
    const [learners, setLearners] = useState<ClassLearner[]>([]);
    const [attendance, setAttendance] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [recentTap, setRecentTap] = useState<string | null>(null);

    const fetchLearnersAndAttendance = useCallback(async () => {
        setLoading(true);
        try {
            const learnersRes = await fetch(`/api/classes/${classId}/learners`);
            if (!learnersRes.ok) throw new Error('Failed to fetch learners');
            const classLearners: ClassLearner[] = await learnersRes.json();

            const attRes = await fetch(`/api/attendance?classId=${classId}&date=${date}`);
            const existingAtt: { learnerId: string; status: string }[] = attRes.ok ? await attRes.json() : [];

            const attMap: Record<string, string> = {};
            classLearners.forEach((l) => {
                const found = existingAtt.find((a) => a.learnerId === l.id);
                attMap[l.id] = found ? found.status : 'PRESENT';
            });

            setLearners(classLearners);
            setAttendance(attMap);
        } catch {
            // swallow
        } finally {
            setLoading(false);
        }
    }, [classId, date]);

    useEffect(() => {
        fetchLearnersAndAttendance();
    }, [fetchLearnersAndAttendance]);

    const setStatus = (learnerId: string, status: string) => {
        setAttendance({ ...attendance, [learnerId]: status });
        setRecentTap(learnerId);
        setTimeout(() => setRecentTap(null), 300);
    };

    const handleSave = async () => {
        setSaving(true);
        setSuccess(false);
        try {
            const records = learners.map((l) => ({
                learnerId: l.id,
                status: attendance[l.id],
                reason: '',
            }));

            await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ classId, date, records }),
            });

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch {
            alert('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <PageTransition>
            <Container maxWidth="lg">
                <PageHeader
                    title="Class attendance"
                    subtitle="Mark each learner present, late, or absent."
                    breadcrumbs={[
                        { label: 'My Classroom', href: '/dashboard/teacher' },
                        { label: 'Attendance' },
                    ]}
                    actions={
                        <IconButton onClick={() => router.back()} aria-label="Back">
                            <ArrowBack />
                        </IconButton>
                    }
                />

                <ContentPanel
                    title="Register"
                    actions={
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                            <TextField
                                label="Date"
                                type="date"
                                size="small"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                            <Button
                                variant="outlined"
                                onClick={() => {
                                    const all: Record<string, string> = {};
                                    learners.forEach((l) => { all[l.id] = 'PRESENT'; });
                                    setAttendance(all);
                                }}
                            >
                                All present
                            </Button>
                            <Button variant="contained" onClick={handleSave} disabled={saving} component={motion.button} whileTap={{ scale: 0.97 }}>
                                {saving ? 'Saving…' : 'Save'}
                            </Button>
                        </Stack>
                    }
                >
                    <AnimatePresence>
                        {success && (
                            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>
                                    Attendance saved successfully.
                                </Alert>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {loading ? (
                        <LoadingSkeleton variant="table" count={6} />
                    ) : (
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Learner</TableCell>
                                    <TableCell>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {learners.map((learner) => (
                                    <TableRow
                                        key={learner.id}
                                        sx={{
                                            bgcolor: recentTap === learner.id ? 'action.selected' : undefined,
                                            transition: 'background-color 0.25s',
                                        }}
                                    >
                                        <TableCell>
                                            <Typography variant="subtitle1" fontWeight="bold">
                                                {learner.firstName} {learner.lastName}
                                            </Typography>
                                            {learner.idNumber && (
                                                <Typography variant="caption" color="text.secondary">{learner.idNumber}</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                                {STATUS_OPTIONS.map((opt) => (
                                                    <Chip
                                                        key={opt.value}
                                                        label={opt.label}
                                                        color={attendance[learner.id] === opt.value ? opt.color : 'default'}
                                                        variant={attendance[learner.id] === opt.value ? 'filled' : 'outlined'}
                                                        onClick={() => setStatus(learner.id, opt.value)}
                                                        sx={{
                                                            minHeight: 40,
                                                            minWidth: 80,
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            transition: 'transform 0.12s ease',
                                                            '&:active': { transform: 'scale(0.94)' },
                                                        }}
                                                    />
                                                ))}
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </ContentPanel>
            </Container>
        </PageTransition>
    );
}
