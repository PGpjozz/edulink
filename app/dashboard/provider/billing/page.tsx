'use client';

import { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Grid,
    Paper,
    Tab,
    Tabs,
    Typography,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

type DunningRow = {
    billingId: string;
    schoolName: string;
    totalAmount: number;
    daysOverdue: number;
    contactEmail: string | null;
};

export default function ProviderBillingPage() {
    const [billing, setBilling] = useState<any[]>([]);
    const [dunning, setDunning] = useState<{
        totalOverdue: number;
        totalAmount: number;
        all: DunningRow[];
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [generating, setGenerating] = useState(false);
    const [tab, setTab] = useState(0);
    const [reminding, setReminding] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const [billingRes, dunningRes] = await Promise.all([
                fetch('/api/admin/billing'),
                fetch('/api/provider/billing/dunning'),
            ]);
            const billingData = await billingRes.json();
            const dunningData = await dunningRes.json();
            if (!billingRes.ok) throw new Error(billingData.error || 'Failed to load billing');
            if (!dunningRes.ok) throw new Error(dunningData.error || 'Failed to load dunning');
            setBilling(billingData);
            setDunning(dunningData);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const generateAll = async () => {
        setGenerating(true);
        setMessage('');
        try {
            const res = await fetch('/api/provider/billing/generate-all', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed');
            setMessage(
                `Monthly billing run complete: ${data.summary.created} created, ${data.summary.skipped} skipped, ${data.summary.errors} errors.`,
            );
            load();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setGenerating(false);
        }
    };

    const sendReminder = async (billingId: string) => {
        setReminding(billingId);
        try {
            const res = await fetch('/api/provider/billing/remind', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ billingId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Reminder failed');
            setMessage(data.emailSent ? 'Reminder email sent' : 'Reminder queued (email not configured)');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setReminding(null);
        }
    };

    const billingColumns: GridColDef[] = [
        {
            field: 'createdAt',
            headerName: 'Date',
            width: 120,
            valueFormatter: (v) => new Date(v).toLocaleDateString(),
        },
        {
            field: 'school',
            headerName: 'School',
            flex: 1,
            valueGetter: (_v, row) => row.school?.name,
        },
        {
            field: 'totalAmount',
            headerName: 'Amount',
            width: 120,
            valueFormatter: (v) => `R ${Number(v).toFixed(2)}`,
        },
        { field: 'extraLearners', headerName: 'Overage', width: 90 },
        {
            field: 'status',
            headerName: 'Status',
            width: 120,
            renderCell: (p) => (
                <Chip
                    label={p.value === 'ACTIVE' ? 'Paid' : p.value}
                    color={p.value === 'ACTIVE' ? 'success' : p.value === 'PAST_DUE' ? 'warning' : 'default'}
                    size="small"
                />
            ),
        },
    ];

    const dunningColumns: GridColDef[] = [
        { field: 'schoolName', headerName: 'School', flex: 1 },
        {
            field: 'totalAmount',
            headerName: 'Amount',
            width: 120,
            valueFormatter: (v) => `R ${Number(v).toFixed(2)}`,
        },
        { field: 'daysOverdue', headerName: 'Days overdue', width: 120 },
        { field: 'contactEmail', headerName: 'Contact', flex: 1 },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 140,
            sortable: false,
            renderCell: (p) => (
                <Button
                    size="small"
                    disabled={reminding === p.row.billingId}
                    onClick={() => sendReminder(p.row.billingId)}
                >
                    Remind
                </Button>
            ),
        },
    ];

    return (
        <Box>
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
            {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Grid container spacing={2} mb={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 2, borderRadius: 3 }}>
                        <Typography variant="overline" color="text.secondary">
                            Overdue invoices
                        </Typography>
                        <Typography variant="h5" fontWeight={800}>
                            {dunning?.totalOverdue ?? 0}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 2, borderRadius: 3 }}>
                        <Typography variant="overline" color="text.secondary">
                            Overdue amount
                        </Typography>
                        <Typography variant="h5" fontWeight={800}>
                            R {(dunning?.totalAmount ?? 0).toLocaleString()}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 2, borderRadius: 3, height: '100%', display: 'flex', alignItems: 'center' }}>
                        <Button variant="contained" fullWidth onClick={generateAll} disabled={generating}>
                            {generating ? 'Running…' : 'Run monthly billing for all schools'}
                        </Button>
                    </Paper>
                </Grid>
            </Grid>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
                <Tab label="All invoices" />
                <Tab label={`Dunning (${dunning?.totalOverdue ?? 0})`} />
            </Tabs>

            {loading ? (
                <Box display="flex" justifyContent="center" py={8}>
                    <CircularProgress />
                </Box>
            ) : tab === 0 ? (
                <Box sx={{ height: 600, width: '100%' }}>
                    <DataGrid rows={billing} columns={billingColumns} getRowId={(r) => r.id} />
                </Box>
            ) : (
                <Box sx={{ height: 600, width: '100%' }}>
                    <DataGrid
                        rows={dunning?.all ?? []}
                        columns={dunningColumns}
                        getRowId={(r) => r.billingId}
                    />
                </Box>
            )}
        </Box>
    );
}
