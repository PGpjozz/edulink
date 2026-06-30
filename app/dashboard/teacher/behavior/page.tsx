'use client';

import { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Box,
    Grid,
    Card,
    CardContent,
    Paper,
    Button,
    TextField,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Autocomplete,
    Alert
} from '@mui/material';
import {
    Add,
    TrendingUp,
    TrendingDown,
    Refresh
} from '@mui/icons-material';
import { motion } from 'framer-motion';

export default function BehaviorLedger() {
    type BehaviorRecord = {
        id: string;
        createdAt: string;
        type: 'MERIT' | 'DEMERIT';
        category: string;
        points: number;
        reason: string;
        learner?: { user?: { firstName?: string; lastName?: string } };
    };
    type LearnerSummary = { id: string; user?: { firstName?: string; lastName?: string } };
    const [records, setRecords] = useState<BehaviorRecord[]>([]);
    const [learners, setLearners] = useState<LearnerSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitError, setSubmitError] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        learnerId: '',
        type: 'MERIT',
        category: 'ACADEMIC',
        points: 1,
        reason: ''
    });

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const [recordsRes, learnersRes] = await Promise.all([
                fetch('/api/behavior'),
                fetch('/api/learners')
            ]);
            if (!recordsRes.ok) {
                throw new Error(await recordsRes.text() || 'Failed to load behavior records');
            }
            if (!learnersRes.ok) {
                throw new Error(await learnersRes.text() || 'Failed to load learners');
            }
            const recordsData: BehaviorRecord[] = await recordsRes.json();
            const learnersData: LearnerSummary[] = await learnersRes.json();
            setRecords(Array.isArray(recordsData) ? recordsData : []);
            setLearners(Array.isArray(learnersData) ? learnersData : []);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to load behavior data');
            setRecords([]);
            setLearners([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async () => {
        if (!formData.learnerId || !formData.reason.trim()) {
            setSubmitError('Please select a learner and enter a reason.');
            return;
        }
        setSubmitError('');
        try {
            const res = await fetch('/api/behavior', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'Failed to save behavior record');
            }
            setDialogOpen(false);
            fetchData();
            setFormData({ learnerId: '', type: 'MERIT', category: 'ACADEMIC', points: 1, reason: '' });
        } catch (e: unknown) {
            setSubmitError(e instanceof Error ? e.message : 'Failed to save behavior record');
        }
    };

    if (loading) return <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>;

    const merits = records.filter(r => r.type === 'MERIT').reduce((sum, r) => sum + r.points, 0);
    const demerits = records.filter(r => r.type === 'DEMERIT').reduce((sum, r) => sum + Math.abs(r.points), 0);

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }} component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">Discipline & Behavior Ledger</Typography>
                    <Typography color="text.secondary">Track and reward student conduct with merit/demerit points.</Typography>
                </Box>
                <Box display="flex" gap={1}>
                    <Button startIcon={<Refresh />} onClick={fetchData}>Refresh</Button>
                    <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
                        Award/Deduct Points
                    </Button>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Grid container spacing={3} mb={4}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ bgcolor: 'success.main', color: 'white', borderRadius: 3 }}>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Total Merits</Typography>
                                    <Typography variant="h3" fontWeight="bold">{merits}</Typography>
                                </Box>
                                <TrendingUp sx={{ fontSize: 56, opacity: 0.3 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ bgcolor: 'error.main', color: 'white', borderRadius: 3 }}>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Total Demerits</Typography>
                                    <Typography variant="h3" fontWeight="bold">{demerits}</Typography>
                                </Box>
                                <TrendingDown sx={{ fontSize: 56, opacity: 0.3 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="body2" color="text.secondary">Net Behavioral Score</Typography>
                            <Typography variant="h3" fontWeight="bold" color="primary">
                                {merits - demerits}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Learner</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Points</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Reason</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {records.map((record) => (
                            <TableRow key={record.id} hover>
                                <TableCell>{new Date(record.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    {record.learner?.user?.firstName} {record.learner?.user?.lastName}
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={record.type}
                                        color={record.type === 'MERIT' ? 'success' : 'error'}
                                        size="small"
                                        variant="outlined"
                                    />
                                </TableCell>
                                <TableCell>{record.category}</TableCell>
                                <TableCell>
                                    <Typography fontWeight="bold" color={record.type === 'MERIT' ? 'success.main' : 'error.main'}>
                                        {record.type === 'MERIT' ? '+' : ''}{record.points}
                                    </Typography>
                                </TableCell>
                                <TableCell>{record.reason}</TableCell>
                            </TableRow>
                        ))}
                        {records.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No behavior records yet for your learners.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Record Behavioral Event</DialogTitle>
                <DialogContent>
                    {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Autocomplete
                            options={learners}
                            getOptionLabel={(option) => `${option.user?.firstName ?? ''} ${option.user?.lastName ?? ''}`.trim()}
                            onChange={(_, value) => setFormData({ ...formData, learnerId: value?.id || '' })}
                            renderInput={(params) => <TextField {...params} label="Select Learner" required />}
                            noOptionsText="No learners in your classes"
                        />
                        <TextField
                            select
                            label="Type"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        >
                            <MenuItem value="MERIT">Merit (Positive)</MenuItem>
                            <MenuItem value="DEMERIT">Demerit (Negative)</MenuItem>
                        </TextField>
                        <TextField
                            select
                            label="Category"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        >
                            <MenuItem value="ACADEMIC">Academic Excellence</MenuItem>
                            <MenuItem value="SPORT">Sporting Achievement</MenuItem>
                            <MenuItem value="CONDUCT">Exemplary Conduct</MenuItem>
                            <MenuItem value="ATTENDANCE">Perfect Attendance</MenuItem>
                            <MenuItem value="DISCIPLINE">Disciplinary Issue</MenuItem>
                        </TextField>
                        <TextField
                            type="number"
                            label="Points"
                            value={formData.points}
                            onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                        />
                        <TextField
                            label="Reason"
                            multiline
                            rows={3}
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSubmit} disabled={!formData.learnerId || !formData.reason.trim()}>
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
