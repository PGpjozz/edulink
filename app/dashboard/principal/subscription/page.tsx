'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    Paper,
    Chip,
    Divider,
    Stack,
    CircularProgress,
    Alert,
    LinearProgress,
    List,
    ListItem,
    ListItemText,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
} from '@mui/material';
import {
    Warning,
    CreditCard,
    CheckCircleOutline,
    ErrorOutline,
    OpenInNew,
    TrendingUp,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { motion } from 'framer-motion';
import PayFastRedirect from '@/app/components/PayFastRedirect';
import { startPayFastCheckout } from '@/lib/payfast-client';

type SubscriptionData = {
    school: {
        name: string;
        tier: string;
        isActive: boolean;
        subscriptionStatus: string;
        trialEndsAt: string | null;
        currentPeriodEnd: string | null;
    };
    pricing: {
        effectiveMonthlyFee: number;
        tierDefaultFee: number;
        learnerLimit: number | null;
        overagePerLearner: number;
        planLabel: string;
        planDescription: string;
        features: { key: string; label: string }[];
    };
    usage: { learnerCount: number; usagePercent: number; atLimit: boolean };
    estimate: {
        baseAmount: number;
        extraLearners: number;
        extraAmount: number;
        totalAmount: number;
    };
    openBill: { id: string; totalAmount: number } | null;
    trialDaysLeft: number | null;
    statusLabel: string;
    billings: any[];
    upgradeTiers: {
        tier: string;
        label: string;
        defaultMonthlyFee: number;
        learnerLimit: number | null;
        features: string[];
    }[];
};

export default function SchoolSubscription() {
    const [data, setData] = useState<SubscriptionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [payfast, setPayfast] = useState<{ action: string; fields: Record<string, string> } | null>(null);
    const [upgradeOpen, setUpgradeOpen] = useState(false);
    const [upgradeTier, setUpgradeTier] = useState('');
    const [upgradeNotes, setUpgradeNotes] = useState('');
    const [upgrading, setUpgrading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/school/subscription');
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to load subscription');
            setData(json);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handlePay = async (billingId: string) => {
        setPaying(billingId);
        setMessage('');
        try {
            const result = await startPayFastCheckout(
                { type: 'SCHOOL_SUBSCRIPTION', billingId },
                (d) => setPayfast({ action: d.action, fields: d.fields }),
                async () => {
                    const res = await fetch('/api/school/subscription', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ billingId }),
                    });
                    if (res.ok) {
                        setMessage('Payment simulated (PayFast not configured).');
                        fetchData();
                    }
                },
            );
            if (!result.ok) setError(result.error || 'Payment failed');
        } catch {
            setError('Payment failed');
        } finally {
            setPaying(null);
        }
    };

    const submitUpgrade = async () => {
        if (!upgradeTier) return;
        setUpgrading(true);
        setError('');
        try {
            const res = await fetch('/api/school/subscription/upgrade-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tier: upgradeTier, notes: upgradeNotes }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Request failed');
            setMessage(json.message);
            setUpgradeOpen(false);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setUpgrading(false);
        }
    };

    if (payfast) {
        return <PayFastRedirect action={payfast.action} fields={payfast.fields} />;
    }

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" py={10}>
                <CircularProgress />
            </Box>
        );
    }

    if (!data) {
        return <Alert severity="error">{error || 'Failed to load subscription'}</Alert>;
    }

    const { school, pricing, usage, estimate, billings, upgradeTiers } = data;
    const limitLabel = pricing.learnerLimit === null ? 'Unlimited' : String(pricing.learnerLimit);

    const columns: GridColDef[] = [
        {
            field: 'periodLabel',
            headerName: 'Billing period',
            flex: 1,
            minWidth: 180,
        },
        {
            field: 'totalAmount',
            headerName: 'Amount',
            width: 120,
            valueFormatter: (v) => `R ${Number(v).toFixed(2)}`,
        },
        {
            field: 'baseAmount',
            headerName: 'Base',
            width: 100,
            valueFormatter: (v) => `R ${Number(v).toFixed(2)}`,
        },
        {
            field: 'extraAmount',
            headerName: 'Overage',
            width: 100,
            valueFormatter: (v) => (Number(v) > 0 ? `R ${Number(v).toFixed(2)}` : '—'),
        },
        {
            field: 'statusLabel',
            headerName: 'Status',
            width: 110,
            renderCell: (p) => (
                <Chip
                    label={p.value}
                    color={p.row.status === 'ACTIVE' ? 'success' : 'warning'}
                    size="small"
                    variant="outlined"
                />
            ),
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 220,
            sortable: false,
            renderCell: (p) => (
                <Stack direction="row" spacing={1}>
                    <Button
                        size="small"
                        variant="contained"
                        disabled={p.row.status === 'ACTIVE' || paying === p.row.id}
                        onClick={() => handlePay(p.row.id)}
                        startIcon={<CreditCard />}
                    >
                        {p.row.status === 'ACTIVE' ? 'Paid' : paying === p.row.id ? '…' : 'Pay'}
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        href={p.row.invoiceUrl}
                        target="_blank"
                        startIcon={<OpenInNew />}
                    >
                        Invoice
                    </Button>
                </Stack>
            ),
        },
    ];

    const statusColor =
        school.subscriptionStatus === 'ACTIVE' || school.subscriptionStatus === 'TRIALING'
            ? 'success'
            : school.subscriptionStatus === 'PAST_DUE'
              ? 'warning'
              : 'error';

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }} component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Box mb={4} display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">
                        SaaS Subscription
                    </Typography>
                    <Typography color="text.secondary">
                        Manage your BrightCampus platform license and billing.
                    </Typography>
                </Box>
                {upgradeTiers.length > 0 && (
                    <Button variant="outlined" startIcon={<TrendingUp />} onClick={() => setUpgradeOpen(true)}>
                        Request plan upgrade
                    </Button>
                )}
            </Box>

            {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            {data.trialDaysLeft !== null && (
                <Alert severity={data.trialDaysLeft <= 3 ? 'warning' : 'info'} sx={{ mb: 3 }}>
                    {data.trialDaysLeft > 0
                        ? `Free trial — ${data.trialDaysLeft} day(s) remaining. Your first invoice will be issued after the trial.`
                        : 'Your free trial has ended. Please pay any outstanding invoice to keep your school active.'}
                </Alert>
            )}

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6" fontWeight="bold">
                                    {pricing.planLabel} plan
                                </Typography>
                                <Chip label={school.tier} color="primary" size="small" />
                            </Box>
                            <Typography variant="h3" fontWeight="bold" gutterBottom>
                                R {pricing.effectiveMonthlyFee.toLocaleString()}
                                <Typography component="span" variant="subtitle1" color="text.secondary">
                                    {' '}
                                    /month
                                </Typography>
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                {pricing.planDescription}
                                {pricing.effectiveMonthlyFee !== pricing.tierDefaultFee && (
                                    <> · Custom rate (tier default R{pricing.tierDefaultFee})</>
                                )}
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <Box mb={2}>
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography variant="body2">Active learners</Typography>
                                    <Typography variant="body2" fontWeight="bold">
                                        {usage.learnerCount} / {limitLabel}
                                    </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={pricing.learnerLimit ? usage.usagePercent : 0}
                                    sx={{ height: 10, borderRadius: 5 }}
                                    color={usage.atLimit ? 'error' : 'primary'}
                                />
                                {usage.atLimit && (
                                    <Typography variant="caption" color="error" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                        <Warning sx={{ fontSize: 14, mr: 0.5 }} /> Learner limit reached — upgrade your plan
                                    </Typography>
                                )}
                            </Box>
                            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                                Included features
                            </Typography>
                            <Stack direction="row" gap={0.5} flexWrap="wrap">
                                {pricing.features.map((f) => (
                                    <Chip key={f.key} label={f.label} size="small" variant="outlined" />
                                ))}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight="bold" gutterBottom>
                                Subscription status
                            </Typography>
                            <Stack direction="row" spacing={2} alignItems="center" mt={2}>
                                {school.isActive && school.subscriptionStatus !== 'SUSPENDED' ? (
                                    <CheckCircleOutline color="success" sx={{ fontSize: 40 }} />
                                ) : (
                                    <ErrorOutline color="error" sx={{ fontSize: 40 }} />
                                )}
                                <Box>
                                    <Typography variant="h6" color={`${statusColor}.main`}>
                                        {data.statusLabel}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {school.currentPeriodEnd
                                            ? `Current period ends ${new Date(school.currentPeriodEnd).toLocaleDateString('en-ZA')}`
                                            : school.subscriptionStatus === 'TRIALING'
                                              ? 'Trial period active'
                                              : 'Manage payment below'}
                                    </Typography>
                                </Box>
                            </Stack>

                            <Paper variant="outlined" sx={{ p: 2, mt: 3, bgcolor: 'action.hover' }}>
                                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                                    Estimated next invoice
                                </Typography>
                                <List dense disablePadding>
                                    <ListItem disableGutters>
                                        <ListItemText primary="Platform fee" secondary={`R ${estimate.baseAmount.toFixed(2)}`} />
                                    </ListItem>
                                    {estimate.extraLearners > 0 && (
                                        <ListItem disableGutters>
                                            <ListItemText
                                                primary={`Learner overage (${estimate.extraLearners} × R${pricing.overagePerLearner})`}
                                                secondary={`R ${estimate.extraAmount.toFixed(2)}`}
                                            />
                                        </ListItem>
                                    )}
                                    <ListItem disableGutters>
                                        <ListItemText
                                            primary={<Typography fontWeight={700}>Estimated total</Typography>}
                                            secondary={`R ${estimate.totalAmount.toFixed(2)}`}
                                        />
                                    </ListItem>
                                </List>
                                <Typography variant="caption" color="text.secondary">
                                    Overage applies above {limitLabel} learners at R{pricing.overagePerLearner}/learner.
                                </Typography>
                            </Paper>

                            {data.openBill && (
                                <Button
                                    fullWidth
                                    variant="contained"
                                    sx={{ mt: 2 }}
                                    onClick={() => handlePay(data.openBill!.id)}
                                    disabled={paying === data.openBill.id}
                                >
                                    Pay open invoice — R {data.openBill.totalAmount.toFixed(2)}
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ p: 1 }}>
                            BrightCampus invoices
                        </Typography>
                        <Box sx={{ height: 420, width: '100%' }}>
                            <DataGrid rows={billings} columns={columns} getRowId={(r) => r.id} disableRowSelectionOnClick />
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            <Dialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Request plan upgrade</DialogTitle>
                <DialogContent>
                    <TextField
                        select
                        fullWidth
                        label="Requested plan"
                        value={upgradeTier}
                        onChange={(e) => setUpgradeTier(e.target.value)}
                        sx={{ mt: 1, mb: 2 }}
                    >
                        {upgradeTiers.map((t) => (
                            <MenuItem key={t.tier} value={t.tier}>
                                {t.label} — R{t.defaultMonthlyFee}/mo
                                {t.learnerLimit ? ` · up to ${t.learnerLimit} learners` : ' · unlimited'}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        fullWidth
                        multiline
                        minRows={2}
                        label="Notes (optional)"
                        value={upgradeNotes}
                        onChange={(e) => setUpgradeNotes(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setUpgradeOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={submitUpgrade} disabled={!upgradeTier || upgrading}>
                        {upgrading ? 'Submitting…' : 'Submit request'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
