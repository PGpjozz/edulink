'use client';

import { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Card,
    CardContent,
    Stack,
    Chip,
    Divider,
    CircularProgress,
    Alert
} from '@mui/material';
import {
    AutoAwesome,
    TrendingUp,
    Lightbulb,
    WarningAmber
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface AIInsightsSectionProps {
    childId?: string;
}

export default function AIInsightsSection({ childId }: AIInsightsSectionProps) {
    const [insight, setInsight] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const generateInsight = async () => {
        setLoading(true);
        setError('');
        try {
            const url = childId ? `/api/learner/insights?childId=${childId}` : '/api/learner/insights';
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to generate insights');
            const data = await res.json();
            setInsight(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={1}>
                    <AutoAwesome color="primary" />
                    <Typography variant="h5" fontWeight="bold">AI Academic Advisor</Typography>
                </Box>
                <Button
                    variant="contained"
                    onClick={generateInsight}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AutoAwesome />}
                    sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        background: 'linear-gradient(45deg, #1976d2, #9c27b0)'
                    }}
                >
                    {insight ? 'Regenerate Analysis' : 'Analyze My Performance'}
                </Button>
            </Box>

            <AnimatePresence mode="wait">
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {insight ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={8}>
                                <Paper sx={{ p: 4, borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
                                    <Box sx={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
                                        <AutoAwesome sx={{ fontSize: 120 }} />
                                    </Box>

                                    <Typography variant="h6" color="primary" gutterBottom fontWeight="bold">
                                        Executive Summary
                                    </Typography>
                                    <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                                        {insight.summary}
                                    </Typography>

                                    <Divider sx={{ my: 3 }} />

                                    <Stack direction="row" spacing={2} mb={3}>
                                        <Box flex={1}>
                                            <Typography variant="subtitle2" display="flex" alignItems="center" gap={1} mb={1} color="success.main">
                                                <Lightbulb fontSize="small" /> Key Strengths
                                            </Typography>
                                            <Box display="flex" flexWrap="wrap" gap={1}>
                                                {insight.strengths.map((s: string, i: number) => (
                                                    <Chip key={i} label={s} size="small" color="success" variant="outlined" />
                                                ))}
                                            </Box>
                                        </Box>
                                        <Box flex={1}>
                                            <Typography variant="subtitle2" display="flex" alignItems="center" gap={1} mb={1} color="warning.main">
                                                <WarningAmber fontSize="small" /> Attention Areas
                                            </Typography>
                                            <Box display="flex" flexWrap="wrap" gap={1}>
                                                {insight.weaknesses.map((w: string, i: number) => (
                                                    <Chip key={i} label={w} size="small" color="warning" variant="outlined" />
                                                ))}
                                            </Box>
                                        </Box>
                                    </Stack>

                                    <Paper sx={{ p: 2, bgcolor: 'primary.50', borderLeft: '4px solid', borderColor: 'primary.main' }}>
                                        <Typography variant="subtitle2" color="primary" fontWeight="bold">Actionable Suggestion:</Typography>
                                        <Typography variant="body2">{insight.recommendation}</Typography>
                                    </Paper>
                                </Paper>
                            </Grid>

                            <Grid item xs={12} md={4}>
                                <Card sx={{ borderRadius: 3 }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom fontWeight="bold">AI Metadata</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                                            Engine: {insight.generatedBy}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            Last Analysis: {new Date().toLocaleString()}
                                        </Typography>
                                        <Divider sx={{ my: 2 }} />
                                        <Typography variant="body2" color="text.secondary">
                                            This analysis is generated based on assessment scores, attendance patterns, and grade trends.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </motion.div>
                ) : !loading && (
                    <Box textAlign="center" py={8} component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <AutoAwesome sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                            Your AI Academic Advisor is ready to analyze your data.
                        </Typography>
                        <Typography variant="body2" color="text.disabled">
                            Click the button above to generate your termly performance insight.
                        </Typography>
                    </Box>
                )}
            </AnimatePresence>
        </Box>
    );
}

import { Grid } from '@mui/material';
