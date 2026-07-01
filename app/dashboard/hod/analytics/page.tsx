'use client';

import { useEffect, useState } from 'react';
import { Box, Container, Paper, CircularProgress, Alert } from '@mui/material';
import AnalyticsChart from '@/app/components/AnalyticsChart';
import PageHeader from '@/app/components/ui/PageHeader';
import PageTransition from '@/app/components/ui/PageTransition';
import ContentPanel from '@/app/components/ui/ContentPanel';
import LoadingSkeleton from '@/app/components/ui/LoadingSkeleton';

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
        <PageTransition>
            <Container maxWidth="xl">
                <PageHeader
                    title="Department analytics"
                    subtitle="Performance trends for subjects in your department."
                    breadcrumbs={[
                        { label: 'Department', href: '/dashboard/hod' },
                        { label: 'Analytics' },
                    ]}
                />
                <ContentPanel>
                    {loading ? (
                        <LoadingSkeleton variant="list" count={4} />
                    ) : error ? (
                        <Alert severity="warning">{error}</Alert>
                    ) : data.length === 0 ? (
                        <Alert severity="info">No performance data available yet for your department.</Alert>
                    ) : (
                        <AnalyticsChart data={data} title="Average grade by month" xKey="name" yKey="value" />
                    )}
                </ContentPanel>
            </Container>
        </PageTransition>
    );
}
