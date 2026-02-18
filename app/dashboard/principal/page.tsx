'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Container,
    Typography,
    Tabs,
    Tab,
    Paper,
    Button,
    Grid,
    Card,
    CardContent,
    Stack,
    Alert,
    CircularProgress,
    Divider,
    List,
    ListItem,
    ListItemText,
    Chip
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip
} from 'recharts';
import AddClassModal from './AddClassModal';
import AddUserModal from './AddUserModal';
import AssignTeacherModal from './AssignTeacherModal';

interface ClassData {
    id: string;
    name: string;
    grade: string;
    _count: { learners: number };
    teacher?: { user: { firstName: string; lastName: string } };
    teacherProfileId?: string | null;
}

interface UserData {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    idNumber?: string | null;
    role: string;
    isActive: boolean;
    teacherProfileId?: string | null;
}

interface SubjectData {
    id: string;
    name: string;
    code?: string | null;
    grade: string;
    teacherId?: string | null;
    teacher?: { user: { firstName: string; lastName: string } } | null;
}

type OverviewResponse = {
    lastUpdated: string;
    kpis: {
        learners: number;
        teachers: number;
        parents: number;
        staff: number;
        classes: number;
        classesUnassigned: number;
        subjects: number;
        subjectsUnassigned: number;
        assets: {
            total: number;
            available: number;
            checkedOut: number;
            maintenance: number;
            lost: number;
        };
        bookingsPending: number;
        invoices: {
            pendingAmount: number;
            overdueAmount: number;
            pendingCount: number;
            overdueCount: number;
            dueSoonCount: number;
        };
    };
    recent: {
        invoices: Array<{
            id: string;
            title: string;
            amount: number;
            status: string;
            dueDate: string;
            createdAt: string;
            learnerName: string;
        }>;
        bookings: Array<{
            id: string;
            status: string;
            startDate: string;
            endDate: string;
            createdAt: string;
            assetName: string;
            assetIdentifier: string;
            userName: string;
            userRole: string;
        }>;
        behavior: Array<{
            id: string;
            type: string;
            category: string;
            points: number;
            reason: string;
            createdAt: string;
            learnerName: string;
            teacherName: string;
        }>;
    };
};

