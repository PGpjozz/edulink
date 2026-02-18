'use client';

import { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Box,
    Paper,
    Grid,
    Card,
    CardContent,
    Button,
    Chip,
    CircularProgress,
    Stack,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    MenuBook,
    FileDownload,
    Assignment,
    ChevronRight,
    Refresh
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function TeacherGradebook() {
    type SubjectSummary = { id: string; name: string; grade: string; code?: string; _count?: { assessments?: number; quizzes?: number } };
    const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchGradebookData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/subjects');
            const data: SubjectSummary[] = await res.json();
            setSubjects(data);
        } catch (err) {
            console.error('Failed to fetch gradebook subjects:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGradebookData();
    }, []);

    const exportToCSV = (subject: SubjectSummary) => {
        // Logic to export subject grades to CSV (Placeholder for now)
        console.log(`Exporting CSV for ${subject.name}`);
        alert(`Exporting grades for ${subject.name} to CSV...`);
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }} component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <MenuBook color="primary" fontSize="large" />
                        Digital Gradebook
                    </Typography>
                    <Typography color="text.secondary">Access your subjects and manage holistic academic records.</Typography>
                </Box>
                <Button startIcon={<Refresh />} onClick={fetchGradebookData}>Refresh</Button>
            </Box>

            {loading ? (
                <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>
            ) : (
                <Grid container spacing={3}>
                    {subjects.map((subject) => (
                        <Grid size={{ xs: 12, md: 6, lg: 4 }} key={subject.id}>
                            <Card
                                sx={{
                                    height: '100%',
                                    borderRadius: 3,
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                                    transition: 'transform 0.2s',
                                    '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }
                                }}
                            >
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" mb={2}>
                                        <Typography variant="h6" fontWeight="bold">{subject.name}</Typography>
                                        <Chip label={`Gr ${subject.grade}`} size="small" variant="outlined" />
                                    </Box>
                                    <Typography color="text.secondary" variant="body2" gutterBottom>
                                        {subject.code || 'No Code'}
                                    </Typography>

                                    <Paper sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                                        <Stack spacing={1}>
                                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                                <Typography variant="caption" fontWeight="bold" color="text.primary">Assessments</Typography>
                                                <Typography variant="caption">{subject._count?.assessments || 0}</Typography>
                                            </Box>
                                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                                <Typography variant="caption" fontWeight="bold" color="text.primary">Quizzes</Typography>
                                                <Typography variant="caption">{subject._count?.quizzes || 0}</Typography>
                                            </Box>
                                        </Stack>
                                    </Paper>

                                    <Box mt={3} display="flex" gap={1}>
                                        <Button
                                            variant="contained"
                                            fullWidth
                                            size="small"
                                            endIcon={<ChevronRight />}
                                            onClick={() => router.push(`/dashboard/teacher/gradebook/${subject.id}`)}
                                        >
                                            Open Grades
                                        </Button>
                                        <Tooltip title="Export CSV">
                                            <IconButton
                                                size="small"
                                                color="primary"
                                                sx={{ border: '1px solid', borderColor: 'divider' }}
                                                onClick={() => exportToCSV(subject)}
                                            >
                                                <FileDownload fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                    {subjects.length === 0 && (
                        <Grid size={{ xs: 12 }}>
                            <Box py={10} textAlign="center">
                                <Assignment sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
                                <Typography color="text.secondary">No subjects found for your profile.</Typography>
                            </Box>
                        </Grid>
                    )}
                </Grid>
            )}
        </Container>
    );
}
