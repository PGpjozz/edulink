'use client';

import { useEffect, useState } from 'react';
import { Box, Container, Alert, Grid } from '@mui/material';
import AnalyticsChart from '@/app/components/AnalyticsChart';
import PageHeader from '@/app/components/ui/PageHeader';
import PageTransition from '@/app/components/ui/PageTransition';
import ContentPanel from '@/app/components/ui/ContentPanel';
import LoadingSkeleton from '@/app/components/ui/LoadingSkeleton';
import StatCard from '@/app/components/ui/StatCard';

type AnalyticsData = {
    scope: string;
    academic: { trend: { month: string; value: number }[] };
    subjectPerformance: { name: string; fullName: string; average: number | null }[];
    behavior: { name: string; value: number }[];
};

export default function HodAnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/hod/analytics')
            .then((r) => {
                if (!r.ok) throw new Error('Failed to load analytics');
                return r.json();
            })
            .then(setData)
            .catch(() => setError('Could not load department analytics.'))
            .finally(() => setLoading(false));
    }, []);

    const trend = data?.academic?.trend ?? [];
    const subjects = data?.subjectPerformance ?? [];

    return (
        <PageTransition>
            <Container maxWidth="xl">
                <PageHeader
                    title="Department analytics"
                    subtitle="Performance trends scoped to your department subjects and learners."
                    breadcrumbs={[
                        { label: 'Department', href: '/dashboard/hod' },
                        { label: 'Analytics' },
                    ]}
                />

                {loading ? (
                    <LoadingSkeleton variant="list" count={4} />
                ) : error ? (
                    <Alert severity="warning">{error}</Alert>
                ) : (
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <StatCard label="Scope" value={data?.scope === 'department' ? 'Department' : 'School'} subtitle="Data filter" />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <StatCard
                                label="Subjects tracked"
                                value={subjects.length}
                                subtitle="With graded assessments"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <StatCard
                                label="Dept. average"
                                value={
                                    subjects.length
                                        ? `${Math.round(subjects.reduce((s, x) => s + (x.average ?? 0), 0) / subjects.length)}%`
                                        : '—'
                                }
                                subtitle="Across department subjects"
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <ContentPanel title="Average grade by month">
                                {trend.length === 0 ? (
                                    <Alert severity="info">No performance data available yet for your department.</Alert>
                                ) : (
                                    <AnalyticsChart data={trend} title="" xKey="month" yKey="value" />
                                )}
                            </ContentPanel>
                        </Grid>
                        {subjects.length > 0 && (
                            <Grid size={{ xs: 12 }}>
                                <ContentPanel title="Subject averages">
                                    <AnalyticsChart
                                        data={subjects.map((s) => ({ name: s.name, value: s.average ?? 0 }))}
                                        title=""
                                        xKey="name"
                                        yKey="value"
                                    />
                                </ContentPanel>
                            </Grid>
                        )}
                    </Grid>
                )}
            </Container>
        </PageTransition>
    );
}
