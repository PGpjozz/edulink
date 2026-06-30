'use client';

import { useEffect, useState } from 'react';
import { Box, Container, Typography, Paper, CircularProgress, Alert } from '@mui/material';
import AnalyticsChart from '@/app/components/AnalyticsChart';

export default function HodAnalyticsPage() {
    const [data, setData] = useState<{ name: string; value: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/school/analytics')
            .then((r) => {
                if (!r.ok) throw new Error('Failed to load analytics');
                return r.json();
            })
            .then((json) => {
                const trend = json?.academic?.trend ?? [];
                const chart = Array.isArray(trend)
                    ? trend.map((item: { month?: string; value?: number }) => ({
                        name: item.month ?? '—',
                        value: item.value ?? 0,
                    }))
                    : [];
                setData(chart);
            })
            .catch(() => {
                setError('Could not load department analytics.');
                setData([]);
            })
            .finally(() => setLoading(false));
    }, []);

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                Department analytics
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 4 }}>
                Performance trends for subjects in your department.
            </Typography>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
                {loading ? (
                    <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
                ) : error ? (
                    <Alert severity="warning">{error}</Alert>
                ) : data.length === 0 ? (
                    <Alert severity="info">No performance data available yet for your department.</Alert>
                ) : (
                    <AnalyticsChart data={data} title="Average grade by month" xKey="name" yKey="value" />
                )}
            </Paper>
        </Container>
    );
}
