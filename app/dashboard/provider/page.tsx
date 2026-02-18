'use client';

import { useState } from 'react';
import {
    Container,
    Typography,
    Box,
    Paper,
    TextField,
    Button,
    Grid,
    MenuItem,
    Alert,
    CircularProgress,
    Tabs,
    Tab,
    Card,
    CardContent,
    Chip
} from '@mui/material';
import { Add, School as SchoolIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useEffect } from 'react';
import AddSchoolModal from '@/app/admin/dashboard/AddSchoolModal';

export default function ProviderDashboard() {
    const [activeTab, setActiveTab] = useState(0);
    const [formData, setFormData] = useState({
        schoolName: '',
        tier: 'SMALL',
        monthlyFee: '1000',
        contactEmail: '',
        principalFirstName: '',
        principalLastName: '',
        principalEmail: '',
        principalPassword: 'principal123'
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [schools, setSchools] = useState<any[]>([]);
    const [billing, setBilling] = useState<any[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [saasLoading, setSaasLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [generating, setGenerating] = useState<string | null>(null);

    const fetchAllData = async () => {
        setSaasLoading(true);
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
            console.error('Failed to fetch provider data:', err);
        } finally {
            setSaasLoading(false);
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
                    disabled={generating === params.row.id}
                    onClick={() => handleGenerateBill(params.row.id)}
                >
                    {generating === params.row.id ? 'Processing...' : 'Issue Bill'}
                </Button>
            )
        }
    ];

    const billingColumns: GridColDef[] = [
        { field: 'createdAt', headerName: 'Date', width: 150, valueFormatter: (value: any) => new Date(value).toLocaleDateString() },
        { field: 'school', headerName: 'School', flex: 1, valueGetter: (_value: any, row: any) => row?.school?.name },
        { field: 'totalAmount', headerName: 'Amount', width: 130, valueFormatter: (value: any) => `R ${value?.toFixed(2)}` },
        { field: 'extraLearners', headerName: 'Overage', width: 100 },
        {
            field: 'status', headerName: 'Status', width: 120,
            renderCell: (params) => (
                <Chip label={params.value} color={params.value === 'ACTIVE' ? 'success' : 'warning'} size="small" />
            )
        }
    ];

    const auditColumns: GridColDef[] = [
        { field: 'createdAt', headerName: 'Time', width: 180, valueFormatter: (value: any) => new Date(value).toLocaleString() },
        { field: 'user', headerName: 'User', width: 180, valueGetter: (_value: any, row: any) => `${row?.user?.firstName} ${row?.user?.lastName}` },
        { field: 'action', headerName: 'Action', width: 150 },
        { field: 'entity', headerName: 'Entity', width: 120 },
        { field: 'details', headerName: 'Details', flex: 1, valueGetter: (value: any) => JSON.stringify(value) }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await fetch('/api/provider/onboard-school', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: `✅ School "${formData.schoolName}" onboarded successfully! Principal can now log in with ${formData.principalEmail}` });
                // Reset form
                setFormData({
                    schoolName: '',
                    tier: 'SMALL',
                    monthlyFee: '1000',
                    contactEmail: '',
                    principalFirstName: '',
                    principalLastName: '',
                    principalEmail: '',
                    principalPassword: 'principal123'
                });
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to onboard school' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An error occurred' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }} component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Box mb={4} textAlign="center">
                <SchoolIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h3" fontWeight="bold">EduLink Provider Portal</Typography>
                <Typography color="text.secondary" variant="h6">Manage your SaaS platform</Typography>
            </Box>

            <Paper sx={{ mb: 4, borderRadius: 3 }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, v) => {
                        setActiveTab(v);
                        requestAnimationFrame(() => (document.activeElement as HTMLElement | null)?.blur?.());
                    }}
                    variant="fullWidth"
                >
                    <Tab label="Onboard School" />
                    <Tab label="Schools" />
                    <Tab label="Billing" />
                    <Tab label="Audit" />
                </Tabs>
            </Paper>

            {message.text && (
                <Alert severity={message.type as any} sx={{ mb: 3 }}>
                    {message.text}
                </Alert>
            )}

            {activeTab === 0 && (
                <Paper sx={{ p: 4, borderRadius: 3 }}>
                    <form onSubmit={handleSubmit}>
                        <Typography variant="h6" fontWeight="bold" mb={3}>School Details</Typography>
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    label="School Name"
                                    required
                                    value={formData.schoolName}
                                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Tier"
                                    value={formData.tier}
                                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                                >
                                    <MenuItem value="SMALL">Small (1-200 students)</MenuItem>
                                    <MenuItem value="MEDIUM">Medium (201-500 students)</MenuItem>
                                    <MenuItem value="LARGE">Large (500+ students)</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    label="Monthly Fee (ZAR)"
                                    type="number"
                                    required
                                    value={formData.monthlyFee}
                                    onChange={(e) => setFormData({ ...formData, monthlyFee: e.target.value })}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    label="School Contact Email"
                                    type="email"
                                    required
                                    value={formData.contactEmail}
                                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                />
                            </Grid>
                        </Grid>

                        <Typography variant="h6" fontWeight="bold" mt={4} mb={3}>Principal Account</Typography>
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    label="First Name"
                                    required
                                    value={formData.principalFirstName}
                                    onChange={(e) => setFormData({ ...formData, principalFirstName: e.target.value })}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    label="Last Name"
                                    required
                                    value={formData.principalLastName}
                                    onChange={(e) => setFormData({ ...formData, principalLastName: e.target.value })}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    label="Principal Email"
                                    type="email"
                                    required
                                    value={formData.principalEmail}
                                    onChange={(e) => setFormData({ ...formData, principalEmail: e.target.value })}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    label="Temporary Password"
                                    required
                                    value={formData.principalPassword}
                                    onChange={(e) => setFormData({ ...formData, principalPassword: e.target.value })}
                                    helperText="Principal should change this on first login"
                                />
                            </Grid>
                        </Grid>

                        <Box mt={4} display="flex" justifyContent="center">
                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                startIcon={loading ? <CircularProgress size={20} /> : <Add />}
                                disabled={loading}
                                sx={{ px: 6, py: 1.5 }}
                            >
                                {loading ? 'Onboarding...' : 'Onboard School'}
                            </Button>
                        </Box>
                    </form>
                </Paper>
            )}

            {activeTab === 1 && (
                <Card>
                    <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6" fontWeight="bold">Operational Schools</Typography>
                            <Button variant="contained" onClick={() => setIsModalOpen(true)}>Register New School</Button>
                        </Box>

                        {saasLoading ? (
                            <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
                        ) : (
                            <Box sx={{ height: 600, width: '100%' }}>
                                <DataGrid rows={schools} columns={schoolColumns} disableRowSelectionOnClick />
                            </Box>
                        )}
                    </CardContent>
                </Card>
            )}

            {activeTab === 2 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom fontWeight="bold">Billing & Revenue</Typography>
                        {saasLoading ? (
                            <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
                        ) : (
                            <Box sx={{ height: 600, width: '100%' }}>
                                <DataGrid rows={billing} columns={billingColumns} />
                            </Box>
                        )}
                    </CardContent>
                </Card>
            )}

            {activeTab === 3 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom fontWeight="bold">System Audit</Typography>
                        {saasLoading ? (
                            <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
                        ) : (
                            <Box sx={{ height: 600, width: '100%' }}>
                                <DataGrid rows={auditLogs} columns={auditColumns} />
                            </Box>
                        )}
                    </CardContent>
                </Card>
            )}

            <AddSchoolModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreated={fetchAllData}
            />
        </Container>
    );
}
