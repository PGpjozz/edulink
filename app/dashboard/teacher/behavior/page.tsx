'use client';

import { useState, useEffect } from 'react';
import {
    Container,
    Box,
    Grid,
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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Autocomplete,
    Alert,
} from '@mui/material';
import { Add, TrendingUp, TrendingDown, Refresh } from '@mui/icons-material';
import { motion } from 'framer-motion';
import PageHeader from '@/app/components/ui/PageHeader';
import PageTransition from '@/app/components/ui/PageTransition';
import StatCard from '@/app/components/ui/StatCard';
import ContentPanel from '@/app/components/ui/ContentPanel';
import LoadingSkeleton from '@/app/components/ui/LoadingSkeleton';
import EmptyState from '@/app/components/ui/EmptyState';

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
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [formData, setFormData] = useState({
        learnerId: '',
        type: 'MERIT',
        category: 'ACADEMIC',
        points: 1,
        reason: '',
    });

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const [recordsRes, learnersRes] = await Promise.all([
                fetch('/api/behavior'),
                fetch('/api/learners'),
            ]);
            if (!recordsRes.ok) throw new Error(await recordsRes.text() || 'Failed to load behavior records');
            if (!learnersRes.ok) throw new Error(await learnersRes.text() || 'Failed to load learners');
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
                body: JSON.stringify(formData),
            });
            if (!res.ok) throw new Error(await res.text() || 'Failed to save behavior record');
            setDialogOpen(false);
            setSubmitSuccess(true);
            setTimeout(() => setSubmitSuccess(false), 1200);
            fetchData();
            setFormData({ learnerId: '', type: 'MERIT', category: 'ACADEMIC', points: 1, reason: '' });
        } catch (e: unknown) {
            setSubmitError(e instanceof Error ? e.message : 'Failed to save behavior record');
        }
    };

    if (loading) {
        return (
            <Container maxWidth="xl">
                <LoadingSkeleton variant="table" count={5} />
            </Container>
        );
    }

    const merits = records.filter((r) => r.type === 'MERIT').reduce((sum, r) => sum + r.points, 0);
    const demerits = records.filter((r) => r.type === 'DEMERIT').reduce((sum, r) => sum + Math.abs(r.points), 0);

    return (
        <PageTransition>
            <Container maxWidth="xl">
                <PageHeader
                    title="Behavior ledger"
                    subtitle="Track and reward student conduct with merit and demerit points."
                    breadcrumbs={[
                        { label: 'My Classroom', href: '/dashboard/teacher' },
                        { label: 'Behavior' },
                    ]}
                    actions={
                        <>
                            <Button startIcon={<Refresh />} onClick={fetchData}>Refresh</Button>
                            <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
                                Award / deduct points
                            </Button>
                        </>
                    }
                />

                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                <Grid container spacing={2} sx={{ mb: 4 }} component={motion.div} animate={submitSuccess ? { scale: [1, 1.02, 1] } : {}} transition={{ duration: 0.35 }}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <motion.div whileTap={{ scale: 0.97 }}>
                            <StatCard label="Total merits" value={merits} icon={<TrendingUp />} variant="success" />
                        </motion.div>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <motion.div whileTap={{ scale: 0.97 }}>
                            <StatCard label="Total demerits" value={demerits} icon={<TrendingDown />} variant="error" />
                        </motion.div>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <StatCard label="Net score" value={merits - demerits} />
                    </Grid>
                </Grid>

                <ContentPanel title="Recent records" noPadding>
                    {records.length === 0 ? (
                        <Box p={3}>
                            <EmptyState
                                illustration="behavior"
                                title="No behavior records yet"
                                description="Award merits for positive conduct or log demerits when needed."
                                actionLabel="Add first record"
                                onAction={() => setDialogOpen(true)}
                            />
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Learner</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Category</TableCell>
                                        <TableCell>Points</TableCell>
                                        <TableCell>Reason</TableCell>
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
                                                <Box component="span" fontWeight="bold" color={record.type === 'MERIT' ? 'success.main' : 'error.main'}>
                                                    {record.type === 'MERIT' ? '+' : ''}{record.points}
                                                </Box>
                                            </TableCell>
                                            <TableCell>{record.reason}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </ContentPanel>

                <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>Record behavioral event</DialogTitle>
                    <DialogContent>
                        {submitError && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{submitError}</Alert>}
                        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Autocomplete
                                options={learners}
                                getOptionLabel={(option) => `${option.user?.firstName ?? ''} ${option.user?.lastName ?? ''}`.trim()}
                                onChange={(_, value) => setFormData({ ...formData, learnerId: value?.id || '' })}
                                renderInput={(params) => <TextField {...params} label="Select learner" required />}
                                noOptionsText="No learners in your classes"
                            />
                            <TextField select label="Type" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                                <MenuItem value="MERIT">Merit (positive)</MenuItem>
                                <MenuItem value="DEMERIT">Demerit (negative)</MenuItem>
                            </TextField>
                            <TextField select label="Category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                                <MenuItem value="ACADEMIC">Academic excellence</MenuItem>
                                <MenuItem value="SPORT">Sporting achievement</MenuItem>
                                <MenuItem value="CONDUCT">Exemplary conduct</MenuItem>
                                <MenuItem value="ATTENDANCE">Perfect attendance</MenuItem>
                                <MenuItem value="DISCIPLINE">Disciplinary issue</MenuItem>
                            </TextField>
                            <TextField type="number" label="Points" value={formData.points} onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 1 })} />
                            <TextField label="Reason" multiline rows={3} value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button
                            variant="contained"
                            onClick={handleSubmit}
                            disabled={!formData.learnerId || !formData.reason.trim()}
                            component={motion.button}
                            whileTap={{ scale: 0.96 }}
                        >
                            Submit
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </PageTransition>
    );
}
