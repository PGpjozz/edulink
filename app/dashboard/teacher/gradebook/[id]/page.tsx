'use client';

import { useState, useEffect } from 'react';
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
    Button,
    CircularProgress,
    IconButton,
    Tooltip,
    Alert
} from '@mui/material';
import { ArrowBack, FileDownload, Refresh } from '@mui/icons-material';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';

export default function MasterGradebook() {
    const router = useRouter();
    const params = useParams();
    const subjectId = params.id as string;

    type Assessment = { id: string; title: string; type: string; weight: number; totalMarks: number };
    type Learner = { id: string; user: { firstName: string; lastName: string } };
    type Grade = { learnerId: string; assessmentId: string; score: number };
    type GradebookData = { assessments: Assessment[]; learners: Learner[]; grades: Grade[] };
    const [data, setData] = useState<GradebookData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/subjects/${subjectId}/grades`);
            const json: GradebookData = await res.json();
            setData(json);
        } catch (err) {
            console.error('Error fetching master gradebook:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (subjectId) fetchData();
    }, [subjectId]);

    const getGrade = (learnerId: string, assessmentId: string) => {
        const grade = data?.grades.find((g) => g.learnerId === learnerId && g.assessmentId === assessmentId);
        return grade ? grade.score : '-';
    };

    const exportCSV = () => {
        if (!data) return;

        let csv = 'Learner,';
        csv += data.assessments.map((a) => `"${a.title}"`).join(',') + '\n';

        data.learners.forEach((l) => {
            csv += `"${l.user.firstName} ${l.user.lastName}",`;
            csv += data.assessments.map((a) => getGrade(l.id, a.id)).join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Gradebook_Export_${subjectId}.csv`;
        a.click();
    };

    if (loading) return <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>;
    if (!data) return <Alert severity="error">Failed to load data.</Alert>;

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }} component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Button startIcon={<ArrowBack />} onClick={() => router.back()} sx={{ mb: 1 }}>Back</Button>
                    <Typography variant="h4" fontWeight="bold">Master Gradebook</Typography>
                    <Typography color="text.secondary">Class performance matrix across all assessments.</Typography>
                </Box>
                <Box display="flex" gap={1}>
                    <Button startIcon={<Refresh />} onClick={fetchData}>Refresh</Button>
                    <Button variant="contained" startIcon={<FileDownload />} onClick={exportCSV}>Export CSV</Button>
                </Box>
            </Box>

            <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', overflowX: 'auto' }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', minWidth: 200 }}>Learner Name</TableCell>
                            {data.assessments.map((a) => (
                                <TableCell key={a.id} align="center" sx={{ fontWeight: 'bold', minWidth: 100 }}>
                                    <Tooltip title={`${a.type} (${a.weight}%)`}>
                                        <Box>
                                            <Typography variant="body2" fontWeight="bold">{a.title}</Typography>
                                            <Typography variant="caption" color="text.secondary">Max: {a.totalMarks}</Typography>
                                        </Box>
                                    </Tooltip>
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.learners.map((learner) => (
                            <TableRow key={learner.id} hover>
                                <TableCell sx={{ fontWeight: 'medium' }}>
                                    {learner.user.firstName} {learner.user.lastName}
                                </TableCell>
                                {data.assessments.map((a) => {
                                    const score = getGrade(learner.id, a.id);
                                    return (
                                        <TableCell key={a.id} align="center">
                                            <Typography
                                                variant="body2"
                                                fontWeight={score !== '-' ? 'bold' : 'normal'}
                                                color={score === '-' ? 'text.disabled' : 'inherit'}
                                            >
                                                {score}
                                            </Typography>
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Container>
    );
}
