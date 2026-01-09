'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    Chip,
    Button,
    Grid,
    Card,
    CardContent,
    Stack,
    Divider,
    IconButton,
    CircularProgress,
    Alert
} from '@mui/material';
import {
    CheckCircle,
    Cancel,
    Email,
    History,
    AssignmentInd
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

export default function AdmissionsManager() {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actioning, setActioning] = useState<string | null>(null);

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/school/applications');
            const data = await res.json();
            setApplications(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, []);

    const handleAction = async (id: string, status: string) => {
        setActioning(id);
        try {
            const res = await fetch('/api/school/applications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status })
            });
            if (res.ok) {
                fetchApplications();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setActioning(null);
        }
    };

    const columns: GridColDef[] = [
        { field: 'createdAt', headerName: 'Date Applied', width: 120, valueFormatter: (params) => new Date(params.value).toLocaleDateString() },
        { field: 'firstName', headerName: 'First Name', width: 130 },
        { field: 'lastName', headerName: 'Last Name', width: 130 },
        { field: 'email', headerName: 'Email', width: 200 },
        { field: 'grade', headerName: 'Grade', width: 100 },
        {
            field: 'status',
            headerName: 'Status',
            width: 120,
            renderCell: (params) => (
                <Chip
                    label={params.value}
                    color={params.value === 'APPROVED' ? 'success' : params.value === 'REJECTED' ? 'error' : 'warning'}
                    size="small"
                />
            )
        },
        {
            field: 'actions',
            headerName: 'Decision',
            flex: 1,
            renderCell: (params) => (
                <Box display="flex" gap={1}>
                    <Button
                        size="small"
                        variant="contained"
                        color="success"
                        disabled={params.row.status !== 'PENDING' || actioning === params.row.id}
                        onClick={() => handleAction(params.row.id, 'APPROVED')}
                    >
                        Approve
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        disabled={params.row.status !== 'PENDING' || actioning === params.row.id}
                        onClick={() => handleAction(params.row.id, 'REJECTED')}
                    >
                        Reject
                    </Button>
                </Box>
            )
        }
    ];

    return (
        <Container maxWidth="xl" sx={{ mt: 4 }}>
            <Box mb={4}>
                <Typography variant="h4" fontWeight="bold">Admissions Pipeline</Typography>
                <Typography color="text.secondary">Review and approve incoming student applications.</Typography>
            </Box>

            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="subtitle2" color="text.secondary">Total New Applications</Typography>
                            <Typography variant="h4" fontWeight="bold">
                                {applications.filter(a => a.status === 'PENDING').length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="subtitle2" color="text.secondary">Review Rate</Typography>
                            <Typography variant="h4" fontWeight="bold">
                                {applications.length > 0
                                    ? Math.round((applications.filter(a => a.status !== 'PENDING').length / applications.length) * 100)
                                    : 0}%
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Paper sx={{ p: 2 }}>
                <Box sx={{ height: 600, width: '100%' }}>
                    <DataGrid
                        rows={applications}
                        columns={columns}
                        loading={loading}
                        disableRowSelectionOnClick
                    />
                </Box>
            </Paper>
        </Container>
    );
}