export default function PrincipalDashboard() {
    const router = useRouter();
    const [tabIndex, setTabIndex] = useState(0);

    // Data
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    const [subjects, setSubjects] = useState<SubjectData[]>([]);
    const [loading, setLoading] = useState(false);

    const [overview, setOverview] = useState<OverviewResponse | null>(null);
    const [overviewLoading, setOverviewLoading] = useState(false);
    const [overviewError, setOverviewError] = useState<string>('');

    // Modals
    const [isClassModalOpen, setIsClassModalOpen] = useState(false);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);

    const [assignOpen, setAssignOpen] = useState(false);
    const [assignTitle, setAssignTitle] = useState('');
    const [assignDescription, setAssignDescription] = useState<string | undefined>(undefined);
    const [assignInitialTeacherProfileId, setAssignInitialTeacherProfileId] = useState<string | null>(null);
    const [assignTarget, setAssignTarget] = useState<{ type: 'class' | 'subject'; id: string } | null>(null);

    const fetchClasses = () => {
        setLoading(true);
        fetch('/api/classes')
            .then(res => res.json())
            .then(data => setClasses(data))
            .finally(() => setLoading(false));
    };

    const fetchUsers = () => {
        setLoading(true);
        fetch('/api/users')
            .then(res => res.json())
            .then(data => setUsers(data))
            .finally(() => setLoading(false));
    };

    const fetchSubjects = () => {
        setLoading(true);
        fetch('/api/subjects')
            .then(res => res.json())
            .then(data => setSubjects(data))
            .finally(() => setLoading(false));
    };

    const fetchOverview = async () => {
        setOverviewLoading(true);
        setOverviewError('');
        try {
            const res = await fetch('/api/school/overview');
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Failed to load overview');
            }
            const data = (await res.json()) as OverviewResponse;
            setOverview(data);
        } catch (e: any) {
            setOverviewError(e?.message || 'Failed to load overview');
        } finally {
            setOverviewLoading(false);
        }
    };

    useEffect(() => {
        if (tabIndex === 0) fetchOverview();
        if (tabIndex === 1) fetchClasses();
        if (tabIndex === 2) fetchUsers();
        if (tabIndex === 3) fetchSubjects();

        if ((tabIndex === 1 || tabIndex === 3) && users.length === 0) {
            fetchUsers();
        }
    }, [tabIndex]);

    const formatCurrency = (value: number) => {
        try {
            return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(value);
        } catch {
            return `R ${Number(value || 0).toFixed(2)}`;
        }
    };

    const getInvoiceChipColor = (status: string) => {
        if (status === 'PAID') return 'success';
        if (status === 'OVERDUE') return 'error';
        if (status === 'VOID') return 'default';
        return 'warning';
    };

    const assetChartData = overview
        ? [
            { name: 'Available', value: overview.kpis.assets.available },
            { name: 'Checked out', value: overview.kpis.assets.checkedOut },
            { name: 'Maintenance', value: overview.kpis.assets.maintenance },
            { name: 'Lost', value: overview.kpis.assets.lost }
        ]
        : [];

    const invoiceAmountChartData = overview
        ? [
            { name: 'Pending', amount: overview.kpis.invoices.pendingAmount },
            { name: 'Overdue', amount: overview.kpis.invoices.overdueAmount }
        ]
        : [];

    const ASSET_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

    const teacherOptions = users
        .filter((u) => u.role === 'TEACHER' && !!u.teacherProfileId)
        .map((u) => ({
            teacherProfileId: u.teacherProfileId as string,
            name: `${u.firstName} ${u.lastName}`
        }));

    const classColumns: GridColDef[] = [
        { field: 'name', headerName: 'Class Name', flex: 1 },
        { field: 'grade', headerName: 'Grade', width: 100 },
        {
            field: 'learners', headerName: 'Learners', width: 100,
            valueGetter: (_value: any, row: any) => row?._count?.learners || 0
        },
        {
            field: 'teacher', headerName: 'Class Teacher', flex: 1,
            valueGetter: (_value: any, row: any) => {
                const t = row?.teacher?.user;
                return t ? `${t.firstName} ${t.lastName}` : 'Unassigned';
            }
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 260,
            renderCell: (params: any) => (
                <Box display="flex" gap={1}>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                            setAssignTarget({ type: 'class', id: params.row.id });
                            setAssignTitle(`Assign Class Teacher: ${params.row.name}`);
                            setAssignDescription('Set the class owner/teacher responsible for this class.');
                            setAssignInitialTeacherProfileId(params.row.teacherProfileId || null);
                            setAssignOpen(true);
                        }}
                    >
                        Assign Teacher
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => window.location.href = `/dashboard/principal/class/${params.row.id}/timetable`}
                    >
                        Timetable
                    </Button>
                </Box>
            )
        }
    ];

    const subjectColumns: GridColDef[] = [
        { field: 'name', headerName: 'Subject', flex: 1 },
        { field: 'grade', headerName: 'Grade', width: 110 },
        {
            field: 'teacher', headerName: 'Teacher', flex: 1,
            valueGetter: (_value: any, row: any) => {
                const t = row?.teacher?.user;
                return t ? `${t.firstName} ${t.lastName}` : 'Unassigned';
            }
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 170,
            renderCell: (params: any) => (
                <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                        setAssignTarget({ type: 'subject', id: params.row.id });
                        setAssignTitle(`Assign Subject Teacher: ${params.row.name}`);
                        setAssignDescription('Assign the teacher responsible for this subject (per grade).');
                        setAssignInitialTeacherProfileId(params.row.teacherId || null);
                        setAssignOpen(true);
                    }}
                >
                    Assign Teacher
                </Button>
            )
        }
    ];

    const userColumns: GridColDef[] = [
        { field: 'firstName', headerName: 'First Name', flex: 1 },
        { field: 'lastName', headerName: 'Last Name', flex: 1 },
        {
            field: 'email', headerName: 'Email / ID', flex: 1.5,
            valueGetter: (_value: any, row: any) => row?.email || row?.idNumber || '-'
        },
        { field: 'role', headerName: 'Role', width: 120 },
        { field: 'isActive', headerName: 'Status', width: 100, type: 'boolean' },
    ];

    const handleSaveAssignment = async (teacherProfileId: string | null) => {
        if (!assignTarget) return;

        if (assignTarget.type === 'class') {
            const res = await fetch('/api/classes', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ classId: assignTarget.id, teacherProfileId })
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Failed to assign class teacher');
            }
            fetchClasses();
            return;
        }

        const res = await fetch('/api/subjects', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subjectId: assignTarget.id, teacherProfileId })
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || 'Failed to assign subject teacher');
        }
        fetchSubjects();
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 4 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                School Management
            </Typography>

            <Paper sx={{ width: '100%', mb: 4 }}>
                <Tabs
                    value={tabIndex}
                    onChange={(_, v) => {
                        setTabIndex(v);
                        requestAnimationFrame(() => (document.activeElement as HTMLElement | null)?.blur?.());
                    }}
                    variant="fullWidth"
                    indicatorColor="primary"
                    textColor="primary"
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="Overview" />
                    <Tab label="Classes & Grades" />
                    <Tab label="Teachers & Staff" />
                    <Tab label="Subjects" />
                </Tabs>

                <Box sx={{ p: 3 }}>
                    {tabIndex === 0 && (
                        <Box>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                                <Box>
                                    <Typography variant="h6">Overview</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {overview?.lastUpdated ? `Last updated: ${new Date(overview.lastUpdated).toLocaleString()}` : ''}
                                    </Typography>
                                </Box>
                                <Button
                                    variant="outlined"
                                    startIcon={<RefreshIcon />}
                                    onClick={fetchOverview}
                                    disabled={overviewLoading}
                                >
                                    Refresh
                                </Button>
                            </Box>

                            {overviewError && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {overviewError}
                                </Alert>
                            )}

                            {overviewLoading && !overview && (
                                <Box display="flex" justifyContent="center" py={6}>
                                    <CircularProgress />
                                </Box>
                            )}

                            {overview && (
                                <Box>
                                    {(overview.kpis.classesUnassigned > 0 || overview.kpis.subjectsUnassigned > 0 || overview.kpis.invoices.overdueCount > 0) && (
                                        <Stack spacing={1.5} sx={{ mb: 2 }}>
                                            {overview.kpis.classesUnassigned > 0 && (
                                                <Alert
                                                    severity="warning"
                                                    action={
                                                        <Button color="inherit" size="small" onClick={() => setTabIndex(1)}>
                                                            View classes
                                                        </Button>
                                                    }
                                                >
                                                    {overview.kpis.classesUnassigned} class(es) are missing a class teacher.
                                                </Alert>
                                            )}
                                            {overview.kpis.subjectsUnassigned > 0 && (
                                                <Alert
                                                    severity="warning"
                                                    action={
                                                        <Button color="inherit" size="small" onClick={() => setTabIndex(3)}>
                                                            View subjects
                                                        </Button>
                                                    }
                                                >
                                                    {overview.kpis.subjectsUnassigned} subject(s) are unassigned.
                                                </Alert>
                                            )}
                                            {overview.kpis.invoices.overdueCount > 0 && (
                                                <Alert severity="error">
                                                    {overview.kpis.invoices.overdueCount} invoice(s) are overdue ({formatCurrency(overview.kpis.invoices.overdueAmount)}).
                                                </Alert>
                                            )}
                                        </Stack>
                                    )}

                                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                            Quick actions
                                        </Typography>
                                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap">
                                            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsClassModalOpen(true)}>
                                                Add class
                                            </Button>
                                            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsUserModalOpen(true)}>
                                                Add user
                                            </Button>
                                            <Button variant="outlined" onClick={() => router.push('/dashboard/principal/assets?add=1')}>
                                                Add asset
                                            </Button>
                                            <Button variant="outlined" onClick={() => router.push('/dashboard/principal/assets?tab=bookings')}>
                                                Review bookings
                                            </Button>
                                            <Button variant="outlined" onClick={() => router.push('/dashboard/principal/finance')}>
                                                Finance & invoices
                                            </Button>
                                            <Button variant="outlined" onClick={() => router.push('/dashboard/principal/analytics')}>
                                                Analytics
                                            </Button>
                                            <Button variant="outlined" onClick={() => router.push('/dashboard/principal/behavior')}>
                                                Behavior
                                            </Button>
                                            <Button variant="outlined" onClick={() => router.push('/dashboard/principal/audit-logs')}>
                                                Audit logs
                                            </Button>
                                        </Stack>
                                    </Paper>

                                    <Grid container spacing={2} sx={{ mb: 2 }}>
                                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                            <Card
                                                variant="outlined"
                                                onClick={() => setTabIndex(2)}
                                                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                            >
                                                <CardContent>
                                                    <Typography variant="overline" color="text.secondary">Learners</Typography>
                                                    <Typography variant="h5" fontWeight="bold">{overview.kpis.learners}</Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                            <Card
                                                variant="outlined"
                                                onClick={() => setTabIndex(2)}
                                                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                            >
                                                <CardContent>
                                                    <Typography variant="overline" color="text.secondary">Staff</Typography>
                                                    <Typography variant="h5" fontWeight="bold">{overview.kpis.staff}</Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Teachers: {overview.kpis.teachers}
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                            <Card
                                                variant="outlined"
                                                onClick={() => setTabIndex(1)}
                                                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                            >
                                                <CardContent>
                                                    <Typography variant="overline" color="text.secondary">Classes</Typography>
                                                    <Typography variant="h5" fontWeight="bold">{overview.kpis.classes}</Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Unassigned: {overview.kpis.classesUnassigned}
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                            <Card
                                                variant="outlined"
                                                onClick={() => setTabIndex(3)}
                                                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                            >
                                                <CardContent>
                                                    <Typography variant="overline" color="text.secondary">Subjects</Typography>
                                                    <Typography variant="h5" fontWeight="bold">{overview.kpis.subjects}</Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Unassigned: {overview.kpis.subjectsUnassigned}
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>

                                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                            <Card
                                                variant="outlined"
                                                onClick={() => router.push('/dashboard/principal/assets')}
                                                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                            >
                                                <CardContent>
                                                    <Typography variant="overline" color="text.secondary">Assets</Typography>
                                                    <Typography variant="h5" fontWeight="bold">{overview.kpis.assets.total}</Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Available: {overview.kpis.assets.available} | Out: {overview.kpis.assets.checkedOut}
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                            <Card
                                                variant="outlined"
                                                onClick={() => router.push('/dashboard/principal/assets?tab=bookings')}
                                                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                            >
                                                <CardContent>
                                                    <Typography variant="overline" color="text.secondary">Bookings pending</Typography>
                                                    <Typography variant="h5" fontWeight="bold">{overview.kpis.bookingsPending}</Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                            <Card
                                                variant="outlined"
                                                onClick={() => router.push('/dashboard/principal/finance')}
                                                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                            >
                                                <CardContent>
                                                    <Typography variant="overline" color="text.secondary">Invoices pending</Typography>
                                                    <Typography variant="h6" fontWeight="bold">{formatCurrency(overview.kpis.invoices.pendingAmount)}</Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {overview.kpis.invoices.pendingCount} invoice(s) | Due soon: {overview.kpis.invoices.dueSoonCount}
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                            <Card
                                                variant="outlined"
                                                onClick={() => router.push('/dashboard/principal/finance')}
                                                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                            >
                                                <CardContent>
                                                    <Typography variant="overline" color="text.secondary">Invoices overdue</Typography>
                                                    <Typography variant="h6" fontWeight="bold">{formatCurrency(overview.kpis.invoices.overdueAmount)}</Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {overview.kpis.invoices.overdueCount} invoice(s)
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    </Grid>

                                    <Grid container spacing={2} sx={{ mb: 2 }}>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <Card variant="outlined" sx={{ height: 360 }}>
                                                <CardContent sx={{ height: '100%' }}>
                                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                                        <Typography variant="subtitle1" fontWeight="bold">Assets status</Typography>
                                                        <Button size="small" onClick={() => router.push('/dashboard/principal/assets')}>Open</Button>
                                                    </Box>
                                                    <Box sx={{ width: '100%', height: 300 }}>
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <PieChart>
                                                                <Pie data={assetChartData} dataKey="value" nameKey="name" outerRadius={100}>
                                                                    {assetChartData.map((_, index) => (
                                                                        <Cell key={`cell-${index}`} fill={ASSET_COLORS[index % ASSET_COLORS.length]} />
                                                                    ))}
                                                                </Pie>
                                                                <RechartsTooltip />
                                                            </PieChart>
                                                        </ResponsiveContainer>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <Card variant="outlined" sx={{ height: 360 }}>
                                                <CardContent sx={{ height: '100%' }}>
                                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                                        <Typography variant="subtitle1" fontWeight="bold">Outstanding invoices</Typography>
                                                        <Button size="small" onClick={() => router.push('/dashboard/principal/finance')}>Open</Button>
                                                    </Box>
                                                    <Box sx={{ width: '100%', height: 300 }}>
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart data={invoiceAmountChartData}>
                                                                <CartesianGrid strokeDasharray="3 3" />
                                                                <XAxis dataKey="name" />
                                                                <YAxis />
                                                                <RechartsTooltip />
                                                                <Bar dataKey="amount" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    </Grid>

                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <Card variant="outlined">
                                                <CardContent>
                                                    <Typography variant="subtitle1" fontWeight="bold">Recent invoices</Typography>
                                                    <Divider sx={{ my: 1.5 }} />
                                                    {overview.recent.invoices.length === 0 ? (
                                                        <Typography variant="body2" color="text.secondary">No invoices yet.</Typography>
                                                    ) : (
                                                        <List dense>
                                                            {overview.recent.invoices.map((inv) => (
                                                                <ListItem
                                                                    key={inv.id}
                                                                    disableGutters
                                                                    sx={{ py: 0.5, cursor: 'pointer' }}
                                                                    onClick={() => router.push('/dashboard/principal/finance')}
                                                                >
                                                                    <ListItemText
                                                                        primary={inv.title}
                                                                        secondary={`${inv.learnerName} • Due ${new Date(inv.dueDate).toLocaleDateString()} • ${formatCurrency(inv.amount)}`}
                                                                    />
                                                                    <Chip size="small" label={inv.status} color={getInvoiceChipColor(inv.status) as any} />
                                                                </ListItem>
                                                            ))}
                                                        </List>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </Grid>

                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <Card variant="outlined">
                                                <CardContent>
                                                    <Typography variant="subtitle1" fontWeight="bold">Recent asset bookings</Typography>
                                                    <Divider sx={{ my: 1.5 }} />
                                                    {overview.recent.bookings.length === 0 ? (
                                                        <Typography variant="body2" color="text.secondary">No bookings yet.</Typography>
                                                    ) : (
                                                        <List dense>
                                                            {overview.recent.bookings.map((b) => (
                                                                <ListItem
                                                                    key={b.id}
                                                                    disableGutters
                                                                    sx={{ py: 0.5, cursor: 'pointer' }}
                                                                    onClick={() => router.push('/dashboard/principal/assets?tab=bookings')}
                                                                >
                                                                    <ListItemText
                                                                        primary={`${b.assetName}${b.assetIdentifier ? ` (${b.assetIdentifier})` : ''}`}
                                                                        secondary={`${b.userName} • ${b.status} • ${new Date(b.startDate).toLocaleDateString()} - ${new Date(b.endDate).toLocaleDateString()}`}
                                                                    />
                                                                    <Chip size="small" label={b.status} />
                                                                </ListItem>
                                                            ))}
                                                        </List>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </Grid>

                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <Card variant="outlined">
                                                <CardContent>
                                                    <Typography variant="subtitle1" fontWeight="bold">Recent behavior</Typography>
                                                    <Divider sx={{ my: 1.5 }} />
                                                    {overview.recent.behavior.length === 0 ? (
                                                        <Typography variant="body2" color="text.secondary">No incidents logged yet.</Typography>
                                                    ) : (
                                                        <List dense>
                                                            {overview.recent.behavior.map((r) => (
                                                                <ListItem
                                                                    key={r.id}
                                                                    disableGutters
                                                                    sx={{ py: 0.5, cursor: 'pointer' }}
                                                                    onClick={() => router.push('/dashboard/principal/behavior')}
                                                                >
                                                                    <ListItemText
                                                                        primary={`${r.type} • ${r.category} • ${r.points} pts`}
                                                                        secondary={`${r.learnerName} • ${r.teacherName} • ${r.reason}`}
                                                                    />
                                                                </ListItem>
                                                            ))}
                                                        </List>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    </Grid>
                                </Box>
                            )}
                        </Box>
                    )}

                    {tabIndex === 1 && (
                        <Box>
                            <Box display="flex" justifyContent="space-between" mb={2}>
                                <Typography variant="h6">Active Classes</Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() => setIsClassModalOpen(true)}
                                >
                                    Add Class
                                </Button>
                            </Box>
                            <Box sx={{ height: 400, width: '100%' }}>
                                <DataGrid
                                    rows={classes}
                                    columns={classColumns}
                                    loading={loading}
                                    disableRowSelectionOnClick
                                />
                            </Box>
                            <AddClassModal
                                open={isClassModalOpen}
                                onClose={() => setIsClassModalOpen(false)}
                                onSuccess={fetchClasses}
                            />
                        </Box>
                    )}

                    {tabIndex === 2 && (
                        <Box>
                            <Box display="flex" justifyContent="space-between" mb={2}>
                                <Typography variant="h6">School Users</Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() => setIsUserModalOpen(true)}
                                >
                                    Add User
                                </Button>
                            </Box>
                            <Box sx={{ height: 400, width: '100%' }}>
                                <DataGrid
                                    rows={users}
                                    columns={userColumns}
                                    loading={loading}
                                    disableRowSelectionOnClick
                                />
                            </Box>
                            <AddUserModal
                                open={isUserModalOpen}
                                onClose={() => setIsUserModalOpen(false)}
                                onSuccess={fetchUsers}
                            />
                        </Box>
                    )}

                    {tabIndex === 3 && (
                        <Box>
                            <Box display="flex" justifyContent="space-between" mb={2}>
                                <Typography variant="h6">Subjects</Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() => window.location.href = '/dashboard/teacher/subjects'}
                                >
                                    Add Subject
                                </Button>
                            </Box>
                            <Box sx={{ height: 400, width: '100%' }}>
                                <DataGrid
                                    rows={subjects}
                                    columns={subjectColumns}
                                    loading={loading}
                                    disableRowSelectionOnClick
                                />
                            </Box>
                        </Box>
                    )}
                </Box>
            </Paper>

            <AssignTeacherModal
                open={assignOpen}
                onClose={() => setAssignOpen(false)}
                title={assignTitle}
                description={assignDescription}
                teachers={teacherOptions}
                initialTeacherProfileId={assignInitialTeacherProfileId}
                onSave={handleSaveAssignment}
            />
        </Container>
    );
}
