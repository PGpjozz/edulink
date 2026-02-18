'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    CircularProgress,
    Alert,
    Grid,
    Card,
    CardContent,
    Chip,
    TextField,
    Stack
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

type BehaviorRecordRow = {
    id: string;
    type: 'MERIT' | 'DEMERIT';
    category: string;
    points: number;
    reason: string;
    createdAt: string;
    teacher: { firstName: string; lastName: string };
    learner: { user: { firstName: string; lastName: string } };
};

export default function PrincipalBehaviorPage() {
    const [rows, setRows] = useState<BehaviorRecordRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');

    const fetchRows = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/school/behavior');
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Failed to load behavior records');
            }
            const data = (await res.json()) as BehaviorRecordRow[];
            setRows(data);
        } catch (e: any) {
            setError(e?.message || 'Failed to load behavior records');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRows();
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) => {
            const learnerName = `${r.learner?.user?.firstName ?? ''} ${r.learner?.user?.lastName ?? ''}`.toLowerCase();
            const teacherName = `${r.teacher?.firstName ?? ''} ${r.teacher?.lastName ?? ''}`.toLowerCase();
            return (
                learnerName.includes(q) ||
                teacherName.includes(q) ||
                String(r.category || '').toLowerCase().includes(q) ||
                String(r.reason || '').toLowerCase().includes(q) ||
                String(r.type || '').toLowerCase().includes(q)
            );
        });
    }, [rows, query]);

    const kpis = useMemo(() => {
        const total = rows.length;
        const merits = rows.filter((r) => r.type === 'MERIT').length;
        const demerits = rows.filter((r) => r.type === 'DEMERIT').length;
        const pointsTotal = rows.reduce((sum, r) => sum + Number(r.points || 0), 0);
        return { total, merits, demerits, pointsTotal };
    }, [rows]);

    const columns: GridColDef[] = [
        {
            field: 'createdAt',
            headerName: 'Date',
            width: 130,
            valueFormatter: (value: any) => new Date(value).toLocaleDateString()
        },
        {
            field: 'learner',
            headerName: 'Learner',
            flex: 1,
            valueGetter: (_value: any, row: any) => `${row?.learner?.user?.firstName ?? ''} ${row?.learner?.user?.lastName ?? ''}`.trim()
        },
        {
            field: 'type',
            headerName: 'Type',
            width: 120,
            renderCell: (params: any) => (
                <Chip
                    label={params.value}
                    size="small"
                    color={params.value === 'MERIT' ? 'success' : 'error'}
                    variant="outlined"
                />
            )
        },
        { field: 'category', headerName: 'Category', width: 140 },
        { field: 'points', headerName: 'Points', width: 110 },
        { field: 'reason', headerName: 'Reason', flex: 1.5 },
        {
            field: 'teacher',
            headerName: 'Logged By',
            flex: 1,
            valueGetter: (_value: any, row: any) => `${row?.teacher?.firstName ?? ''} ${row?.teacher?.lastName ?? ''}`.trim()
        }
    ];

    return (
        <Container maxWidth="xl" sx={{ mt: 4 }}>
            <Box mb={3}>
                <Typography variant="h4" fontWeight="bold">Behavior</Typography>
                <Typography color="text.secondary">School-wide behavior records for monitoring trends and interventions.</Typography>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={2} mb={2}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="overline" color="text.secondary">Total records</Typography>
                            <Typography variant="h5" fontWeight="bold">{kpis.total}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="overline" color="text.secondary">Merits</Typography>
                            <Typography variant="h5" fontWeight="bold">{kpis.merits}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="overline" color="text.secondary">Demerits</Typography>
                            <Typography variant="h5" fontWeight="bold">{kpis.demerits}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="overline" color="text.secondary">Total points</Typography>
                            <Typography variant="h5" fontWeight="bold">{kpis.pointsTotal}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Paper sx={{ p: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 2 }}>
                    <TextField
                        fullWidth
                        label="Search learner, teacher, category, reason"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        size="small"
                    />
                </Stack>

                {loading ? (
                    <Box display="flex" justifyContent="center" py={8}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box sx={{ height: 620, width: '100%' }}>
                        <DataGrid
                            rows={filtered}
                            columns={columns}
                            disableRowSelectionOnClick
                            pageSizeOptions={[25, 50, 100]}
                            initialState={{
                                pagination: { paginationModel: { pageSize: 25, page: 0 } }
                            }}
                        />
                    </Box>
                )}
            </Paper>
        </Container>
    );
}
