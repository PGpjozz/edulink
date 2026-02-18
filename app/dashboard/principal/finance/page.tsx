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
    Divider,
    Alert,
    CircularProgress,
    Stack
} from '@mui/material';
import {
    Autorenew,
    AdminPanelSettings,
    AttachMoney,
    AccountBalanceWallet,
    NotificationsActive
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

export default function PrincipalFinance() {
    const [stats, setStats] = useState({ totalInvoiced: 0, totalPaid: 0, count: 0 });
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [message, setMessage] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            // Reusing the general billing search for admin/principal
            // For MVP, we'll fetch from a dedicated endpoint if we created it
            // Or just fetch all invoices for this school
            const res = await fetch('/api/school/invoices'); // Needs creation or reuse
            const data = await res.json();
            setInvoices(data);

            const total = data.reduce((acc: number, curr: any) => acc + curr.amount, 0);
            const paid = data.filter((i: any) => i.status === 'PAID').reduce((acc: number, curr: any) => acc + curr.amount, 0);
            setStats({ totalInvoiced: total, totalPaid: paid, count: data.length });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAutoGenerate = async () => {
        setGenerating(true);
        setMessage('');
        try {
            const res = await fetch('/api/school/invoices/generate', { method: 'POST' });
            const result = await res.json();
            setMessage(result.message);
            fetchData();
        } catch (err) {
            console.error(err);
        } finally {
            setGenerating(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const columns: GridColDef[] = [
        { field: 'createdAt', headerName: 'Created', width: 120, valueFormatter: (value: any) => new Date(value).toLocaleDateString() },
        { field: 'learner', headerName: 'Learner', flex: 1, valueGetter: (_value: any, row: any) => `${row?.learner?.user?.firstName} ${row?.learner?.user?.lastName}` },
        { field: 'title', headerName: 'Description', flex: 1.5 },
        { field: 'amount', headerName: 'Amount', width: 120, valueFormatter: (value: any) => `R ${Number(value).toFixed(2)}` },
        { field: 'status', headerName: 'Status', width: 120 },
    ];

    return (
        <Container maxWidth="xl" sx={{ mt: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">Finance & Collections</Typography>
                    <Typography color="text.secondary">Automated monthly billing and revenue tracking.</Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Autorenew />}
                    disabled={generating}
                    onClick={handleAutoGenerate}
                >
                    {generating ? 'Generating...' : 'Run Monthly Billing'}
                </Button>
            </Box>

            {message && <Alert severity="success" sx={{ mb: 4 }}>{message}</Alert>}

            <Grid container spacing={3} mb={4}>
                <Grid size={{ xs: 12, md: 3 }}>
                    <Card sx={{ bgcolor: 'primary.main', color: 'white', borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Total Invoiced</Typography>
                            <Typography variant="h4" fontWeight="bold">R {stats.totalInvoiced.toFixed(0)}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                    <Card sx={{ bgcolor: 'success.main', color: 'white', borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Total Collected</Typography>
                            <Typography variant="h4" fontWeight="bold">R {stats.totalPaid.toFixed(0)}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                    <Card sx={{ bgcolor: 'warning.main', color: 'white', borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Collection Rate</Typography>
                            <Typography variant="h4" fontWeight="bold">
                                {stats.totalInvoiced > 0 ? ((stats.totalPaid / stats.totalInvoiced) * 100).toFixed(1) : 0}%
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                    <Card sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Button
                                variant="outlined"
                                color="warning"
                                startIcon={<NotificationsActive />}
                                onClick={async () => {
                                    const res = await fetch('/api/school/billing/alerts', { method: 'POST' });
                                    const data = await res.json();
                                    setMessage(`Smart Scan Complete: ${data.count} overdue invoices found, ${data.alertsSent} alerts sent.`);
                                }}
                            >
                                Send Overdue Alerts
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Paper sx={{ p: 2 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ p: 1 }}>Invoice Ledger</Typography>
                <Box sx={{ height: 600, width: '100%' }}>
                    <DataGrid
                        rows={invoices}
                        columns={columns}
                        loading={loading}
                        disableRowSelectionOnClick
                    />
                </Box>
            </Paper>
        </Container>
    );
}
