'use client';

import { useEffect, useState } from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Alert,
    CircularProgress,
    Chip,
    Stack,
} from '@mui/material';
import { Download, Description, Refresh } from '@mui/icons-material';
import { getCurrentTermLabel } from '@/lib/report-generation';

type ClassOption = { id: string; name: string; grade: string; _count?: { learners: number } };
type LearnerRow = { id: string; firstName: string; lastName: string };

export default function PrincipalReportsPage() {
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [classId, setClassId] = useState('');
    const [learners, setLearners] = useState<LearnerRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingLearners, setLoadingLearners] = useState(false);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [error, setError] = useState('');
    const term = getCurrentTermLabel();

    useEffect(() => {
        fetch('/api/classes')
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => setClasses(Array.isArray(data) ? data : []))
            .catch(() => setError('Failed to load classes'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!classId) {
            setLearners([]);
            return;
        }
        setLoadingLearners(true);
        fetch(`/api/classes/${classId}/learners`)
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => setLearners(Array.isArray(data) ? data : []))
            .catch(() => setError('Failed to load learners'))
            .finally(() => setLoadingLearners(false));
    }, [classId]);

    const downloadBulk = async () => {
        if (!classId) return;
        setBulkLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/school/reports/bulk?classId=${classId}&term=${encodeURIComponent(term)}`);
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Bulk download failed');
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Reports_${classes.find((c) => c.id === classId)?.name ?? 'class'}_${term.replace(/[^a-zA-Z0-9]+/g, '_')}.zip`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Bulk download failed');
        } finally {
            setBulkLoading(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" py={10}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                Term Report Generation
            </Typography>
            <Typography color="text.secondary" mb={4}>
                Generate PDF report cards for an entire class. Teacher-saved comments from the AI Assistant are included automatically.
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Paper sx={{ p: 3, mb: 4 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
                    <FormControl fullWidth sx={{ maxWidth: 320 }}>
                        <InputLabel>Class</InputLabel>
                        <Select value={classId} label="Class" onChange={(e) => setClassId(e.target.value)}>
                            {classes.map((c) => (
                                <MenuItem key={c.id} value={c.id}>
                                    {c.name} (Grade {c.grade}) — {c._count?.learners ?? 0} learners
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Chip label={term} variant="outlined" />
                    <Button
                        variant="contained"
                        startIcon={bulkLoading ? <CircularProgress size={18} color="inherit" /> : <Download />}
                        disabled={!classId || bulkLoading || learners.length === 0}
                        onClick={downloadBulk}
                    >
                        Download All PDFs (ZIP)
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        disabled={!classId}
                        onClick={() => setClassId((id) => id)}
                    >
                        Refresh
                    </Button>
                </Stack>
            </Paper>

            {classId && (
                <Paper sx={{ overflow: 'hidden' }}>
                    <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6" fontWeight="bold">Learners</Typography>
                        {loadingLearners && <CircularProgress size={22} />}
                    </Box>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Learner</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {learners.map((learner) => (
                                <TableRow key={learner.id} hover>
                                    <TableCell>{learner.firstName} {learner.lastName}</TableCell>
                                    <TableCell align="right">
                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                component="a"
                                                href={`/dashboard/learner/report?learnerId=${learner.id}`}
                                                startIcon={<Description />}
                                            >
                                                Preview
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="contained"
                                                component="a"
                                                href={`/api/learner/report/pdf?learnerId=${learner.id}&term=${encodeURIComponent(term)}`}
                                                startIcon={<Download />}
                                            >
                                                PDF
                                            </Button>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!loadingLearners && learners.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={2}>
                                        <Typography color="text.secondary">No learners in this class.</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Paper>
            )}
        </Container>
    );
}
