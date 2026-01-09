'use client';

import { useState, useEffect, use } from 'react';
import {
    Container,
    Typography,
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Button,
    CircularProgress,
    Stack,
    Divider
} from '@mui/material';
import {
    ArrowBack,
    FileDownload,
    TrendingUp,
    People
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

export default function QuizResults({ params }: { params: Promise<{ id: string }> }) {
    const { id: quizId } = use(params);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchResults = async () => {
            try {
                // We'll reuse the quiz detail API which includes attempts
                const res = await fetch(`/api/school/quizzes/${quizId}`);
                const data = await res.json();
                setStats(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, [quizId]);

    if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>;
    if (!stats) return <Typography align="center">Quiz not found.</Typography>;

    const attempts = stats.attempts || [];
    const avgScore = attempts.length > 0
        ? attempts.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0) / attempts.length
        : 0;

    return (
        <Container maxWidth="xl" sx={{ mt: 4, pb: 8 }}>
            <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                    <Button startIcon={<ArrowBack />} onClick={() => router.back()} sx={{ mb: 1 }}>Back to Quizzes</Button>
                    <Typography variant="h4" fontWeight="bold">{stats.title}</Typography>
                    <Typography color="text.secondary">Performance Analytics & Student Attempts</Typography>
                </Box>
                <Button variant="outlined" startIcon={<FileDownload />}>Export CSV</Button>
            </Box>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} mb={6}>
                <Paper sx={{ p: 3, flex: 1, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'primary.light', color: 'primary.main' }}>
                            <People />
                        </Box>
                        <Box>
                            <Typography variant="h4" fontWeight="bold">{attempts.length}</Typography>
                            <Typography variant="body2" color="text.secondary">Total Submissions</Typography>
                        </Box>
                    </Stack>
                </Paper>
                <Paper sx={{ p: 3, flex: 1, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'success.light', color: 'success.main' }}>
                            <TrendingUp />
                        </Box>
                        <Box>
                            <Typography variant="h4" fontWeight="bold">{Math.round(avgScore)}%</Typography>
                            <Typography variant="body2" color="text.secondary">Average Class Score</Typography>
                        </Box>
                    </Stack>
                </Paper>
                <Paper sx={{ p: 3, flex: 1, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                    <Box>
                        <Typography variant="h4" fontWeight="bold">{stats.timeLimit}m</Typography>
                        <Typography variant="body2" color="text.secondary">Time Limit</Typography>
                    </Box>
                </Paper>
            </Stack>

            <Typography variant="h6" fontWeight="bold" mb={2}>Student Submissions</Typography>
            <TableContainer component={Paper} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                            <TableCell><Typography fontWeight="bold">Student Name</Typography></TableCell>
                            <TableCell><Typography fontWeight="bold">Submission Date</Typography></TableCell>
                            <TableCell><Typography fontWeight="bold">Time Taken</Typography></TableCell>
                            <TableCell align="right"><Typography fontWeight="bold">Score</Typography></TableCell>
                            <TableCell align="right"><Typography fontWeight="bold">Status</Typography></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {attempts.map((attempt: any) => (
                            <TableRow key={attempt.id} hover>
                                <TableCell>{attempt.learner?.user?.name || 'Unknown Student'}</TableCell>
                                <TableCell>{new Date(attempt.completedAt).toLocaleDateString()}</TableCell>
                                <TableCell>12m 45s</TableCell>
                                <TableCell align="right">
                                    <Typography fontWeight="bold" color={attempt.score >= 50 ? 'success.main' : 'error.main'}>
                                        {Math.round(attempt.score)}%
                                    </Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <Chip
                                        label={attempt.score >= 50 ? 'Passed' : 'Needs Review'}
                                        size="small"
                                        color={attempt.score >= 50 ? 'success' : 'warning'}
                                        variant="outlined"
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                        {attempts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                                    <Typography color="text.secondary">No submissions yet for this quiz.</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Container>
    );
}
