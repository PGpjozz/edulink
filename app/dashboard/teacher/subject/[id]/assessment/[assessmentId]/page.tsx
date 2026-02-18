'use client';

import { useState, useEffect } from 'react';
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
    CircularProgress
} from '@mui/material';
import { Save as SaveIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useRouter, useParams } from 'next/navigation';

export default function AssessmentGrading() {
    const router = useRouter();
    const params = useParams();
    const { id: subjectId, assessmentId } = params as { id: string, assessmentId: string };

    type Learner = { id: string; user: { firstName: string; lastName: string } };
    type GradeItem = { learnerId: string; score: number; comments?: string };

    const [learners, setLearners] = useState<Learner[]>([]);
    const [grades, setGrades] = useState<Record<string, number>>({});
    const [comments, setComments] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        // Fetch assessment details, class learners, and existing grades
        // Ideally we have a dedicated endpoint for "Grading Sheet"
        // For now, we fetch fetch learners for the Subject's Class + Grades

        // 1. Fetch Subject to get ClassId (mocking simplified flow: assume we fetch learners via API)
        // Actually, we need to fetch the learners enrolled in this subject's class.

        // Let's assume we implement a specific route /api/assessments/[id]/grading-sheet
        // Or we fetch learners from Class and Grades separately and merge.

        // Let's try fetching grades first
        const fetchData = async () => {
            try {
                // Get grades
                const gradesRes = await fetch(`/api/grades?assessmentId=${assessmentId}`);
                const gradesData: GradeItem[] = await gradesRes.json();

                // Map existing grades
                const gradeMap: Record<string, number> = {};
                const commentMap: Record<string, string> = {};
                gradesData.forEach((g) => {
                    gradeMap[g.learnerId] = g.score;
                    commentMap[g.learnerId] = g.comments || '';
                });
                setGrades(gradeMap);
                setComments(commentMap);

                // Fetch Learners (We need an endpoint to get learners for a SUBJECT)
                // Or we fetch the Subject -> Class -> Learners
                // Let's assume for now we just show the learners returned by the grades (if any)
                // BUT if no grades exist, we see nobody. 

                // Fix: We need to fetch the learners of the class associated with the subject.
                // Let's add a `GET /api/subjects/[id]/learners` endpoint or similar.
                // For now, let's mock the learner list or rely on `gradesData` if populated via seed.
                // Real implementation:
                const learnersRes = await fetch(`/api/subjects/${subjectId}/learners`);
                if (learnersRes.ok) {
                    const learnersData: Learner[] = await learnersRes.json();
                    setLearners(learnersData);
                }
            } catch {
                // swallow
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [assessmentId, subjectId]);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);

        const gradesToSave = Object.keys(grades).map(learnerId => ({
            learnerId,
            score: grades[learnerId],
            comments: comments[learnerId]
        }));

        try {
            const res = await fetch('/api/grades', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assessmentId, grades: gradesToSave })
            });

            if (!res.ok) throw new Error('Failed to save');
            setMessage({ type: 'success', text: 'Grades saved successfully' });
        } catch {
            setMessage({ type: 'error', text: 'Error saving grades' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <CircularProgress sx={{ mt: 5 }} />;

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => router.back()}
                sx={{ mb: 2 }}
            >
                Back to Assessment
            </Button>

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" fontWeight="bold">
                    Grading
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save Grades'}
                </Button>
            </Box>

            {message && (
                <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>
            )}

            <Paper sx={{ overflow: 'hidden' }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Learner</TableCell>
                            <TableCell width={150}>Score</TableCell>
                            <TableCell>Comments</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {learners.map((learner) => (
                            <TableRow key={learner.id}>
                                <TableCell>
                                    <Box display="flex" alignItems="center" gap={2}>
                                        <Avatar>{learner.user.firstName[0]}</Avatar>
                                        <Typography>
                                            {learner.user.firstName} {learner.user.lastName}
                                        </Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        size="small"
                                        type="number"
                                        value={grades[learner.id] ?? ''}
                                        onChange={(e) => setGrades({ ...grades, [learner.id]: parseFloat(e.target.value) || 0 })}
                                        inputProps={{ min: 0, max: 100 }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        size="small"
                                        fullWidth
                                        placeholder="Optional comments"
                                        value={comments[learner.id] || ''}
                                        onChange={(e) => setComments({ ...comments, [learner.id]: e.target.value })}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                        {learners.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} align="center">
                                    No learners found for this class.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Paper>
        </Container>
    );
}
