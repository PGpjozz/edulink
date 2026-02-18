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
    LinearProgress
} from '@mui/material';
import {
    ReceiptLong,
    Payment as PlanIcon,
    CheckCircle,
    Warning,
    CreditCard,
    Info,
    CheckCircleOutline,
    ErrorOutline,
    School as SchoolIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { motion } from 'framer-motion';

const TIER_LIMITS = {
    SMALL: 100,
    MEDIUM: 500,
    LARGE: Infinity
};

export default function SchoolSubscription() {
    const [school, setSchool] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState<string | null>(null);
    const [message, setMessage] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/school/subscription');
            const data = await res.json();
            setSchool(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handlePay = async (billingId: string) => {
        setPaying(billingId);
        try {
            const res = await fetch('/api/school/subscription', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ billingId })
            });
            if (res.ok) {
                setMessage('Payment simulated successfully!');
                fetchData();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setPaying(null);
        }
    };

    if (loading) return <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>;

    const learnerCount = school?._count?.users || 0;
    const tierLimit = TIER_LIMITS[school?.tier as keyof typeof TIER_LIMITS] || 100;
    const usagePercent = Math.min(100, (learnerCount / tierLimit) * 100);

    const columns: GridColDef[] = [
        { field: 'createdAt', headerName: 'Invoiced Date', width: 150, valueFormatter: (value: any) => new Date(value).toLocaleDateString() },
        { field: 'totalAmount', headerName: 'Amount', width: 130, valueFormatter: (value: any) => `R ${Number(value).toFixed(2)}` },
        {
            field: 'status', headerName: 'Status', width: 150,
            renderCell: (params) => (
                <Chip
                    label={params.value}
                    color={params.value === 'ACTIVE' ? 'success' : 'warning'}
                    variant="outlined"
                    size="small"
                />
            )
        },
        {
            field: 'actions', headerName: 'Actions', width: 150,
            renderCell: (params) => (
                <Button
                    size="small"
                    variant="contained"
                    disabled={params.row.status === 'ACTIVE' || paying === params.row.id}
                    onClick={() => handlePay(params.row.id)}
                    startIcon={<CreditCard />}
                >
                    {params.row.status === 'ACTIVE' ? 'Paid' : (paying === params.row.id ? '...' : 'Pay Now')}
                </Button>
            )
        }
    ];

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }} component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Box mb={4}>
                <Typography variant="h4" fontWeight="bold">SaaS Subscription</Typography>
                <Typography color="text.secondary">Manage your EduLink platform license and billing.</Typography>
            </Box>

            {message && <Alert severity="success" sx={{ mb: 4 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Grid container spacing={3}>
                {/* Plan Overview */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
                        <Box sx={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
                            <SchoolIcon sx={{ fontSize: 150 }} />
                        </Box>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6" fontWeight="bold">Current Plan</Typography>
                                <Chip label={school.tier} color="primary" sx={{ fontWeight: 'bold' }} />
                            </Box>
                            <Typography variant="h3" fontWeight="bold" gutterBottom>
                                R {school.monthlyFee || 0} <Typography component="span" variant="subtitle1" color="text.secondary">/month</Typography>
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <Box mb={2}>
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography variant="body2">Learner Usage</Typography>
                                    <Typography variant="body2" fontWeight="bold">{learnerCount} / {tierLimit === Infinity ? 'Unlimited' : tierLimit}</Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={usagePercent}
                                    sx={{ height: 10, borderRadius: 5, bgcolor: 'grey.100' }}
                                    color={usagePercent > 90 ? 'error' : 'primary'}
                                />
                                {usagePercent > 90 && (
                                    <Typography variant="caption" color="error" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                        <Warning sx={{ fontSize: 14, mr: 0.5 }} /> Near tier limit!
                                    </Typography>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Status Card */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight="bold" gutterBottom>Platform Status</Typography>
                            <Stack direction="row" spacing={2} alignItems="center" mt={2}>
                                {school.isActive ? (
                                    <>
                                        <CheckCircleOutline sx={{ color: 'success.main', fontSize: 40 }} />
                                        <Box>
                                            <Typography variant="h6" color="success.main">Active</Typography>
                                            <Typography variant="body2" color="text.secondary">Your account is in good standing.</Typography>
                                        </Box>
                                    </>
                                ) : (
                                    <>
                                        <ErrorOutline sx={{ color: 'error.main', fontSize: 40 }} />
                                        <Box>
                                            <Typography variant="h6" color="error.main">Inactive/Past Due</Typography>
                                            <Typography variant="body2" color="text.secondary">Please settle outstanding invoices.</Typography>
                                        </Box>
                                    </>
                                )}
                            </Stack>
                            <Box mt={4} p={2} sx={{ bgcolor: 'info.lighter', borderRadius: 2, display: 'flex', gap: 2 }}>
                                <Info color="info" />
                                <Typography variant="body2">
                                    Billing is monthly. Overages are charged at R10 per student beyond your tier limit.
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Billing History */}
                <Grid size={{ xs: 12 }}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ p: 1 }}>EduLink Invoices</Typography>
                        <Box sx={{ height: 400, width: '100%' }}>
                            <DataGrid
                                rows={school.billings || []}
                                columns={columns}
                                disableRowSelectionOnClick
                            />
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
}
