'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    Button,
    Radio,
    RadioGroup,
    FormControlLabel,
    FormControl,
    Stack,
    LinearProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Paper
} from '@mui/material';
import {
    AccessTime,
    CheckCircle,
    Send,
    ArrowBack,
    ArrowForward
} from '@mui/icons-material';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
    id: string;
    text: string;
}

interface QuizQuestion {
    id: string;
    text: string;
    options: Option[];
}

interface Quiz {
    id: string;
    title: string;
    description?: string;
    timeLimit?: number;
    subject?: { name: string };
    questions: QuizQuestion[];
}

export default function QuizTaking() {
    const { id } = useParams();
    const router = useRouter();
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<{ [key: string]: string }>({});
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                const res = await fetch(`/api/school/quizzes/${id}`);
                const data = await res.json();
                setQuiz(data);
                if (data.timeLimit) setTimeLeft(data.timeLimit * 60);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchQuiz();
    }, [id]);

    useEffect(() => {
        if (timeLeft === 0) handleSubmit();
        if (timeLeft === null || timeLeft <= 0 || result) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => (prev ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, result]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const res = await fetch(`/api/school/quizzes/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers })
            });
            const data = await res.json();
            setResult(data);
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>;
    if (!quiz || !quiz.questions || quiz.questions.length === 0) return <Box p={4}><Typography>Quiz not found or has no questions.</Typography></Box>;

    if (result) return (
        <Container maxWidth="sm" sx={{ mt: 10 }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <Card sx={{ textAlign: 'center', p: 6, borderRadius: 6, boxShadow: 10, border: '1px solid', borderColor: 'divider' }}>
                    <CheckCircle sx={{ fontSize: 100, color: 'success.main', mb: 2 }} />
                    <Typography variant="h4" fontWeight="bold" gutterBottom>Assessment Complete!</Typography>
                    <Typography variant="body1" color="text.secondary">Your performance score is</Typography>
                    <Typography variant="h1" color="primary" fontWeight="900" sx={{ my: 4 }}>
                        {Math.round(result.scorePercentage)}%
                    </Typography>
                    <Button
                        variant="contained"
                        size="large"
                        fullWidth
                        onClick={() => router.push('/dashboard/learner/quizzes')}
                        sx={{ borderRadius: 3, py: 1.5 }}
                    >
                        Return to Dashboard
                    </Button>
                </Card>
            </motion.div>
        </Container>
    );

    const question = quiz.questions[currentQuestion];
    if (!question) return <Box p={4}><Typography>Question not found.</Typography></Box>;
    const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 10 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h5" fontWeight="bold">{quiz.title}</Typography>
                    <Typography variant="caption" color="text.secondary">Subject: {quiz.subject?.name}</Typography>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ bgcolor: 'action.hover', px: 2, py: 1, borderRadius: 3 }}>
                    <AccessTime color={timeLeft && timeLeft < 60 ? 'error' : 'action'} />
                    <Typography fontWeight="bold" sx={{ fontFamily: 'monospace', fontSize: '1.2rem' }}>
                        {formatTime(timeLeft || 0)}
                    </Typography>
                </Stack>
            </Box>

            <LinearProgress
                variant="determinate"
                value={progress}
                sx={{ mb: 6, height: 10, borderRadius: 5, bgcolor: 'divider' }}
            />

            <AnimatePresence mode="wait">
                <Box key={currentQuestion} component={motion.div} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                    <Paper elevation={0} sx={{ p: { xs: 3, md: 6 }, borderRadius: 5, border: '1px solid', borderColor: 'divider', minHeight: 450, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="overline" color="text.secondary" fontWeight="bold">
                            Question {currentQuestion + 1} of {quiz.questions.length}
                        </Typography>
                        <Typography variant="h4" fontWeight="bold" sx={{ mt: 1, mb: 6 }}>
                            {question.text}
                        </Typography>

                        <FormControl component="fieldset" fullWidth>
                            <RadioGroup
                                value={answers[question.id] || ''}
                                onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                            >
                                <Stack spacing={2}>
                                    {question.options.map((option: any) => (
                                        <Paper
                                            key={option.id}
                                            variant="outlined"
                                            sx={{
                                                borderRadius: 3,
                                                borderColor: answers[question.id] === option.id ? 'primary.main' : 'divider',
                                                bgcolor: answers[question.id] === option.id ? 'primary.light' : 'transparent',
                                                transition: '0.2s',
                                                '&:hover': { bgcolor: 'action.hover' }
                                            }}
                                        >
                                            <FormControlLabel
                                                value={option.id}
                                                control={<Radio sx={{ ml: 2 }} />}
                                                label={<Typography sx={{ px: 2, py: 1.5, fontWeight: 'medium' }}>{option.text}</Typography>}
                                                sx={{ m: 0, width: '100%' }}
                                            />
                                        </Paper>
                                    ))}
                                </Stack>
                            </RadioGroup>
                        </FormControl>

                        <Box sx={{ mt: 'auto', pt: 6, display: 'flex', justifyContent: 'space-between' }}>
                            <Button
                                startIcon={<ArrowBack />}
                                disabled={currentQuestion === 0}
                                onClick={() => setCurrentQuestion(prev => prev - 1)}
                                sx={{ borderRadius: 2 }}
                            >
                                Back
                            </Button>

                            {currentQuestion === quiz.questions.length - 1 ? (
                                <Box>
                                    {submitting && <CircularProgress size={24} sx={{ mr: 2, verticalAlign: 'middle' }} />}
                                    <Button
                                        variant="contained"
                                        endIcon={<Send />}
                                        disabled={submitting || !answers[question.id]}
                                        onClick={handleSubmit}
                                        sx={{ borderRadius: 3, px: 6, py: 1.5, fontSize: '1.1rem' }}
                                    >
                                        Finish Assessment
                                    </Button>
                                </Box>
                            ) : (
                                <Button
                                    variant="contained"
                                    endIcon={<ArrowForward />}
                                    disabled={!answers[question.id]}
                                    onClick={() => setCurrentQuestion(prev => prev + 1)}
                                    sx={{ borderRadius: 3, px: 6, py: 1.5 }}
                                >
                                    Continue
                                </Button>
                            )}
                        </Box>
                    </Paper>
                </Box>
            </AnimatePresence>
        </Container>
    );
}
