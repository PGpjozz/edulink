'use client';

import { useEffect, useState } from 'react';
import {
    Box,
    Container,
    Grid,
    Typography,
    Card,
    CardContent,
    Button,
    Chip,
    Tabs,
    Tab,
    Paper,
    Alert,
    CircularProgress
} from '@mui/material';
import {
    Add as AddIcon,
    School as SchoolIcon,
    ReceiptLong,
    HistoryEdu,
    CheckCircle
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { motion } from 'framer-motion';
import AddSchoolModal from './AddSchoolModal';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState(0);
    const [schools, setSchools] = useState([]);
    const [billing, setBilling] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [generating, setGenerating] = useState<string | null>(null);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [schoolRes, billingRes, auditRes] = await Promise.all([
                fetch('/api/schools'),
                fetch('/api/admin/billing'),
                fetch('/api/admin/audit')
            ]);

            const [schoolData, billingData, auditData] = await Promise.all([
                schoolRes.json(),
                billingRes.json(),
                auditRes.json()
            ]);

            setSchools(schoolData);
            setBilling(billingData);
            setAuditLogs(auditData);
        } catch (err) {
            console.error('Failed to fetch admin data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const handleGenerateBill = async (schoolId: string) => {
        setGenerating(schoolId);
        try {
            const res = await fetch('/api/admin/billing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schoolId })
            });
            if (res.ok) {
                fetchAllData();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setGenerating(null);
        }
    };

    const schoolColumns: GridColDef[] = [
        { field: 'name', headerName: 'School Name', flex: 1 },
        {
            field: 'tier', headerName: 'Plan Tier', width: 130,
            renderCell: (params) => (
                <Chip label={params.value} color="primary" variant="outlined" size="small" />
            )
        },
        {
            field: 'status', headerName: 'Status', width: 120,
            renderCell: (params) => (
                <Chip
                    label={params.row.isActive ? 'Active' : 'Inactive'}
                    color={params.row.isActive ? 'success' : 'default'}
                    size="small"
                />
            )
        },
        {
            field: 'actions', headerName: 'Actions', width: 200,
            renderCell: (params) => (
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ReceiptLong />}
                    disabled={generating === params.row.id}
                    onClick={() => handleGenerateBill(params.row.id)}
                >
                    {generating === params.row.id ? 'Processing...' : 'Issue Bill'}
                </Button>
            )
        }
    ];

    const billingColumns: GridColDef[] = [
        { field: 'createdAt', headerName: 'Date', width: 150, valueFormatter: (params) => new Date(params.value).toLocaleDateString() },
        { field: 'school', headerName: 'School', flex: 1, valueGetter: (params) => params.row.school?.name },
        { field: 'totalAmount', headerName: 'Amount', width: 130, valueFormatter: (params) => `R ${params.value.toFixed(2)}` },
        { field: 'extraLearners', headerName: 'Overage', width: 100 },
        {
            field: 'status', headerName: 'Status', width: 120,
            renderCell: (params) => (
                <Chip label={params.value} color={params.value === 'ACTIVE' ? 'success' : 'warning'} size="small" />
            )
        }
    ];

    const auditColumns: GridColDef[] = [
        { field: 'createdAt', headerName: 'Time', width: 180, valueFormatter: (params) => new Date(params.value).toLocaleString() },
        { field: 'user', headerName: 'User', width: 180, valueGetter: (params) => `${params.row.user?.firstName} ${params.row.user?.lastName}` },
        { field: 'action', headerName: 'Action', width: 150 },
        { field: 'entity', headerName: 'Entity', width: 120 },
        { field: 'details', headerName: 'Details', flex: 1, valueGetter: (params) => JSON.stringify(params.value) }
    ];

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" fontWeight="bold">SaaS Central</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsModalOpen(true)}>
                    Register New School
                </Button>
            </Box>

            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 4 }} indicatorColor="primary">
                <Tab label="Schools" icon={<SchoolIcon />} iconPosition="start" />
                <Tab label="Billing & Revenue" icon={<ReceiptLong />} iconPosition="start" />
                <Tab label="System Audit" icon={<HistoryEdu />} iconPosition="start" />
            </Tabs>

            {loading ? (
                <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>
            ) : (
                <Box>
                    {activeTab === 0 && (
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom fontWeight="bold">Operational Schools</Typography>
                                <Box sx={{ height: 600, width: '100%' }}>
                                    <DataGrid rows={schools} columns={schoolColumns} disableRowSelectionOnClick />
                                </Box>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 1 && (
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={4}>
                                <Card sx={{ bgcolor: 'secondary.main', color: 'white' }}>
                                    <CardContent>
                                        <Typography variant="subtitle2">Total Revenue (All Time)</Typography>
                                        <Typography variant="h3" fontWeight="bold">
                                            R {billing.reduce((acc, curr: any) => acc + curr.totalAmount, 0).toFixed(2)}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom fontWeight="bold">Invoicing History</Typography>
                                        <Box sx={{ height: 500, width: '100%' }}>
                                            <DataGrid rows={billing} columns={billingColumns} />
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    )}

                    {activeTab === 2 && (
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom fontWeight="bold">Activity Logs</Typography>
                                <Box sx={{ height: 600, width: '100%' }}>
                                    <DataGrid rows={auditLogs} columns={auditColumns} />
                                </Box>
                            </CardContent>
                        </Card>
                    )}
                </Box>
            )}

            <AddSchoolModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onCreated={fetchAllData} />
        </Container>
    );
}
