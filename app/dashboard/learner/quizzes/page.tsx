'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    Chip,
    Stack,
    CircularProgress,
    Alert,
    Paper,
    Divider
} from '@mui/material';
import {
    QuestionAnswer,
    Timer,
    CheckCircle,
    PlayArrow
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function LearnerQuizzes() {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchQuizzes = async () => {
        try {
            const res = await fetch('/api/school/quizzes');
            const data = await res.json();
            setQuizzes(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuizzes();
    }, []);

    if (loading) return <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>;

    return (
        <Container maxWidth="xl" sx={{ mt: 4, pb: 8 }}>
            <Box mb={4}>
                <Typography variant="h4" fontWeight="bold">Digital Assessments</Typography>
                <Typography color="text.secondary">Master your subjects through interactive challenges.</Typography>
            </Box>

            <Grid container spacing={3}>
                <Grid xs={12} md={8}>
                    <Typography variant="h6" fontWeight="bold" mb={2}>Active Challenges</Typography>
                    <Stack spacing={2}>
                        {quizzes.filter((q: any) => q.isPublished).map((quiz: any) => (
                            <Card
                                key={quiz.id}
                                component={motion.div}
                                whileHover={{ scale: 1.01 }}
                                sx={{ borderRadius: 3, borderLeft: '6px solid', borderColor: 'primary.main', boxShadow: 2 }}
                            >
                                <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box>
                                        <Typography variant="subtitle2" color="primary" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>
                                            {quiz.subject?.name || 'Academic Subject'}
                                        </Typography>
                                        <Typography variant="h6" fontWeight="bold">{quiz.title}</Typography>
                                        <Stack direction="row" spacing={2} mt={1}>
                                            <Box display="flex" alignItems="center" gap={0.5}>
                                                <Timer sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                <Typography variant="caption" color="text.secondary">{quiz.timeLimit} Minutes</Typography>
                                            </Box>
                                            <Box display="flex" alignItems="center" gap={0.5}>
                                                <QuestionAnswer sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                <Typography variant="caption" color="text.secondary">{quiz._count.questions} Questions</Typography>
                                            </Box>
                                        </Stack>
                                    </Box>
                                    <Button
                                        variant="contained"
                                        onClick={() => router.push(`/dashboard/learner/quizzes/${quiz.id}`)}
                                        sx={{ borderRadius: 2, px: 4 }}
                                    >
                                        Start Quiz
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                        {quizzes.filter((q: any) => q.isPublished).length === 0 && (
                            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 4, bgcolor: 'action.hover' }}>
                                <Typography color="text.secondary">No active quizzes at the moment. Take a break!</Typography>
                            </Paper>
                        )}
                    </Stack>
                </Grid>

                <Grid xs={12} md={4}>
                    <Typography variant="h6" fontWeight="bold" mb={2}>Performance Stats</Typography>
                    <Card sx={{ borderRadius: 4, mb: 3 }}>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" mb={2}>
                                <Typography variant="body2">Completed</Typography>
                                <Typography variant="h6" fontWeight="bold">12</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between" mb={2}>
                                <Typography variant="body2">Avg Score</Typography>
                                <Typography variant="h6" fontWeight="bold" color="success.main">84%</Typography>
                            </Box>
                            <Divider sx={{ my: 1 }} />
                            <Button fullWidth size="small" sx={{ mt: 1 }}>Detailed Insights</Button>
                        </CardContent>
                    </Card>

                    <Box mb={3}>
                        <Typography variant="subtitle2" fontWeight="bold" mb={1} display="flex" alignItems="center" gap={1}>
                            <AutoAwesome color="primary" fontSize="small" /> AI Recommendations
                        </Typography>
                        <Paper sx={{ p: 2, borderRadius: 3, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="caption" display="block" color="primary" fontWeight="bold" gutterBottom>
                                FOCUS AREA: GENETICS
                            </Typography>
                            <Typography variant="body2">
                                Based on your last Biology quiz, we suggest reviewing <strong>Punnett Squares</strong> and <strong>Mendelian Inheritance</strong> before the next assessment.
                            </Typography>
                        </Paper>
                    </Box>

                    <Paper sx={{ p: 3, borderRadius: 4, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>Did you know?</Typography>
                        <Typography variant="body2">
                            Retrieval practice like these quizzes is the most effective way to strengthen long-term memory.
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
}
