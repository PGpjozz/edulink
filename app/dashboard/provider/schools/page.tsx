'use client';

import { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    TextField,
    Typography,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import SchoolDetailDrawer from '@/app/components/provider/SchoolDetailDrawer';

export default function ProviderSchoolsPage() {
    const [schools, setSchools] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [generating, setGenerating] = useState<string | null>(null);
    const [ownerDialog, setOwnerDialog] = useState<{ schoolId: string; schoolName: string } | null>(null);
    const [ownerForm, setOwnerForm] = useState({ email: '', firstName: '', lastName: '', password: '' });
    const [ownerSaving, setOwnerSaving] = useState(false);
    const [message, setMessage] = useState('');

    const load = () => {
        setLoading(true);
        setError('');
        fetch('/api/schools')
            .then(async (r) => {
                const data = await r.json();
                if (!r.ok) throw new Error(data.error || `Failed to load schools (${r.status})`);
                return data;
            })
            .then((data) => {
                setSchools(Array.isArray(data) ? data : []);
            })
            .catch((e) => setError(e.message || 'Failed to load schools'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
    }, []);

    const handleGenerateBill = async (schoolId: string) => {
        setGenerating(schoolId);
        try {
            const res = await fetch('/api/admin/billing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schoolId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to issue bill');
            setMessage('Bill issued successfully');
            load();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setGenerating(null);
        }
    };

    const filtered = schools.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.subdomain ?? '').toLowerCase().includes(search.toLowerCase()),
    );

    const columns: GridColDef[] = [
        { field: 'name', headerName: 'School', flex: 1, minWidth: 180 },
        {
            field: 'subdomain',
            headerName: 'Subdomain',
            width: 130,
            valueGetter: (_v, row) => row.subdomain ?? '—',
        },
        {
            field: 'tier',
            headerName: 'Tier',
            width: 100,
            renderCell: (p) => <Chip label={p.value} size="small" variant="outlined" />,
        },
        {
            field: 'learnerCount',
            headerName: 'Learners',
            width: 100,
        },
        {
            field: 'effectiveMonthlyFee',
            headerName: 'Fee/mo',
            width: 110,
            valueFormatter: (v) => `R ${Number(v).toLocaleString()}`,
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 110,
            renderCell: (p) => (
                <Chip
                    label={p.row.isActive ? 'Active' : 'Suspended'}
                    color={p.row.isActive ? 'success' : 'default'}
                    size="small"
                />
            ),
        },
        {
            field: 'billing',
            headerName: 'Latest bill',
            width: 120,
            valueGetter: (_v, row) => row.latestBilling?.status ?? '—',
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 300,
            sortable: false,
            renderCell: (p) => (
                <Box display="flex" gap={0.5}>
                    <Button size="small" onClick={() => setSelectedId(p.row.id)}>
                        Manage
                    </Button>
                    {!p.row.ownerId && (
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                                setOwnerDialog({ schoolId: p.row.id, schoolName: p.row.name });
                                setOwnerForm({
                                    email: p.row.contactEmail || '',
                                    firstName: '',
                                    lastName: '',
                                    password: '',
                                });
                            }}
                        >
                            Add owner
                        </Button>
                    )}
                    <Button
                        size="small"
                        variant="outlined"
                        disabled={generating === p.row.id}
                        onClick={() => handleGenerateBill(p.row.id)}
                    >
                        Bill
                    </Button>
                </Box>
            ),
        },
    ];

    return (
        <Box>
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
            {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={2} flexWrap="wrap">
                <Typography variant="h6" fontWeight={700}>
                    Schools ({filtered.length})
                </Typography>
                <TextField
                    size="small"
                    placeholder="Search schools…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ minWidth: 220 }}
                />
            </Box>

            {loading ? (
                <Box display="flex" justifyContent="center" py={8}>
                    <CircularProgress />
                </Box>
            ) : (
                <Box sx={{ height: 640, width: '100%' }}>
                    <DataGrid rows={filtered} columns={columns} disableRowSelectionOnClick getRowId={(r) => r.id} />
                </Box>
            )}

            <SchoolDetailDrawer
                schoolId={selectedId}
                open={Boolean(selectedId)}
                onClose={() => setSelectedId(null)}
                onUpdated={load}
            />

            <Dialog open={!!ownerDialog} onClose={() => setOwnerDialog(null)} maxWidth="sm" fullWidth>
                <DialogTitle>Assign owner — {ownerDialog?.schoolName}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid size={{ xs: 6 }}>
                            <TextField
                                fullWidth
                                label="First name"
                                value={ownerForm.firstName}
                                onChange={(e) => setOwnerForm({ ...ownerForm, firstName: e.target.value })}
                            />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <TextField
                                fullWidth
                                label="Last name"
                                value={ownerForm.lastName}
                                onChange={(e) => setOwnerForm({ ...ownerForm, lastName: e.target.value })}
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                fullWidth
                                label="Email"
                                type="email"
                                required
                                value={ownerForm.email}
                                onChange={(e) => setOwnerForm({ ...ownerForm, email: e.target.value })}
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                fullWidth
                                label="Password"
                                required
                                value={ownerForm.password}
                                onChange={(e) => setOwnerForm({ ...ownerForm, password: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOwnerDialog(null)}>Cancel</Button>
                    <Button
                        variant="contained"
                        disabled={ownerSaving}
                        onClick={async () => {
                            if (!ownerDialog) return;
                            setOwnerSaving(true);
                            try {
                                const res = await fetch(`/api/provider/schools/${ownerDialog.schoolId}/owner`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(ownerForm),
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error || 'Failed');
                                setMessage(`Owner created: ${data.owner.email}`);
                                setOwnerDialog(null);
                                load();
                            } catch (e: any) {
                                setError(e.message);
                            } finally {
                                setOwnerSaving(false);
                            }
                        }}
                    >
                        {ownerSaving ? 'Saving…' : 'Create owner'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
