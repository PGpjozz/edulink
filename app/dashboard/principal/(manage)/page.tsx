'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    Box, Typography, Button, Grid, Card, CardContent, Stack, Alert, Divider, List, ListItem, ListItemText, Chip,
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon, People, Class, MenuBook, Inventory, EventNote, Receipt } from '@mui/icons-material';
import {
    ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
} from 'recharts';
import StatCard from '@/app/components/ui/StatCard';
import ContentPanel from '@/app/components/ui/ContentPanel';
import LoadingSkeleton from '@/app/components/ui/LoadingSkeleton';
import AddClassModal from '../AddClassModal';
import AddUserModal from '../AddUserModal';
import type { OverviewResponse } from '../_components/types';
import { ASSET_CHART_COLORS, formatCurrency, getInvoiceChipColor } from '../_components/utils';

export default function PrincipalOverviewPage() {
    const router = useRouter();
    const [overview, setOverview] = useState<OverviewResponse | null>(null);
    const [overviewLoading, setOverviewLoading] = useState(false);
    const [overviewError, setOverviewError] = useState('');
    const [isClassModalOpen, setIsClassModalOpen] = useState(false);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);

    const fetchOverview = async () => {
        setOverviewLoading(true);
        setOverviewError('');
        try {
            const res = await fetch('/api/school/overview');
            if (!res.ok) throw new Error((await res.text()) || 'Failed to load overview');
            setOverview((await res.json()) as OverviewResponse);
        } catch (e: unknown) {
            setOverviewError(e instanceof Error ? e.message : 'Failed to load overview');
        } finally {
            setOverviewLoading(false);
        }
    };

    useEffect(() => {
        fetchOverview();
    }, []);

    const assetChartData = overview
        ? [
            { name: 'Available', value: overview.kpis.assets.available },
            { name: 'Checked out', value: overview.kpis.assets.checkedOut },
            { name: 'Maintenance', value: overview.kpis.assets.maintenance },
            { name: 'Lost', value: overview.kpis.assets.lost },
        ]
        : [];

    const invoiceAmountChartData = overview
        ? [
            { name: 'Pending', amount: overview.kpis.invoices.pendingAmount },
            { name: 'Overdue', amount: overview.kpis.invoices.overdueAmount },
        ]
        : [];

    return (
        <Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box>
                    <Typography variant="h6">Overview</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {overview?.lastUpdated ? `Last updated: ${new Date(overview.lastUpdated).toLocaleString()}` : ''}
                    </Typography>
                </Box>
                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchOverview} disabled={overviewLoading}>
                    Refresh
                </Button>
            </Box>

            {overviewError && <Alert severity="error" sx={{ mb: 2 }}>{overviewError}</Alert>}
            {overviewLoading && !overview && <LoadingSkeleton variant="page" />}

            {overview && (
                <Box>
                    {(overview.kpis.classesUnassigned > 0 || overview.kpis.subjectsUnassigned > 0 || overview.kpis.invoices.overdueCount > 0) && (
                        <Stack spacing={1.5} sx={{ mb: 2 }}>
                            {overview.kpis.classesUnassigned > 0 && (
                                <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => router.push('/dashboard/principal/classes')}>View classes</Button>}>
                                    {overview.kpis.classesUnassigned} class(es) are missing a class teacher.
                                </Alert>
                            )}
                            {overview.kpis.subjectsUnassigned > 0 && (
                                <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => router.push('/dashboard/principal/subjects')}>View subjects</Button>}>
                                    {overview.kpis.subjectsUnassigned} subject(s) are unassigned.
                                </Alert>
                            )}
                            {overview.kpis.invoices.overdueCount > 0 && (
                                <Alert severity="error">
                                    {overview.kpis.invoices.overdueCount} invoice(s) are overdue ({formatCurrency(overview.kpis.invoices.overdueAmount)}).
                                </Alert>
                            )}
                        </Stack>
                    )}

                    <ContentPanel title="Quick actions" sx={{ mb: 2 }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap">
                            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsClassModalOpen(true)}>Add class</Button>
                            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsUserModalOpen(true)}>Add user</Button>
                            <Button variant="outlined" onClick={() => router.push('/dashboard/principal/assets?add=1')}>Add asset</Button>
                            <Button variant="outlined" onClick={() => router.push('/dashboard/principal/finance')}>Finance</Button>
                            <Button variant="outlined" onClick={() => router.push('/dashboard/principal/analytics')}>Analytics</Button>
                            <Button variant="outlined" onClick={() => router.push('/dashboard/principal/behavior')}>Behavior</Button>
                        </Stack>
                    </ContentPanel>

                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Box onClick={() => router.push('/dashboard/principal/users')} sx={{ cursor: 'pointer', height: '100%' }}>
                                <StatCard label="Learners" value={overview.kpis.learners} icon={<People />} variant="primary" />
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Box onClick={() => router.push('/dashboard/principal/users')} sx={{ cursor: 'pointer', height: '100%' }}>
                                <StatCard label="Staff" value={overview.kpis.staff} subtitle={`Teachers: ${overview.kpis.teachers}`} icon={<People />} />
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Box onClick={() => router.push('/dashboard/principal/classes')} sx={{ cursor: 'pointer', height: '100%' }}>
                                <StatCard label="Classes" value={overview.kpis.classes} subtitle={`Unassigned: ${overview.kpis.classesUnassigned}`} icon={<Class />} />
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Box onClick={() => router.push('/dashboard/principal/subjects')} sx={{ cursor: 'pointer', height: '100%' }}>
                                <StatCard label="Subjects" value={overview.kpis.subjects} subtitle={`Unassigned: ${overview.kpis.subjectsUnassigned}`} icon={<MenuBook />} />
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Box onClick={() => router.push('/dashboard/principal/assets')} sx={{ cursor: 'pointer', height: '100%' }}>
                                <StatCard label="Assets" value={overview.kpis.assets.total} subtitle={`Available: ${overview.kpis.assets.available}`} icon={<Inventory />} />
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <StatCard label="Bookings pending" value={overview.kpis.bookingsPending} icon={<EventNote />} variant="warning" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <StatCard label="Invoices pending" value={formatCurrency(overview.kpis.invoices.pendingAmount)} icon={<Receipt />} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <StatCard label="Invoices overdue" value={formatCurrency(overview.kpis.invoices.overdueAmount)} icon={<Receipt />} variant="error" />
                        </Grid>
                    </Grid>

                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Card variant="outlined" sx={{ height: 360 }}>
                                <CardContent sx={{ height: '100%' }}>
                                    <Typography variant="subtitle1" fontWeight="bold" mb={1}>Assets status</Typography>
                                    <Box sx={{ width: '100%', height: 300 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={assetChartData} dataKey="value" nameKey="name" outerRadius={100}>
                                                    {assetChartData.map((_, i) => (
                                                        <Cell key={i} fill={ASSET_CHART_COLORS[i % ASSET_CHART_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Card variant="outlined" sx={{ height: 360 }}>
                                <CardContent sx={{ height: '100%' }}>
                                    <Typography variant="subtitle1" fontWeight="bold" mb={1}>Outstanding invoices</Typography>
                                    <Box sx={{ width: '100%', height: 300 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={invoiceAmountChartData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" />
                                                <YAxis />
                                                <RechartsTooltip />
                                                <Bar dataKey="amount" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="subtitle1" fontWeight="bold">Recent invoices</Typography>
                                    <Divider sx={{ my: 1.5 }} />
                                    {overview.recent.invoices.length === 0 ? (
                                        <Typography variant="body2" color="text.secondary">Nothing recent.</Typography>
                                    ) : (
                                        <List dense>
                                            {overview.recent.invoices.map((inv) => (
                                                <ListItem key={inv.id} disableGutters sx={{ py: 0.5, cursor: 'pointer' }} onClick={() => router.push('/dashboard/principal/finance')}>
                                                    <ListItemText primary={inv.title} secondary={`${inv.learnerName} · ${formatCurrency(inv.amount)}`} />
                                                    <Chip size="small" label={inv.status} color={getInvoiceChipColor(inv.status) as 'success'} />
                                                </ListItem>
                                            ))}
                                        </List>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="subtitle1" fontWeight="bold">Recent behavior</Typography>
                                    <Divider sx={{ my: 1.5 }} />
                                    {overview.recent.behavior.length === 0 ? (
                                        <Typography variant="body2" color="text.secondary">Nothing recent.</Typography>
                                    ) : (
                                        <List dense>
                                            {overview.recent.behavior.map((r) => (
                                                <ListItem key={r.id} disableGutters sx={{ py: 0.5, cursor: 'pointer' }} onClick={() => router.push('/dashboard/principal/behavior')}>
                                                    <ListItemText primary={`${r.type} · ${r.learnerName}`} secondary={r.reason} />
                                                </ListItem>
                                            ))}
                                        </List>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Box>
            )}

            <AddClassModal open={isClassModalOpen} onClose={() => setIsClassModalOpen(false)} onSuccess={fetchOverview} />
            <AddUserModal open={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} onSuccess={fetchOverview} />
        </Box>
    );
}
