'use client';

import { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Grid,
    Paper,
    Typography,
} from '@mui/material';
import Link from 'next/link';
import { PLAN_FEATURE_LABELS, TIER_PLANS, type BillingTier } from '@/lib/provider-pricing';

type Overview = {
    kpis: {
        totalSchools: number;
        activeSchools: number;
        suspendedSchools: number;
        totalLearners: number;
        totalStaff: number;
        estimatedMrr: number;
        overdueRevenue: number;
        overdueCount: number;
        paidRevenueThisMonth: number;
        billsIssuedThisMonth: number;
        schoolsWithoutOwner: number;
    };
    overdueBills: {
        id: string;
        schoolName: string;
        totalAmount: number;
        daysOverdue: number;
    }[];
    recentSchools: { id: string; name: string; tier: string; isActive: boolean; createdAt: string }[];
};

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent>
                <Typography variant="overline" color="text.secondary">
                    {label}
                </Typography>
                <Typography variant="h4" fontWeight={800}>
                    {value}
                </Typography>
                {hint && (
                    <Typography variant="caption" color="text.secondary">
                        {hint}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
}

export default function ProviderOverviewPage() {
    const [data, setData] = useState<Overview | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        fetch('/api/provider/overview')
            .then((r) => r.json())
            .then((json) => {
                if (json.error) throw new Error(json.error);
                setData(json);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
    }, []);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" py={8}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || !data) {
        return <Alert severity="error">{error || 'Failed to load overview'}</Alert>;
    }

    const { kpis } = data;

    return (
        <Box>
            <Grid container spacing={2} mb={3}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <KpiCard label="Active schools" value={String(kpis.activeSchools)} hint={`${kpis.totalSchools} total`} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <KpiCard label="Est. MRR" value={`R ${kpis.estimatedMrr.toLocaleString()}`} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <KpiCard
                        label="Overdue"
                        value={`R ${kpis.overdueRevenue.toLocaleString()}`}
                        hint={`${kpis.overdueCount} invoice(s)`}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <KpiCard label="Learners" value={kpis.totalLearners.toLocaleString()} hint={`${kpis.totalStaff} staff`} />
                </Grid>
            </Grid>

            {(kpis.schoolsWithoutOwner > 0 || kpis.suspendedSchools > 0) && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    {kpis.schoolsWithoutOwner > 0 && `${kpis.schoolsWithoutOwner} school(s) without an owner. `}
                    {kpis.suspendedSchools > 0 && `${kpis.suspendedSchools} suspended school(s).`}
                </Alert>
            )}

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 7 }}>
                    <Paper sx={{ p: 3, borderRadius: 3 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6" fontWeight={700}>
                                Overdue subscriptions
                            </Typography>
                            <Button component={Link} href="/dashboard/provider/billing" size="small">
                                View billing
                            </Button>
                        </Box>
                        {data.overdueBills.length === 0 ? (
                            <Typography color="text.secondary">No overdue bills — great job!</Typography>
                        ) : (
                            data.overdueBills.map((bill) => (
                                <Box
                                    key={bill.id}
                                    display="flex"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    py={1}
                                    borderBottom="1px solid"
                                    borderColor="divider"
                                >
                                    <Box>
                                        <Typography fontWeight={600}>{bill.schoolName}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {bill.daysOverdue} days overdue
                                        </Typography>
                                    </Box>
                                    <Chip label={`R ${bill.totalAmount.toFixed(2)}`} color="warning" size="small" />
                                </Box>
                            ))
                        )}
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 5 }}>
                    <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                        <Typography variant="h6" fontWeight={700} gutterBottom>
                            Quick actions
                        </Typography>
                        <Box display="flex" flexDirection="column" gap={1}>
                            <Button component={Link} href="/dashboard/provider/onboard" variant="contained">
                                Onboard new school
                            </Button>
                            <Button component={Link} href="/dashboard/provider/schools" variant="outlined">
                                Manage schools
                            </Button>
                        </Box>
                    </Paper>

                    <Paper sx={{ p: 3, borderRadius: 3 }}>
                        <Typography variant="h6" fontWeight={700} gutterBottom>
                            Plan tiers
                        </Typography>
                        {(Object.keys(TIER_PLANS) as BillingTier[]).map((tier) => (
                            <Box key={tier} mb={2}>
                                <Typography fontWeight={700}>
                                    {TIER_PLANS[tier].label} — R{TIER_PLANS[tier].defaultMonthlyFee}/mo
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    {TIER_PLANS[tier].description}
                                </Typography>
                                <Typography variant="caption">
                                    {TIER_PLANS[tier].features.map((f) => PLAN_FEATURE_LABELS[f]).join(' · ')}
                                </Typography>
                            </Box>
                        ))}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
