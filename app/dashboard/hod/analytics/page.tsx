'use client';

import { useEffect, useState } from 'react';
import { Box, Container, Typography, Paper, CircularProgress } from '@mui/material';
import AnalyticsChart from '@/app/components/AnalyticsChart';

export default function HodAnalyticsPage() {
    const [data, setData] = useState<{ name: string; value: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/school/analytics')
            .then((r) => r.json())
            .then((json) => {
                const chart = json?.gradeDistribution || json?.byGrade || [];
                setData(Array.isArray(chart) ? chart : []);
            })
            .catch(() => setData([]))
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
                ) : (
                    <AnalyticsChart data={data} title="Learners by grade (department scope)" xKey="name" yKey="value" />
                )}
            </Paper>
        </Container>
    );
}
