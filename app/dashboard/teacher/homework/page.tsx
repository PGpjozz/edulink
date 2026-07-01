'use client';

import { useEffect, useState } from 'react';
import {
    Container, Typography, Box, Button, Stack, Chip, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField, FormControl,
    InputLabel, Select, MenuItem, Alert, Table, TableHead, TableRow, TableCell, TableBody,
    Link as MuiLink,
} from '@mui/material';
import { Assignment } from '@mui/icons-material';
import PageHeader from '@/app/components/ui/PageHeader';
import PageTransition from '@/app/components/ui/PageTransition';
import ContentPanel from '@/app/components/ui/ContentPanel';
import EmptyState from '@/app/components/ui/EmptyState';

type HomeworkItem = {
    id: string;
    title: string;
    description?: string;
    dueDate: string;
    subject?: { name: string };
    class?: { name: string; grade?: string };
    _count?: { submissions: number };
};

type Submission = {
    id: string;
    learnerId: string;
    note?: string;
    fileUrl?: string;
    grade?: number;
    feedback?: string;
    submittedAt?: string;
    learner?: { user?: { firstName: string; lastName: string } };
};

export default function TeacherHomeworkPage() {
    const [items, setItems] = useState<HomeworkItem[]>([]);
    const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
    const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
    const [open, setOpen] = useState(false);
    const [reviewId, setReviewId] = useState<string | null>(null);
    const [reviewTitle, setReviewTitle] = useState('');
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [subLoading, setSubLoading] = useState(false);
    const [grades, setGrades] = useState<Record<string, { grade: string; feedback: string }>>({});
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [classId, setClassId] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [error, setError] = useState('');
    const [saveMsg, setSaveMsg] = useState('');

    const load = () => {
        fetch('/api/homework').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []));
    };

    useEffect(() => {
        load();
        Promise.all([
            fetch('/api/classes').then((r) => r.json()),
            fetch('/api/subjects').then((r) => r.json()),
        ]).then(([c, s]) => {
            setClasses(Array.isArray(c) ? c : []);
            setSubjects(Array.isArray(s) ? s : []);
        });
    }, []);

    const openReview = async (h: HomeworkItem) => {
        setReviewId(h.id);
        setReviewTitle(h.title);
        setSubLoading(true);
        setSaveMsg('');
        const res = await fetch(`/api/homework/${h.id}/submissions`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setSubmissions(list);
        const draft: Record<string, { grade: string; feedback: string }> = {};
        list.forEach((s: Submission) => {
            draft[s.learnerId] = {
                grade: s.grade != null ? String(s.grade) : '',
                feedback: s.feedback ?? '',
            };
        });
        setGrades(draft);
        setSubLoading(false);
    };

    const saveGrade = async (learnerId: string) => {
        if (!reviewId) return;
        const draft = grades[learnerId];
        const res = await fetch(`/api/homework/${reviewId}/submissions`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                learnerId,
                grade: draft?.grade ? Number(draft.grade) : undefined,
                feedback: draft?.feedback || undefined,
            }),
        });
        if (res.ok) {
            setSaveMsg('Saved');
            setTimeout(() => setSaveMsg(''), 2000);
            openReview({ id: reviewId, title: reviewTitle, dueDate: '' });
            load();
        }
    };

    const handleCreate = async () => {
        setError('');
        const res = await fetch('/api/homework', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title, description, dueDate,
                classId: classId || undefined,
                subjectId: subjectId || undefined,
            }),
        });
        const data = await res.json();
        if (!res.ok) {
            setError(data.error || 'Failed to create');
            return;
        }
        setOpen(false);
        setTitle('');
        setDescription('');
        setDueDate('');
        load();
    };

    return (
        <PageTransition>
            <Container maxWidth="lg">
                <PageHeader
                    title="Homework"
                    subtitle="Assign work and review learner submissions."
                    actions={
                        <Button variant="contained" onClick={() => setOpen(true)}>
                            Assign homework
                        </Button>
                    }
                />

                <Stack spacing={2}>
                    {items.map((h) => (
                        <ContentPanel
                            key={h.id}
                            title={h.title}
                            subtitle={h.description}
                            actions={
                                <Button size="small" onClick={() => openReview(h)}>
                                    Review
                                </Button>
                            }
                            sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.light' } }}
                        >
                            <Box display="flex" gap={1} flexWrap="wrap" alignItems="center" onClick={() => openReview(h)}>
                                {h.subject && <Chip size="small" label={h.subject.name} />}
                                {h.class && <Chip size="small" label={h.class.name} />}
                                <Chip size="small" label={`Due ${new Date(h.dueDate).toLocaleDateString()}`} />
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    color={(h._count?.submissions ?? 0) > 0 ? 'primary' : 'default'}
                                    label={`${h._count?.submissions ?? 0} submissions`}
                                />
                            </Box>
                        </ContentPanel>
                    ))}
                    {items.length === 0 && (
                        <EmptyState
                            icon={<Assignment sx={{ fontSize: 56 }} />}
                            title="No homework yet"
                            description="Create your first assignment for a class."
                            actionLabel="Assign homework"
                            onAction={() => setOpen(true)}
                        />
                    )}
                </Stack>

            <Dialog open={!!reviewId} onClose={() => setReviewId(null)} maxWidth="md" fullWidth>
                <DialogTitle>Submissions — {reviewTitle}</DialogTitle>
                <DialogContent>
                    {saveMsg && <Alert severity="success" sx={{ mb: 2 }}>{saveMsg}</Alert>}
                    {subLoading ? (
                        <Typography color="text.secondary">Loading…</Typography>
                    ) : submissions.length === 0 ? (
                        <Typography color="text.secondary">No submissions yet.</Typography>
                    ) : (
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Learner</TableCell>
                                    <TableCell>Work</TableCell>
                                    <TableCell>Grade</TableCell>
                                    <TableCell>Feedback</TableCell>
                                    <TableCell />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {submissions.map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell>
                                            {s.learner?.user?.firstName} {s.learner?.user?.lastName}
                                        </TableCell>
                                        <TableCell>
                                            {s.note && <Typography variant="body2">{s.note}</Typography>}
                                            {s.fileUrl && (
                                                <MuiLink href={s.fileUrl} target="_blank" rel="noopener">
                                                    Attachment
                                                </MuiLink>
                                            )}
                                            {s.submittedAt && (
                                                <Typography variant="caption" display="block" color="text.secondary">
                                                    {new Date(s.submittedAt).toLocaleString()}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                size="small"
                                                type="number"
                                                inputProps={{ min: 0, max: 100 }}
                                                value={grades[s.learnerId]?.grade ?? ''}
                                                onChange={(e) => setGrades({
                                                    ...grades,
                                                    [s.learnerId]: { ...grades[s.learnerId], grade: e.target.value, feedback: grades[s.learnerId]?.feedback ?? '' },
                                                })}
                                                sx={{ width: 72 }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                size="small"
                                                value={grades[s.learnerId]?.feedback ?? ''}
                                                onChange={(e) => setGrades({
                                                    ...grades,
                                                    [s.learnerId]: { grade: grades[s.learnerId]?.grade ?? '', feedback: e.target.value },
                                                })}
                                                fullWidth
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button size="small" onClick={() => saveGrade(s.learnerId)}>Save</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReviewId(null)}>Close</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Assign homework</DialogTitle>
                <DialogContent>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
                        <TextField label="Instructions" multiline minRows={3} value={description} onChange={(e) => setDescription(e.target.value)} fullWidth />
                        <TextField label="Due date" type="datetime-local" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
                        <FormControl fullWidth>
                            <InputLabel>Class (optional)</InputLabel>
                            <Select value={classId} label="Class (optional)" onChange={(e) => setClassId(e.target.value)}>
                                <MenuItem value="">All / school-wide</MenuItem>
                                {classes.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Subject (optional)</InputLabel>
                            <Select value={subjectId} label="Subject (optional)" onChange={(e) => setSubjectId(e.target.value)}>
                                <MenuItem value="">—</MenuItem>
                                {subjects.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreate}>Create</Button>
                </DialogActions>
            </Dialog>
            </Container>
        </PageTransition>
    );
}
