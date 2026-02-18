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
    CircularProgress,
    Stack,
    IconButton,
    Tooltip,
    Alert,
    useTheme as useMuiTheme
} from '@mui/material';
import {
    BarChart as BarChartIcon,
    TrendingUp,
    People,
    AccountBalance,
    Refresh,
    InfoOutlined,
    AutoAwesome,
    Lightbulb
} from '@mui/icons-material';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
    AreaChart,
    Area
} from 'recharts';

export default function PrincipalAnalytics() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const muiTheme = useMuiTheme();

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/school/analytics');
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) return (
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="80vh" gap={2}>
            <CircularProgress size={60} thickness={4} />
            <Typography variant="h6" color="text.secondary">Synthesizing School Data...</Typography>
        </Box>
    );

    const COLORS = [muiTheme.palette.primary.main, muiTheme.palette.secondary.main, muiTheme.palette.warning.main, muiTheme.palette.error.main];

    return (
        <Container maxWidth="xl" sx={{ mt: 4, pb: 8 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">School Command Center</Typography>
                    <Typography color="text.secondary">Real-time intelligence across all departments.</Typography>
                </Box>
                <IconButton onClick={fetchData} color="primary" sx={{ bgcolor: 'action.hover' }}>
                    <Refresh />
                </IconButton>
            </Box>

            {/* AI Strategic Insights */}
            <Box mb={4}>
                <Typography variant="h6" fontWeight="bold" mb={2} display="flex" alignItems="center" gap={1}>
                    <AutoAwesome color="primary" /> AI Strategic Insights
                </Typography>
                <Grid container spacing={2}>
                    {data?.aiInsights?.map((insight: any, idx: number) => (
                        <Grid key={idx} size={{ xs: 12, md: 4 }}>
                            <Paper sx={{
                                p: 2,
                                borderRadius: 3,
                                borderLeft: '6px solid',
                                borderColor: insight.type === 'warning' ? 'warning.main' : insight.type === 'success' ? 'success.main' : 'info.main',
                                bgcolor: 'background.paper',
                                boxShadow: 2
                            }}>
                                <Typography variant="subtitle2" fontWeight="bold" color={`${insight.type}.main`} display="flex" alignItems="center" gap={1}>
                                    <Lightbulb fontSize="small" /> {insight.title}
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                                    {insight.content}
                                </Typography>
                            </Paper>
                        </Grid>
                    ))}
                    {!data?.aiInsights?.length && (
                        <Grid size={{ xs: 12 }}>
                            <Alert severity="info">Processing data to generate new insights...</Alert>
                        </Grid>
                    )}
                </Grid>
            </Box>

            <Grid container spacing={3}>
                {/* Academic Performance */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper sx={{ p: 3, borderRadius: 4, height: '100%', boxShadow: 4 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <TrendingUp color="primary" />
                                <Typography variant="h6" fontWeight="bold">Academic Performance Trend</Typography>
                            </Stack>
                            <Tooltip title="Average marks across all subjects per month">
                                <InfoOutlined fontSize="small" color="disabled" />
                            </Tooltip>
                        </Box>
                        <Box height={300}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data?.academic?.trend}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={muiTheme.palette.primary.main} stopOpacity={0.1} />
                                            <stop offset="95%" stopColor={muiTheme.palette.primary.main} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={muiTheme.palette.divider} />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                                    <RechartsTooltip />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke={muiTheme.palette.primary.main}
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorValue)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>

                {/* Behavioral Distribution */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 3, borderRadius: 4, height: '100%', boxShadow: 4 }}>
                        <Typography variant="h6" fontWeight="bold" mb={3}>Behavioral Points</Typography>
                        <Box height={300} display="flex" justifyContent="center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data?.behavior}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {data?.behavior?.map((_: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </Box>
                        <Box mt={2}>
                            {data?.behavior?.map((item: any, index: number) => (
                                <Box key={item.name} display="flex" justifyContent="space-between" mb={1}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: COLORS[index % COLORS.length] }} />
                                        <Typography variant="body2">{item.name}</Typography>
                                    </Stack>
                                    <Typography variant="body2" fontWeight="bold">{item.value}</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Paper>
                </Grid>

                {/* Attendance Rate */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 3, borderRadius: 4, boxShadow: 4 }}>
                        <Typography variant="h6" fontWeight="bold" mb={3}>Monthly Attendance Rate (%)</Typography>
                        <Box height={250}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data?.attendance?.trend}>
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                                    <YAxis hide domain={[0, 100]} />
                                    <RechartsTooltip cursor={{ fill: 'transparent' }} />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {data?.attendance?.trend?.map((_: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={muiTheme.palette.secondary.main} fillOpacity={0.8} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>

                {/* Financial Health */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 3, borderRadius: 4, boxShadow: 4, bgcolor: 'background.paper' }}>
                        <Typography variant="h6" fontWeight="bold" mb={3}>Financial Health (Collections)</Typography>
                        <Box height={250}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={[
                                    { name: 'Collected', value: data?.finance?.paid, color: muiTheme.palette.success.main },
                                    { name: 'Outstanding', value: data?.finance?.pending, color: muiTheme.palette.warning.main }
                                ]}>
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={100} />
                                    <RechartsTooltip />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40}>
                                        <Cell fill={muiTheme.palette.success.main} />
                                        <Cell fill={muiTheme.palette.warning.main} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
}
