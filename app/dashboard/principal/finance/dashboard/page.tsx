'use client';

import { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Box,
    Grid,
    Card,
    CardContent,
    Paper,
    Button,
    CircularProgress,
    Chip
} from '@mui/material';
import {
    TrendingUp,
    AccountBalance,
    Warning,
    Refresh,
    Download
} from '@mui/icons-material';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6'];

export default function FinancialDashboard() {
    const [stats, setStats] = useState({
        totalInvoiced: 0,
        totalPaid: 0,
        totalOverdue: 0,
        collectionRate: 0,
        invoiceCount: 0
    });
    const [monthlyData, setMonthlyData] = useState([]);
    const [statusBreakdown, setStatusBreakdown] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/school/finance/dashboard');
            const data = await res.json();
            setStats(data.stats);
            setMonthlyData(data.monthlyRevenue);
            setStatusBreakdown(data.statusBreakdown);
        } catch (err) {
            console.error('Failed to fetch financial data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    if (loading) return <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>;

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }} component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">Financial Intelligence</Typography>
                    <Typography color="text.secondary">Revenue tracking and collection analytics.</Typography>
                </Box>
                <Box display="flex" gap={1}>
                    <Button startIcon={<Refresh />} onClick={fetchDashboardData}>Refresh</Button>
                    <Button variant="contained" startIcon={<Download />}>Export Report</Button>
                </Box>
            </Box>

            {/* KPI Cards */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} md={3}>
                    <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderRadius: 3 }}>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Total Revenue</Typography>
                                    <Typography variant="h4" fontWeight="bold">R {stats.totalInvoiced.toLocaleString()}</Typography>
                                </Box>
                                <AccountBalance sx={{ fontSize: 48, opacity: 0.3 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white', borderRadius: 3 }}>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Collected</Typography>
                                    <Typography variant="h4" fontWeight="bold">R {stats.totalPaid.toLocaleString()}</Typography>
                                </Box>
                                <TrendingUp sx={{ fontSize: 48, opacity: 0.3 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white', borderRadius: 3 }}>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Collection Rate</Typography>
                                    <Typography variant="h4" fontWeight="bold">{stats.collectionRate.toFixed(1)}%</Typography>
                                </Box>
                                <Warning sx={{ fontSize: 48, opacity: 0.3 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card sx={{ background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', color: 'white', borderRadius: 3 }}>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Overdue</Typography>
                                    <Typography variant="h4" fontWeight="bold">R {stats.totalOverdue.toLocaleString()}</Typography>
                                </Box>
                                <Warning sx={{ fontSize: 48, opacity: 0.3 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Charts */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3, borderRadius: 3, height: 400 }}>
                        <Typography variant="h6" fontWeight="bold" mb={2}>Monthly Revenue Trend</Typography>
                        <ResponsiveContainer width="100%" height="85%">
                            <LineChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="invoiced" stroke="#8b5cf6" strokeWidth={2} name="Invoiced" />
                                <Line type="monotone" dataKey="collected" stroke="#22c55e" strokeWidth={2} name="Collected" />
                            </LineChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: 3, height: 400 }}>
                        <Typography variant="h6" fontWeight="bold" mb={2}>Invoice Status</Typography>
                        <ResponsiveContainer width="100%" height="85%">
                            <PieChart>
                                <Pie
                                    data={statusBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={(entry) => `${entry.name}: ${entry.value}`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {statusBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
}
