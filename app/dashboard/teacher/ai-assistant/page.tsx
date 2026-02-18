'use client';

import { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Box,
    Paper,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    TextField,
    CircularProgress,
    Stack,
    Chip,
    Divider,
    Alert
} from '@mui/material';
import {
    AutoAwesome,
    Person,
    School,
    MenuBook,
    ContentCopy,
    Refresh
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIAssistant() {
    const [learners, setLearners] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    // Selection state
    const [selectedLearner, setSelectedLearner] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [tone, setTone] = useState('professional');
    const [result, setResult] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [lRes, sRes] = await Promise.all([
                    fetch('/api/school/learners'),
                    fetch('/api/subjects')
                ]);
                setLearners(await lRes.json());
                setSubjects(await sRes.json());
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleGenerate = async () => {
        setGenerating(true);
        setResult(null);
        try {
            const res = await fetch('/api/ai/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ learnerId: selectedLearner, subjectId: selectedSubject, tone })
            });
            const data = await res.json();
            setResult(data);
        } catch (err) {
            console.error(err);
        } finally {
            setGenerating(false);
        }
    };

    const copyToClipboard = () => {
        if (result?.comment) {
            navigator.clipboard.writeText(result.comment);
        }
    };

    if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>;

    return (
        <Container maxWidth="lg" sx={{ mt: 4, pb: 8 }}>
            <Box mb={4}>
                <Typography variant="h4" fontWeight="bold">AI Academic Assistant</Typography>
                <Typography color="text.secondary">Agentic tools to empower your teaching and administrative tasks.</Typography>
            </Box>

            <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 5 }}>
                    <Paper sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>Report Comment Generator</Typography>
                        <Typography variant="body2" color="text.secondary" mb={4}>
                            Generate personalized feedback based on student scores and attendance.
                        </Typography>

                        <Stack spacing={3}>
                            <FormControl fullWidth>
                                <InputLabel>Select Student</InputLabel>
                                <Select
                                    value={selectedLearner}
                                    label="Select Student"
                                    onChange={(e) => setSelectedLearner(e.target.value)}
                                >
                                    {learners.map((l: any) => (
                                        <MenuItem key={l.id} value={l.id}>{l.user.firstName} {l.user.lastName}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl fullWidth>
                                <InputLabel>Subject</InputLabel>
                                <Select
                                    value={selectedSubject}
                                    label="Subject"
                                    onChange={(e) => setSelectedSubject(e.target.value)}
                                >
                                    {subjects.map((s: any) => (
                                        <MenuItem key={s.id} value={s.id}>{s.name} (Gr {s.grade})</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl fullWidth>
                                <InputLabel>Comment Tone</InputLabel>
                                <Select
                                    value={tone}
                                    label="Comment Tone"
                                    onChange={(e) => setTone(e.target.value)}
                                >
                                    <MenuItem value="professional">Professional & Formal</MenuItem>
                                    <MenuItem value="encouraging">Encouraging & Personal</MenuItem>
                                    <MenuItem value="concise">Concise & Direct</MenuItem>
                                </Select>
                            </FormControl>

                            <Button
                                variant="contained"
                                size="large"
                                startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <AutoAwesome />}
                                onClick={handleGenerate}
                                disabled={generating || !selectedLearner || !selectedSubject}
                                sx={{ py: 1.5, borderRadius: 3 }}
                            >
                                Generate AI Comment
                            </Button>
                        </Stack>
                    </Paper>

                    <Alert severity="info" sx={{ mt: 3, borderRadius: 3 }}>
                        <Typography variant="caption">
                            <strong>Note:</strong> AI comments are based on recent quiz scores and attendance records from the EduLink Data Hub.
                        </Typography>
                    </Alert>
                </Grid>

                <Grid size={{ xs: 12, md: 7 }}>
                    <AnimatePresence mode="wait">
                        {result ? (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                                <Paper sx={{ p: 4, borderRadius: 4, bgcolor: 'background.paper', position: 'relative', overflow: 'hidden' }}>
                                    <Box sx={{ position: 'absolute', top: 0, right: 0, p: 1, px: 2, bgcolor: 'primary.main', color: 'primary.contrastText', borderBottomLeftRadius: 16 }}>
                                        <Typography variant="caption" fontWeight="bold">AI GENERATED</Typography>
                                    </Box>

                                    <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom>PROPOSED FEEDBACK</Typography>
                                    <Box sx={{ mt: 4, minHeight: 150 }}>
                                        <Typography variant="h6" sx={{ fontStyle: 'italic', lineHeight: 1.6, color: 'text.primary' }}>
                                            "{result.comment}"
                                        </Typography>
                                    </Box>

                                    <Divider sx={{ my: 4 }} />

                                    <Typography variant="subtitle2" gutterBottom>Data Insights Used:</Typography>
                                    <Stack direction="row" spacing={2} mb={4}>
                                        <Chip label={`Avg Score: ${Math.round(result.dataPoints.avgScore)}%`} color="success" variant="outlined" />
                                        <Chip label={`Attendance: ${Math.round(result.dataPoints.attendanceRate)}%`} color="primary" variant="outlined" />
                                        <Chip label={`${result.dataPoints.assessmentsCount} Tests`} variant="outlined" />
                                    </Stack>

                                    <Stack direction="row" spacing={2}>
                                        <Button variant="contained" startIcon={<ContentCopy />} onClick={copyToClipboard} sx={{ borderRadius: 2 }}>
                                            Copy Comment
                                        </Button>
                                        <Button variant="outlined" startIcon={<Refresh />} onClick={handleGenerate} sx={{ borderRadius: 2 }}>
                                            Regenerate
                                        </Button>
                                    </Stack>
                                </Paper>
                            </motion.div>
                        ) : (
                            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', p: 4, border: '2px dashed', borderColor: 'divider', borderRadius: 4 }}>
                                <AutoAwesome sx={{ fontSize: 80, color: 'divider', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary">Ready to assist you.</Typography>
                                <Typography variant="body2" color="text.secondary">Select a student and subject to begin generating personalized insights.</Typography>
                            </Box>
                        )}
                    </AnimatePresence>
                </Grid>
            </Grid>
        </Container>
    );
}
