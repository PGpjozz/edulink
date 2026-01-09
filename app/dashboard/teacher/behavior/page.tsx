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
    Autocomplete
} from '@mui/material';
import {
    Add,
    TrendingUp,
    TrendingDown,
    Refresh
} from '@mui/icons-material';
import { motion } from 'framer-motion';

export default function BehaviorLedger() {
    const [records, setRecords] = useState([]);
    const [learners, setLearners] = useState([]);
    const [loading, setLoading] = useState(true);
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
        try {
            const [recordsRes, learnersRes] = await Promise.all([
                fetch('/api/behavior'),
                fetch('/api/learners')
            ]);
            const recordsData = await recordsRes.json();
            const learnersData = await learnersRes.json();
            setRecords(recordsData);
            setLearners(learnersData);
        } catch (err) {
            console.error('Failed to fetch behavior data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async () => {
        try {
            const res = await fetch('/api/behavior', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setDialogOpen(false);
                fetchData();
                setFormData({ learnerId: '', type: 'MERIT', category: 'ACADEMIC', points: 1, reason: '' });
            }
        } catch (err) {
            console.error('Failed to submit behavior record:', err);
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

            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} md={4}>
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
                <Grid item xs={12} md={4}>
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
                <Grid item xs={12} md={4}>
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
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Record Behavioral Event</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Autocomplete
                            options={learners}
                            getOptionLabel={(option) => `${option.user?.firstName} ${option.user?.lastName}`}
                            onChange={(_, value) => setFormData({ ...formData, learnerId: value?.id || '' })}
                            renderInput={(params) => <TextField {...params} label="Select Learner" />}
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
                    <Button variant="contained" onClick={handleSubmit}>Submit</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
