'use client';

import { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    MenuItem,
    TextField,
    Typography,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

export default function ProviderAuditPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({ action: '', schoolId: '', from: '', to: '' });

    const load = () => {
        setLoading(true);
        const params = new URLSearchParams({ limit: '200' });
        if (filters.action) params.set('action', filters.action);
        if (filters.schoolId) params.set('schoolId', filters.schoolId);
        if (filters.from) params.set('from', filters.from);
        if (filters.to) params.set('to', filters.to);

        fetch(`/api/admin/audit?${params}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.error) throw new Error(data.error);
                setLogs(data.logs ?? data);
                setTotal(data.total ?? data.logs?.length ?? 0);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
    }, []);

    const columns: GridColDef[] = [
        {
            field: 'createdAt',
            headerName: 'Time',
            width: 170,
            valueFormatter: (v) => new Date(v).toLocaleString(),
        },
        {
            field: 'user',
            headerName: 'User',
            width: 160,
            valueGetter: (_v, row) =>
                row.user ? `${row.user.firstName} ${row.user.lastName}` : '—',
        },
        {
            field: 'school',
            headerName: 'School',
            width: 140,
            valueGetter: (_v, row) => row.school?.name ?? 'Platform',
        },
        { field: 'action', headerName: 'Action', width: 160 },
        { field: 'entity', headerName: 'Entity', width: 100 },
        {
            field: 'details',
            headerName: 'Details',
            flex: 1,
            valueGetter: (v) => (v ? JSON.stringify(v) : ''),
        },
    ];

    const exportCsv = () => {
        const params = new URLSearchParams({ format: 'csv', limit: '1000' });
        if (filters.action) params.set('action', filters.action);
        if (filters.schoolId) params.set('schoolId', filters.schoolId);
        if (filters.from) params.set('from', filters.from);
        if (filters.to) params.set('to', filters.to);
        window.open(`/api/admin/audit?${params}`, '_blank');
    };

    return (
        <Box>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box display="flex" gap={2} flexWrap="wrap" mb={2} alignItems="center">
                <TextField
                    size="small"
                    label="Action"
                    value={filters.action}
                    onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                    placeholder="ONBOARD_SCHOOL"
                />
                <TextField
                    size="small"
                    label="School ID"
                    value={filters.schoolId}
                    onChange={(e) => setFilters({ ...filters, schoolId: e.target.value })}
                />
                <TextField
                    size="small"
                    label="From"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={filters.from}
                    onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                />
                <TextField
                    size="small"
                    label="To"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={filters.to}
                    onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                />
                <Button variant="contained" onClick={load}>
                    Apply filters
                </Button>
                <Button variant="outlined" onClick={exportCsv}>
                    Export CSV
                </Button>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Showing {logs.length} of {total} entries
            </Typography>

            {loading ? (
                <Box display="flex" justifyContent="center" py={8}>
                    <CircularProgress />
                </Box>
            ) : (
                <Box sx={{ height: 640, width: '100%' }}>
                    <DataGrid rows={logs} columns={columns} getRowId={(r) => r.id} />
                </Box>
            )}
        </Box>
    );
}
