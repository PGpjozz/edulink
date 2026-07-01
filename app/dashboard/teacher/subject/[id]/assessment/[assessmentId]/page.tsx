'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Button,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Avatar,
    Alert,
} from '@mui/material';
import { Save as SaveIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useRouter, useParams } from 'next/navigation';
import PageHeader from '@/app/components/ui/PageHeader';
import PageTransition from '@/app/components/ui/PageTransition';
import ContentPanel from '@/app/components/ui/ContentPanel';
import LoadingSkeleton from '@/app/components/ui/LoadingSkeleton';
import EmptyState from '@/app/components/ui/EmptyState';

export default function AssessmentGrading() {
    const router = useRouter();
    const params = useParams();
    const { id: subjectId, assessmentId } = params as { id: string; assessmentId: string };

    type Learner = { id: string; user: { firstName: string; lastName: string } };
    type GradeItem = { learnerId: string; score: number; comments?: string };

    const [learners, setLearners] = useState<Learner[]>([]);
    const [grades, setGrades] = useState<Record<string, number>>({});
    const [comments, setComments] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [gradesRes, learnersRes] = await Promise.all([
                    fetch(`/api/grades?assessmentId=${assessmentId}`),
                    fetch(`/api/subjects/${subjectId}/learners`),
                ]);

                if (learnersRes.ok) {
                    const learnersData: Learner[] = await learnersRes.json();
                    if (Array.isArray(learnersData)) {
                        setLearners(learnersData);
                    }
                }

                if (gradesRes.ok) {
                    const gradesData: GradeItem[] = await gradesRes.json();
                    if (Array.isArray(gradesData)) {
                        const gradeMap: Record<string, number> = {};
                        const commentMap: Record<string, string> = {};
                        gradesData.forEach((g) => {
                            gradeMap[g.learnerId] = g.score;
                            commentMap[g.learnerId] = g.comments || '';
                        });
                        setGrades(gradeMap);
                        setComments(commentMap);
                    }
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

        const gradesToSave = learners
            .filter((l) => grades[l.id] !== undefined && grades[l.id] !== null && grades[l.id] !== ('' as unknown as number))
            .map((l) => ({
                learnerId: l.id,
                score: grades[l.id],
                comments: comments[l.id],
            }));

        if (gradesToSave.length === 0) {
            setMessage({ type: 'error', text: 'Enter at least one score before saving.' });
            setSaving(false);
            return;
        }

        try {
            const res = await fetch('/api/grades', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assessmentId, grades: gradesToSave }),
            });

            if (!res.ok) throw new Error('Failed to save');
            setMessage({ type: 'success', text: 'Grades saved successfully' });
        } catch {
            setMessage({ type: 'error', text: 'Error saving grades' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Container maxWidth="lg">
                <LoadingSkeleton variant="page" />
            </Container>
        );
    }

    return (
        <PageTransition>
            <Container maxWidth="lg">
                <PageHeader
                    title="Grading"
                    subtitle="Enter scores and feedback for each learner."
                    breadcrumbs={[
                        { label: 'Gradebook', href: '/dashboard/teacher/gradebook' },
                        { label: 'Assessment' },
                    ]}
                    actions={
                        <Box display="flex" gap={1} flexWrap="wrap">
                            <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()}>
                                Back
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<SaveIcon />}
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : 'Save grades'}
                            </Button>
                        </Box>
                    }
                />

                {message && (
                    <Alert severity={message.type} sx={{ mb: 2 }}>
                        {message.text}
                    </Alert>
                )}

                {learners.length === 0 ? (
                    <EmptyState
                        title="No learners found"
                        description="There are no learners enrolled in this subject's class yet."
                    />
                ) : (
                    <ContentPanel title={`${learners.length} learners`} noPadding>
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
                                                onChange={(e) =>
                                                    setGrades({
                                                        ...grades,
                                                        [learner.id]: parseFloat(e.target.value) || 0,
                                                    })
                                                }
                                                inputProps={{ min: 0, max: 100 }}
                                            />
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
                                ))}
                            </TableBody>
                        </Table>
                    </ContentPanel>
                )}
            </Container>
        </PageTransition>
    );
}
