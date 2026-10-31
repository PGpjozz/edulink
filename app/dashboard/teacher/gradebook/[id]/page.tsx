'use client';

import { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    CircularProgress,
    Tooltip,
    Alert,
    TextField,
} from '@mui/material';
import { FileDownload, Refresh, Save } from '@mui/icons-material';
import { useParams } from 'next/navigation';
import PageHeader from '@/app/components/ui/PageHeader';
import PageTransition from '@/app/components/ui/PageTransition';
import ContentPanel from '@/app/components/ui/ContentPanel';

export default function MasterGradebook() {
    const params = useParams();
    const subjectId = params.id as string;

    type Assessment = { id: string; title: string; type: string; weight: number; totalMarks: number };
    type Learner = { id: string; user: { firstName: string; lastName: string } };
    type Grade = { learnerId: string; assessmentId: string; score: number };
    type GradebookData = { assessments: Assessment[]; learners: Learner[]; grades: Grade[] };
    const [data, setData] = useState<GradebookData | null>(null);
    const [scores, setScores] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const cellKey = (learnerId: string, assessmentId: string) => `${learnerId}:${assessmentId}`;

    const fetchData = async (quiet = false) => {
        if (!quiet) setLoading(true);
        try {
            const res = await fetch(`/api/subjects/${subjectId}/grades`);
            const json: GradebookData = await res.json();
            setData(json);
            const next: Record<string, string> = {};
            json.grades?.forEach((g) => {
                next[`${g.learnerId}:${g.assessmentId}`] = String(g.score);
            });
            setScores(next);
        } catch (err) {
            console.error('Error fetching master gradebook:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (subjectId) fetchData();
    }, [subjectId]);

    const getGrade = (learnerId: string, assessmentId: string) => {
        const value = scores[cellKey(learnerId, assessmentId)];
        return value === undefined || value === '' ? '-' : value;
    };

    const saveGrades = async () => {
        if (!data) return;
        setSaving(true);
        setMessage(null);
        try {
            for (const assessment of data.assessments) {
                const grades = data.learners.flatMap((learner) => {
                    const raw = scores[cellKey(learner.id, assessment.id)];
                    if (raw === undefined || raw.trim() === '') return [];
                    const score = Number(raw);
                    if (!Number.isFinite(score)) return [];
                    return [{ learnerId: learner.id, score }];
                });
                if (grades.length === 0) continue;
                const res = await fetch('/api/grades', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ assessmentId: assessment.id, grades }),
                });
                if (!res.ok) throw new Error(await res.text());
            }
            setMessage({ type: 'success', text: 'Marks saved for every assessment that has a score.' });
            await fetchData(true);
        } catch {
            setMessage({ type: 'error', text: 'Marks were not saved. Try again.' });
        } finally {
            setSaving(false);
        }
    };

    const exportCSV = () => {
        if (!data) return;

        let csv = 'Learner,';
        csv += data.assessments.map((a) => `"${a.title}"`).join(',') + '\n';

        data.learners.forEach((l) => {
            csv += `"${l.user.firstName} ${l.user.lastName}",`;
            csv += data.assessments.map((a) => getGrade(l.id, a.id)).join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Gradebook_Export_${subjectId}.csv`;
        a.click();
    };

    if (loading) return <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>;
    if (!data) return <Alert severity="error">Failed to load data.</Alert>;

    return (
        <PageTransition>
            <Container maxWidth="xl">
                <PageHeader
                    title="Master gradebook"
                    subtitle="Enter a mark in any column. Blank cells are not graded yet."
                    breadcrumbs={[
                        { label: 'Gradebook', href: '/dashboard/teacher/gradebook' },
                        { label: 'Subject grades' },
                    ]}
                    actions={
                        <Box display="flex" gap={1}>
                            <Button startIcon={<Refresh />} onClick={() => fetchData()} disabled={saving}>Refresh</Button>
                            <Button variant="outlined" startIcon={<FileDownload />} onClick={exportCSV}>Export CSV</Button>
                            <Button variant="contained" startIcon={<Save />} onClick={saveGrades} disabled={saving}>
                                {saving ? 'Saving...' : 'Save marks'}
                            </Button>
                        </Box>
                    }
                />

                {message && <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>}

                <ContentPanel noPadding>
            <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', minWidth: 200 }}>Learner Name</TableCell>
                            {data.assessments.map((a) => (
                                <TableCell key={a.id} align="center" sx={{ fontWeight: 'bold', minWidth: 100 }}>
                                    <Tooltip title={`${a.type} (${a.weight}%)`}>
                                        <Box>
                                            <Typography variant="body2" fontWeight="bold">{a.title}</Typography>
                                            <Typography variant="caption" color="text.secondary">Max: {a.totalMarks}</Typography>
                                        </Box>
                                    </Tooltip>
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.learners.map((learner) => (
                            <TableRow key={learner.id} hover>
                                <TableCell sx={{ fontWeight: 'medium' }}>
                                    {learner.user.firstName} {learner.user.lastName}
                                </TableCell>
                                {data.assessments.map((a) => (
                                    <TableCell key={a.id} align="center">
                                        <TextField
                                            size="small"
                                            type="number"
                                            placeholder="—"
                                            value={scores[cellKey(learner.id, a.id)] ?? ''}
                                            onChange={(e) => setScores((current) => ({
                                                ...current,
                                                [cellKey(learner.id, a.id)]: e.target.value,
                                            }))}
                                            inputProps={{ min: 0, max: a.totalMarks, 'aria-label': `${a.title} mark` }}
                                            sx={{ width: 88 }}
                                        />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
                </ContentPanel>
            </Container>
        </PageTransition>
    );
}
