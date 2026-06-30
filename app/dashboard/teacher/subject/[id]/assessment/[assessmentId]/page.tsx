'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Box,
    Container,
    Typography,
    Button,
    Paper,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Avatar,
    Alert,
    CircularProgress,
    Chip,
    Stack,
    InputAdornment,
} from '@mui/material';
import {
    Save as SaveIcon,
    ArrowBack as ArrowBackIcon,
    FileDownload,
    UploadFile,
} from '@mui/icons-material';
import { useRouter, useParams } from 'next/navigation';
import { formatAssessmentTitle, scoreToPercentage } from '@/lib/assessment-utils';

type Learner = {
    id: string;
    user: { firstName: string; lastName: string; idNumber?: string | null };
};

type AssessmentInfo = {
    id: string;
    title: string;
    term?: string | null;
    paper?: string | null;
    type: string;
    totalMarks: number;
    weight: number;
    date: string;
    subject: { name: string; grade: string; code?: string | null };
    displayTitle?: string;
};

export default function AssessmentGrading() {
    const router = useRouter();
    const params = useParams();
    const { id: subjectId, assessmentId } = params as { id: string; assessmentId: string };
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [assessment, setAssessment] = useState<AssessmentInfo | null>(null);
    const [learners, setLearners] = useState<Learner[]>([]);
    const [grades, setGrades] = useState<Record<string, string>>({});
    const [comments, setComments] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [importing, setImporting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [assessmentRes, gradesRes, learnersRes] = await Promise.all([
                    fetch(`/api/assessments/${assessmentId}`),
                    fetch(`/api/grades?assessmentId=${assessmentId}`),
                    fetch(`/api/subjects/${subjectId}/learners`),
                ]);

                if (assessmentRes.ok) {
                    setAssessment(await assessmentRes.json());
                }

                const gradeMap: Record<string, string> = {};
                const commentMap: Record<string, string> = {};
                if (gradesRes.ok) {
                    const gradesData = await gradesRes.json();
                    gradesData.forEach((g: { learnerId: string; score: number; comments?: string }) => {
                        gradeMap[g.learnerId] = String(g.score);
                        commentMap[g.learnerId] = g.comments || '';
                    });
                }
                setGrades(gradeMap);
                setComments(commentMap);

                if (learnersRes.ok) {
                    setLearners(await learnersRes.json());
                }
            } catch {
                setMessage({ type: 'error', text: 'Failed to load grading sheet' });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [assessmentId, subjectId]);

    const totalMarks = assessment?.totalMarks ?? 100;
    const displayTitle =
        assessment?.displayTitle ||
        (assessment
            ? formatAssessmentTitle({
                  term: assessment.term,
                  paper: assessment.paper,
                  title: assessment.title,
                  type: assessment.type,
                  subjectName: assessment.subject.name,
              })
            : 'Grading');

    const handleScoreChange = (learnerId: string, value: string) => {
        setGrades((prev) => ({ ...prev, [learnerId]: value }));
        setTouched((prev) => new Set(prev).add(learnerId));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);

        const gradesToSave = [...touched]
            .map((learnerId) => {
                const raw = grades[learnerId]?.trim();
                if (!raw) return null;
                const score = Number(raw);
                if (!Number.isFinite(score)) return null;
                return {
                    learnerId,
                    score,
                    comments: comments[learnerId] || undefined,
                };
            })
            .filter(Boolean) as { learnerId: string; score: number; comments?: string }[];

        if (gradesToSave.length === 0) {
            setMessage({ type: 'error', text: 'Enter at least one mark before saving' });
            setSaving(false);
            return;
        }

        try {
            const res = await fetch('/api/grades', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assessmentId, grades: gradesToSave }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to save');
            setMessage({ type: 'success', text: `Saved ${gradesToSave.length} mark(s) successfully` });
        } catch (err) {
            setMessage({
                type: 'error',
                text: err instanceof Error ? err.message : 'Error saving grades',
            });
        } finally {
            setSaving(false);
        }
    };

    const downloadTemplate = () => {
        window.location.href = `/api/grades/template?assessmentId=${assessmentId}&subjectId=${subjectId}`;
    };

    const handleImport = async (file: File) => {
        setImporting(true);
        setMessage(null);
        try {
            const csv = await file.text();
            const res = await fetch('/api/grades/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assessmentId, subjectId, csv }),
            });
            const data = await res.json();
            if (!res.ok) {
                const detail = [data.error, ...(data.details || []), ...(data.unmatched || []).map((u: string) => `Unmatched: ${u}`)]
                    .filter(Boolean)
                    .join(' · ');
                throw new Error(detail || 'Import failed');
            }

            const gradesRes = await fetch(`/api/grades?assessmentId=${assessmentId}`);
            if (gradesRes.ok) {
                const gradesData = await gradesRes.json();
                const gradeMap: Record<string, string> = { ...grades };
                const commentMap: Record<string, string> = { ...comments };
                const newTouched = new Set(touched);
                gradesData.forEach((g: { learnerId: string; score: number; comments?: string }) => {
                    gradeMap[g.learnerId] = String(g.score);
                    commentMap[g.learnerId] = g.comments || '';
                    newTouched.add(g.learnerId);
                });
                setGrades(gradeMap);
                setComments(commentMap);
                setTouched(newTouched);
            }

            const warnings =
                data.unmatched?.length > 0
                    ? ` ${data.unmatched.length} row(s) could not be matched.`
                    : '';
            setMessage({
                type: 'success',
                text: `Imported ${data.imported} mark(s).${warnings}`,
            });
        } catch (err) {
            setMessage({
                type: 'error',
                text: err instanceof Error ? err.message : 'Import failed',
            });
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    if (loading) return <CircularProgress sx={{ mt: 5, ml: 4 }} />;

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()} sx={{ mb: 2 }}>
                Back to Assessments
            </Button>

            <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                    {displayTitle}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {assessment?.term && <Chip size="small" label={assessment.term} color="primary" variant="outlined" />}
                    {assessment?.paper && <Chip size="small" label={assessment.paper} />}
                    {assessment?.subject && (
                        <Chip size="small" label={`Grade ${assessment.subject.grade} ${assessment.subject.name}`} />
                    )}
                    {assessment?.type && <Chip size="small" label={assessment.type} variant="outlined" />}
                    <Chip size="small" label={`Out of ${totalMarks} marks`} color="secondary" variant="outlined" />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    Enter the raw mark each learner scored on the paper (e.g. 67 out of {totalMarks}).
                    Percentages are calculated automatically.
                </Typography>
            </Paper>

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
                <Typography variant="h6" fontWeight="bold">
                    Enter marks
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button variant="outlined" startIcon={<FileDownload />} onClick={downloadTemplate}>
                        Download CSV template
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<UploadFile />}
                        disabled={importing}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {importing ? 'Importing…' : 'Import CSV'}
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        hidden
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleImport(file);
                        }}
                    />
                    <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? 'Saving…' : 'Save Grades'}
                    </Button>
                </Stack>
            </Box>

            {message && (
                <Alert severity={message.type === 'info' ? 'info' : message.type} sx={{ mb: 2 }}>
                    {message.text}
                </Alert>
            )}

            <Paper sx={{ overflow: 'hidden' }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Learner</TableCell>
                            <TableCell width={220}>Mark (out of {totalMarks})</TableCell>
                            <TableCell width={100}>Percentage</TableCell>
                            <TableCell>Comments</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {learners.map((learner) => {
                            const raw = grades[learner.id] ?? '';
                            const score = raw.trim() ? Number(raw) : null;
                            const pct =
                                score !== null && Number.isFinite(score)
                                    ? scoreToPercentage(score, totalMarks)
                                    : null;
                            const overLimit = score !== null && Number.isFinite(score) && score > totalMarks;

                            return (
                                <TableRow key={learner.id}>
                                    <TableCell>
                                        <Box display="flex" alignItems="center" gap={2}>
                                            <Avatar>{learner.user.firstName[0]}</Avatar>
                                            <Box>
                                                <Typography>
                                                    {learner.user.firstName} {learner.user.lastName}
                                                </Typography>
                                                {learner.user.idNumber && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {learner.user.idNumber}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            size="small"
                                            type="number"
                                            value={raw}
                                            onChange={(e) => handleScoreChange(learner.id, e.target.value)}
                                            error={overLimit}
                                            helperText={overLimit ? `Max ${totalMarks}` : undefined}
                                            inputProps={{ min: 0, max: totalMarks, step: 0.5 }}
                                            InputProps={{
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        / {totalMarks}
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={{ minWidth: 160 }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography
                                            variant="body2"
                                            fontWeight="bold"
                                            color={pct !== null ? (pct >= 50 ? 'success.main' : 'error.main') : 'text.disabled'}
                                        >
                                            {pct !== null ? `${pct}%` : '—'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            size="small"
                                            fullWidth
                                            placeholder="Optional comments"
                                            value={comments[learner.id] || ''}
                                            onChange={(e) =>
                                                setComments({ ...comments, [learner.id]: e.target.value })
                                            }
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {learners.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} align="center">
                                    No learners found for this subject.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Paper>
        </Container>
    );
}
