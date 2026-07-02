'use client';

import { useState, useEffect, useCallback, use } from 'react';
import {
    Box, Container, Typography, Button, Paper, Alert, CircularProgress,
    Stack, TextField, Chip, Divider, Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import { ArrowBack, Save, Publish, Print } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

type Entry = {
    id: string;
    subjectName: string;
    subjectCode: string | null;
    percentage: number | null;
    capsLevel: number | null;
    capsDescriptor: string | null;
    assessmentCount: number;
    teacherComment: string | null;
};

type Report = {
    id: string;
    learnerName: string;
    schoolName: string;
    termLabel: string;
    grade: string;
    className: string;
    status: 'DRAFT' | 'PUBLISHED';
    overallAverage: number | null;
    attendanceRate: number | null;
    principalComment: string | null;
    publishedAt: string | null;
    entries: Entry[];
};

export default function ReportReview({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [report, setReport] = useState<Report | null>(null);
    const [comments, setComments] = useState<Record<string, string>>({});
    const [principalComment, setPrincipalComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/school/reports/${id}`);
            if (!res.ok) throw new Error('Failed to load report');
            const data: Report = await res.json();
            setReport(data);
            setComments(Object.fromEntries(data.entries.map((e) => [e.id, e.teacherComment ?? ''])));
            setPrincipalComment(data.principalComment ?? '');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    const save = async () => {
        setSaving(true);
        setMessage('');
        try {
            const res = await fetch(`/api/school/reports/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    principalComment,
                    entries: Object.entries(comments).map(([entryId, teacherComment]) => ({ id: entryId, teacherComment })),
                }),
            });
            if (res.ok) setMessage('Saved.');
            else setError((await res.json()).error || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const publish = async () => {
        setPublishing(true);
        setMessage('');
        try {
            await save();
            const res = await fetch(`/api/school/reports/${id}/publish`, { method: 'POST' });
            const result = await res.json();
            if (res.ok) {
                setMessage(`Published. Notified ${result.notified} recipient(s), ${result.emailsSent} email(s) sent.`);
                load();
            } else {
                setError(result.error || 'Publish failed');
            }
        } finally {
            setPublishing(false);
        }
    };

    if (loading) return <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>;
    if (!report) return <Container sx={{ mt: 4 }}><Alert severity="error">{error || 'Report not found'}</Alert></Container>;

    const isPublished = report.status === 'PUBLISHED';

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
            <Button startIcon={<ArrowBack />} onClick={() => router.push('/dashboard/principal/reports')} sx={{ mb: 2 }}>
                Back to reports
            </Button>

            <Paper sx={{ p: 4, borderRadius: 3, mb: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
                    <Box>
                        <Typography variant="h4" fontWeight="bold">{report.learnerName}</Typography>
                        <Typography color="text.secondary">
                            Grade {report.grade} · {report.className} · {report.termLabel}
                        </Typography>
                    </Box>
                    <Stack alignItems="flex-end" spacing={1}>
                        <Chip label={isPublished ? 'Published' : 'Draft'} color={isPublished ? 'success' : 'default'} />
                        <Stack direction="row" spacing={2}>
                            <Typography variant="body2">Average: <strong>{report.overallAverage ?? '—'}%</strong></Typography>
                            <Typography variant="body2">Attendance: <strong>{report.attendanceRate ?? '—'}%</strong></Typography>
                        </Stack>
                    </Stack>
                </Box>
            </Paper>

            {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {isPublished && <Alert severity="info" sx={{ mb: 2 }}>This report is published and can no longer be edited.</Alert>}

            <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>Subject</strong></TableCell>
                            <TableCell align="center"><strong>Level</strong></TableCell>
                            <TableCell align="center"><strong>%</strong></TableCell>
                            <TableCell><strong>Teacher comment</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {report.entries.map((e) => (
                            <TableRow key={e.id}>
                                <TableCell sx={{ fontWeight: 600 }}>
                                    {e.subjectName}
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        {e.assessmentCount} assessment(s)
                                    </Typography>
                                </TableCell>
                                <TableCell align="center">{e.capsLevel != null ? `L${e.capsLevel}` : '—'}</TableCell>
                                <TableCell align="center">{e.percentage != null ? `${e.percentage}%` : 'N/A'}</TableCell>
                                <TableCell>
                                    <TextField
                                        fullWidth multiline size="small"
                                        placeholder={e.capsDescriptor ?? 'Add a comment'}
                                        value={comments[e.id] ?? ''}
                                        disabled={isPublished}
                                        onChange={(ev) => setComments((c) => ({ ...c, [e.id]: ev.target.value }))}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                        {report.entries.length === 0 && (
                            <TableRow><TableCell colSpan={4} align="center">No subjects recorded for this term.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </Paper>

            <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>Principal&apos;s comment</Typography>
                <TextField
                    fullWidth multiline rows={3}
                    value={principalComment}
                    disabled={isPublished}
                    onChange={(e) => setPrincipalComment(e.target.value)}
                />
            </Paper>

            <Divider sx={{ mb: 3 }} />

            <Stack direction="row" spacing={2} flexWrap="wrap">
                <Button variant="outlined" startIcon={<Print />} component="a" href={`/api/school/reports/${id}/print`} target="_blank">
                    Print preview
                </Button>
                {!isPublished && (
                    <>
                        <Button variant="outlined" startIcon={<Save />} onClick={save} disabled={saving}>
                            {saving ? 'Saving…' : 'Save draft'}
                        </Button>
                        <Button variant="contained" startIcon={<Publish />} onClick={publish} disabled={publishing}>
                            {publishing ? 'Publishing…' : 'Publish & notify'}
                        </Button>
                    </>
                )}
            </Stack>
        </Container>
    );
}
