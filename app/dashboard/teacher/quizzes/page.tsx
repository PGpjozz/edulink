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
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    Paper,
    ListItem,
    ListItemText,
    IconButton,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Checkbox,
    FormControlLabel,
    Stack,
    Chip,
    CircularProgress
} from '@mui/material';
import {
    Add,
    Delete,
    QuestionAnswer,
    Timer,
    Publish,
    ListAlt,
    Close,
    CheckCircle
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function QuizManager() {
    const router = useRouter();
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [openAdd, setOpenAdd] = useState(false);

    // Form state
    const [newQuiz, setNewQuiz] = useState({
        subjectId: '',
        title: '',
        description: '',
        timeLimit: 30,
        questions: [{ text: '', points: 1, options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }] }]
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [quizRes, subRes] = await Promise.all([
                fetch('/api/school/quizzes'),
                fetch('/api/subjects')
            ]);
            setQuizzes(await quizRes.json());
            setSubjects(await subRes.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const addQuestion = () => {
        setNewQuiz({
            ...newQuiz,
            questions: [...newQuiz.questions, { text: '', points: 1, options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }] }]
        });
    };

    const addOption = (qIdx: number) => {
        const updatedQuestions = [...newQuiz.questions];
        updatedQuestions[qIdx].options.push({ text: '', isCorrect: false });
        setNewQuiz({ ...newQuiz, questions: updatedQuestions });
    };

    const handleCreate = async () => {
        try {
            const res = await fetch('/api/school/quizzes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newQuiz)
            });
            if (res.ok) {
                setOpenAdd(false);
                fetchData();
                setNewQuiz({
                    subjectId: '',
                    title: '',
                    description: '',
                    timeLimit: 30,
                    questions: [{ text: '', points: 1, options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }] }]
                });
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>;

    return (
        <Container maxWidth="xl" sx={{ mt: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">Quiz Hub</Typography>
                    <Typography color="text.secondary">Create and manage high-impact interactive assessments.</Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setOpenAdd(true)}
                    sx={{ borderRadius: 2, px: 3 }}
                >
                    Create New Quiz
                </Button>
            </Box>

            <Grid container spacing={3}>
                {quizzes.map((quiz: any) => (
                    <Grid size={{ xs: 12, md: 4 }} key={quiz.id} component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Card sx={{ borderRadius: 3, boxShadow: 3, border: '1px solid', borderColor: 'divider' }}>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                    <Typography variant="h6" fontWeight="bold">{quiz.title}</Typography>
                                    <Chip
                                        label={quiz.isPublished ? 'Live' : 'Draft'}
                                        color={quiz.isPublished ? 'success' : 'default'}
                                        size="small"
                                        variant="outlined"
                                    />
                                </Box>
                                <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40, mb: 2 }}>
                                    {quiz.description || 'No description provided.'}
                                </Typography>
                                <Stack direction="row" spacing={1}>
                                    <Chip icon={<QuestionAnswer fontSize="small" />} label={`${quiz._count.questions} Qs`} size="small" variant="outlined" />
                                    <Chip icon={<Timer fontSize="small" />} label={`${quiz.timeLimit}m`} size="small" variant="outlined" />
                                    <Chip label={quiz.subject?.name || 'Academic'} size="small" color="primary" variant="outlined" />
                                </Stack>
                            </CardContent>
                            <Box p={2} pt={0} display="flex" gap={1}>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    size="small"
                                    startIcon={<ListAlt />}
                                    onClick={() => router.push(`/dashboard/teacher/quizzes/${quiz.id}/results`)}
                                >
                                    Results
                                </Button>
                                <Button variant="text" fullWidth size="small" startIcon={<Publish />}>Publish</Button>
                            </Box>
                        </Card>
                    </Grid>
                ))}
                {quizzes.length === 0 && (
                    <Grid size={{ xs: 12 }}>
                        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, bgcolor: 'action.hover' }}>
                            <QuestionAnswer sx={{ fontSize: 60, color: 'text.disabled', opacity: 0.2, mb: 2 }} />
                            <Typography variant="h6" color="text.secondary">Ready to build your first quiz?</Typography>
                            <Button variant="contained" sx={{ mt: 2 }} onClick={() => setOpenAdd(true)}>Get Started</Button>
                        </Paper>
                    </Grid>
                )}
            </Grid>

            {/* Create Quiz Dialog */}
            <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
                <DialogTitle sx={{ fontWeight: 'bold' }}>Intelligence Quiz Builder</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={3} sx={{ mt: 0.5 }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <FormControl fullWidth>
                                <InputLabel>Assign to Subject</InputLabel>
                                <Select
                                    value={newQuiz.subjectId}
                                    label="Assign to Subject"
                                    onChange={(e) => setNewQuiz({ ...newQuiz, subjectId: e.target.value })}
                                >
                                    {subjects.map((s: any) => (
                                        <MenuItem key={s.id} value={s.id}>{s.name} (Grade {s.grade})</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                label="Quiz Title"
                                placeholder="e.g. Mid-term Biology Blitz"
                                value={newQuiz.title}
                                onChange={(e) => setNewQuiz({ ...newQuiz, title: e.target.value })}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 9 }}>
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                label="Learning Objectives / Description"
                                value={newQuiz.description}
                                onChange={(e) => setNewQuiz({ ...newQuiz, description: e.target.value })}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Time Limit (min)"
                                value={newQuiz.timeLimit}
                                onChange={(e) => setNewQuiz({ ...newQuiz, timeLimit: parseInt(e.target.value) })}
                            />
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Build Questions</Typography>
                            {newQuiz.questions.map((q, qIdx) => (
                                <Paper key={qIdx} elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: 'background.default' }}>
                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 10 }}>
                                            <TextField
                                                fullWidth
                                                variant="standard"
                                                placeholder={`What is the capital of... ?`}
                                                label={`Question ${qIdx + 1}`}
                                                value={q.text}
                                                onChange={(e) => {
                                                    const updated = [...newQuiz.questions];
                                                    updated[qIdx].text = e.target.value;
                                                    setNewQuiz({ ...newQuiz, questions: updated });
                                                }}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 2 }}>
                                            <TextField
                                                fullWidth
                                                type="number"
                                                size="small"
                                                label="Pts"
                                                value={q.points}
                                                onChange={(e) => {
                                                    const updated = [...newQuiz.questions];
                                                    updated[qIdx].points = parseInt(e.target.value) || 1;
                                                    setNewQuiz({ ...newQuiz, questions: updated });
                                                }}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, mb: 1 }}>Define Options (Check the correct answer)</Typography>
                                            {q.options.map((o, oIdx) => (
                                                <Stack key={oIdx} direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                                                    <Checkbox
                                                        checked={o.isCorrect}
                                                        color="success"
                                                        onChange={(e) => {
                                                            const updated = [...newQuiz.questions];
                                                            updated[qIdx].options = updated[qIdx].options.map((opt, idx) => ({
                                                                ...opt,
                                                                isCorrect: idx === oIdx
                                                            }));
                                                            setNewQuiz({ ...newQuiz, questions: updated });
                                                        }}
                                                    />
                                                    <TextField
                                                        size="small"
                                                        fullWidth
                                                        placeholder={`Option ${oIdx + 1}`}
                                                        value={o.text}
                                                        onChange={(e) => {
                                                            const updated = [...newQuiz.questions];
                                                            updated[qIdx].options[oIdx].text = e.target.value;
                                                            setNewQuiz({ ...newQuiz, questions: updated });
                                                        }}
                                                    />
                                                    {q.options.length > 2 && (
                                                        <IconButton size="small" color="error" onClick={() => {
                                                            const updated = [...newQuiz.questions];
                                                            updated[qIdx].options.splice(oIdx, 1);
                                                            setNewQuiz({ ...newQuiz, questions: updated });
                                                        }}><Close fontSize="small" /></IconButton>
                                                    )}
                                                </Stack>
                                            ))}
                                            <Button size="small" startIcon={<Add />} onClick={() => addOption(qIdx)}>Add Possible Option</Button>
                                        </Grid>
                                    </Grid>
                                </Paper>
                            ))}
                            <Button fullWidth variant="outlined" startIcon={<Add />} onClick={addQuestion} sx={{ py: 1.5, borderStyle: 'dashed', borderRadius: 3 }}>
                                Add Next Question
                            </Button>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpenAdd(false)} color="inherit">Discard Draft</Button>
                    <Button
                        variant="contained"
                        onClick={handleCreate}
                        disabled={!newQuiz.title || !newQuiz.subjectId}
                        sx={{ px: 4, borderRadius: 2 }}
                    >
                        Publish Quiz
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
