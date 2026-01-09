'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Chip,
    Divider,
    CircularProgress,
    LinearProgress,
    Card,
    CardContent
} from '@mui/material';
import {
    Star,
    Warning,
    SentimentVerySatisfied,
    SentimentVeryDissatisfied
} from '@mui/icons-material';

interface BehaviorTrackerProps {
    learnerId?: string;
}

export default function BehaviorTracker({ learnerId }: BehaviorTrackerProps) {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const url = learnerId ? `/api/school/behavior?learnerId=${learnerId}` : '/api/school/behavior';
        fetch(url)
            .then(res => res.json())
            .then(data => {
                setRecords(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [learnerId]);

    if (loading) return <CircularProgress />;

    const totalMerits = records.filter(r => r.type === 'MERIT').reduce((sum, r) => sum + r.points, 0);
    const totalDemerits = records.filter(r => r.type === 'DEMERIT').reduce((sum, r) => sum + r.points, 0);
    const netPoints = totalMerits - totalDemerits;

    return (
        <Box>
            <Grid container spacing={2} mb={3}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: 'success.light', color: 'white' }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="subtitle2">Total Merits</Typography>
                            <Typography variant="h4" fontWeight="bold">+{totalMerits}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: 'error.light', color: 'white' }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="subtitle2">Total Demerits</Typography>
                            <Typography variant="h4" fontWeight="bold">-{totalDemerits}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: netPoints >= 0 ? 'primary.main' : 'warning.main', color: 'white' }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="subtitle2">Net Behavior Standing</Typography>
                            <Typography variant="h4" fontWeight="bold">{netPoints}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>Behavior Log</Typography>
                <Divider sx={{ mb: 2 }} />
                <List>
                    {records.map((record) => (
                        <ListItem key={record.id} divider>
                            <ListItemIcon>
                                {record.type === 'MERIT' ? <Star color="success" /> : <Warning color="error" />}
                            </ListItemIcon>
                            <ListItemText
                                primary={record.reason}
                                secondary={`By ${record.teacher.firstName} ${record.teacher.lastName} • ${record.category} • ${new Date(record.createdAt).toLocaleDateString()}`}
                            />
                            <Chip
                                label={`${record.type === 'MERIT' ? '+' : '-'}${record.points}`}
                                color={record.type === 'MERIT' ? 'success' : 'error'}
                                size="small"
                                sx={{ fontWeight: 'bold' }}
                            />
                        </ListItem>
                    ))}
                    {records.length === 0 && (
                        <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                            Clean behavior record. Keep it up!
                        </Typography>
                    )}
                </List>
            </Paper>
        </Box>
    );
}

import { Grid } from '@mui/material';
