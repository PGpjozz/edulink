'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
    Chip,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Snackbar,
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
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
    Legend,
    LabelList,
    Tooltip as RechartsTooltip
} from 'recharts';
import AddClassModal from './AddClassModal';
import AddUserModal from './AddUserModal';
import AssignTeacherModal from './AssignTeacherModal';
import AssignHodModal from './AssignHodModal';
import ClassSubjectsModal from './ClassSubjectsModal';

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
    school?: {
        name: string;
        tier: string | null;
    };
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

function PrincipalDashboard() {
    const router = useRouter();
    const searchParams = useSearchParams();
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

    const [hodModalOpen, setHodModalOpen] = useState(false);
    const [hodDepartment, setHodDepartment] = useState<{ id: string; name: string; hodUserId: string | null } | null>(null);

    const [classSubjectsOpen, setClassSubjectsOpen] = useState(false);
    const [classSubjectsTarget, setClassSubjectsTarget] = useState<ClassData | null>(null);

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

    const fetchDepartments = () => {
        fetch('/api/departments')
            .then((res) => res.json())
            .then((data) => setDepartments(Array.isArray(data) ? data : []));
    };

    const fetchTeachingStaff = () => {
        fetch('/api/users/teaching-staff')
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    setTeacherOptions(
                        data.map((t: any) => ({
                            teacherProfileId: t.teacherProfileId,
                            name: t.label || `${t.firstName} ${t.lastName}`,
                        }))
                    );
                }
            });
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

    const TAB_SLUGS = ['overview', 'classes', 'users', 'subjects', 'departments'] as const;

    const goToTab = (index: number) => {
        setTabIndex(index);
        const slug = TAB_SLUGS[index];
        if (slug === 'overview') {
            router.push('/dashboard/principal');
        } else {
            router.push(`/dashboard/principal?tab=${slug}`);
        }
    };

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'classes') setTabIndex(1);
        else if (tab === 'users') setTabIndex(2);
        else if (tab === 'subjects') setTabIndex(3);
        else if (tab === 'departments') setTabIndex(4);
        else setTabIndex(0);
    }, [searchParams]);

    useEffect(() => {
        if (tabIndex === 0) fetchOverview();
        if (tabIndex === 1) { fetchClasses(); fetchTeachingStaff(); fetchSubjects(); }
        if (tabIndex === 2) fetchUsers();
        if (tabIndex === 3) { fetchSubjects(); fetchTeachingStaff(); }
        if (tabIndex === 4) { fetchDepartments(); fetchUsers(); }

        if ((tabIndex === 1 || tabIndex === 3) && users.length === 0) {
            fetchUsers();
        }
    }, [tabIndex]);

    useEffect(() => {
        fetchTeachingStaff();
    }, []);

    const formatCurrency = (value: number) => {
        try {
            return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(value);
        } catch {
            return `R ${Number(value || 0).toFixed(2)}`;
        }
    };

    const formatCompactCurrency = (value: number) => {
        try {
            return new Intl.NumberFormat('en-ZA', {
                style: 'currency',
                currency: 'ZAR',
                notation: 'compact',
                maximumFractionDigits: 1
            }).format(value);
        } catch {
            return `R ${Number(value || 0).toFixed(0)}`;
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

    const [teacherOptions, setTeacherOptions] = useState<{ teacherProfileId: string; name: string }[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [newDeptName, setNewDeptName] = useState('');
    const [newDeptHodUserId, setNewDeptHodUserId] = useState('');

    const hodCandidates = users
        .filter((u) => ['TEACHER', 'PRINCIPAL', 'HOD', 'SCHOOL_ADMIN'].includes(u.role))
        .map((u) => ({
            userId: u.id,
            name: `${u.firstName} ${u.lastName}`,
            role: u.role,
        }));

    const handleSaveHod = async (hodUserId: string | null) => {
        if (!hodDepartment) return;
        const res = await fetch('/api/departments', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ departmentId: hodDepartment.id, hodUserId }),
        });
        if (!res.ok) throw new Error(await res.text());
        fetchDepartments();
        fetchUsers();
        notify(hodUserId ? 'Head of Department assigned.' : 'Head of Department unassigned.');
    };

    const openClassSubjects = (cls: ClassData) => {
        setClassSubjectsTarget(cls);
        setClassSubjectsOpen(true);
        if (subjects.length === 0) fetchSubjects();
    };

    const classColumns: GridColDef[] = [
        { field: 'name', headerName: 'Class Name', flex: 1 },
        { field: 'grade', headerName: 'Grade', width: 100 },
        {
            field: 'learners', headerName: 'Learners', width: 130, type: 'number', align: 'left', headerAlign: 'left',
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
            width: 340,
            renderCell: (params: any) => (
                <Box display="flex" gap={1} flexWrap="wrap">
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => openClassSubjects(params.row)}
                    >
                        Subjects
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                            setAssignTarget({ type: 'class', id: params.row.id });
                            setAssignTitle(`Assign Class Teacher: ${params.row.name}`);
                            setAssignDescription('Set the form teacher responsible for this class.');
                            setAssignInitialTeacherProfileId(params.row.teacherProfileId || null);
                            setAssignOpen(true);
                        }}
                    >
                        Form teacher
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => router.push(`/dashboard/principal/class/${params.row.id}/timetable`)}
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
        {
            field: 'role', headerName: 'Role', width: 150,
            valueGetter: (_value: any, row: any) => (row?.role ? String(row.role).replace(/_/g, ' ') : ''),
            renderCell: (params: any) => (
                <Chip size="small" variant="outlined" label={params.value} />
            )
        },
        {
            field: 'isActive', headerName: 'Status', width: 120,
            renderCell: (params: any) => (
                <Chip
                    size="small"
                    label={params.row?.isActive ? 'Active' : 'Inactive'}
                    color={params.row?.isActive ? 'success' : 'default'}
                />
            )
        },
    ];

    const [toast, setToast] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);
    const notify = (msg: string, severity: 'success' | 'error' = 'success') => setToast({ msg, severity });

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
            if (tabIndex === 0) fetchOverview();
            notify(teacherProfileId ? 'Class teacher assigned.' : 'Class teacher unassigned.');
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
        if (tabIndex === 0) fetchOverview();
        notify(teacherProfileId ? 'Subject teacher assigned.' : 'Subject teacher unassigned.');
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 4 }}>
            <Box
                display="flex"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                flexDirection={{ xs: 'column', sm: 'row' }}
                gap={1}
                mb={2}
            >
                <Box>
                    <Typography variant="h4" fontWeight="bold">
                        {overview?.school?.name || 'School Management'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Principal dashboard
                    </Typography>
                </Box>
                {overview?.school?.tier && (
                    <Chip label={`${overview.school.tier} plan`} color="primary" variant="outlined" />
                )}
            </Box>

            <Paper sx={{ width: '100%', mb: 4 }}>
                <Tabs
                    value={tabIndex}
                    onChange={(_, v) => {
                        goToTab(v);
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
                    <Tab label="Departments" />
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
                                                        <Button color="inherit" size="small" onClick={() => goToTab(1)}>
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
                                                        <Button color="inherit" size="small" onClick={() => goToTab(3)}>
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
                                                        {overview.kpis.assets.total === 0 ? (
                                                            <Box height="100%" display="flex" alignItems="center" justifyContent="center">
                                                                <Typography variant="body2" color="text.secondary">
                                                                    No assets recorded yet.
                                                                </Typography>
                                                            </Box>
                                                        ) : (
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <PieChart>
                                                                    <Pie
                                                                        data={assetChartData}
                                                                        dataKey="value"
                                                                        nameKey="name"
                                                                        cx="50%"
                                                                        cy="45%"
                                                                        innerRadius={55}
                                                                        outerRadius={95}
                                                                        paddingAngle={2}
                                                                        isAnimationActive={false}
                                                                    >
                                                                        {assetChartData.map((_, index) => (
                                                                            <Cell key={`cell-${index}`} fill={ASSET_COLORS[index % ASSET_COLORS.length]} />
                                                                        ))}
                                                                    </Pie>
                                                                    <RechartsTooltip formatter={(value: any, name: any) => [`${value} asset(s)`, name]} />
                                                                    <Legend
                                                                        verticalAlign="bottom"
                                                                        height={36}
                                                                        formatter={(value: any) => {
                                                                            const item = assetChartData.find((d) => d.name === value);
                                                                            return `${value}: ${item?.value ?? 0}`;
                                                                        }}
                                                                    />
                                                                </PieChart>
                                                            </ResponsiveContainer>
                                                        )}
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
                                                            <BarChart data={invoiceAmountChartData} margin={{ top: 20, right: 8, left: 8, bottom: 0 }}>
                                                                <CartesianGrid strokeDasharray="3 3" />
                                                                <XAxis dataKey="name" />
                                                                <YAxis width={70} tickFormatter={(v: number) => formatCompactCurrency(Number(v))} />
                                                                <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} />
                                                                <Bar dataKey="amount" fill="#f59e0b" radius={[6, 6, 0, 0]}>
                                                                    <LabelList
                                                                        dataKey="amount"
                                                                        position="top"
                                                                        formatter={(v: any) => formatCompactCurrency(Number(v))}
                                                                    />
                                                                </Bar>
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
                                    slots={{ toolbar: GridToolbar }}
                                    slotProps={{ toolbar: { showQuickFilter: true } }}
                                />
                            </Box>
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
                                    slots={{ toolbar: GridToolbar }}
                                    slotProps={{ toolbar: { showQuickFilter: true } }}
                                />
                            </Box>
                        </Box>
                    )}

                    {tabIndex === 3 && (
                        <Box>
                            <Box display="flex" justifyContent="space-between" mb={2}>
                                <Typography variant="h6">Subjects</Typography>
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

                    {tabIndex === 4 && (
                        <Box>
                            <Typography variant="h6" gutterBottom>Departments</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Organize subjects and assign Heads of Department (HOD).
                            </Typography>
                            <Box display="flex" gap={2} mb={3} flexWrap="wrap" alignItems="center">
                                <TextField
                                    size="small"
                                    label="Department name"
                                    value={newDeptName}
                                    onChange={(e) => setNewDeptName(e.target.value)}
                                />
                                <FormControl size="small" sx={{ minWidth: 220 }}>
                                    <InputLabel>HOD (optional)</InputLabel>
                                    <Select
                                        value={newDeptHodUserId}
                                        label="HOD (optional)"
                                        onChange={(e) => setNewDeptHodUserId(e.target.value)}
                                    >
                                        <MenuItem value="">
                                            <em>Assign later</em>
                                        </MenuItem>
                                        {hodCandidates.map((c) => (
                                            <MenuItem key={c.userId} value={c.userId}>
                                                {c.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Button
                                    variant="contained"
                                    disabled={!newDeptName.trim()}
                                    onClick={async () => {
                                        if (!newDeptName.trim()) return;
                                        const res = await fetch('/api/departments', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                name: newDeptName.trim(),
                                                hodUserId: newDeptHodUserId || null,
                                            }),
                                        });
                                        if (!res.ok) {
                                            notify((await res.text()) || 'Failed to create department.', 'error');
                                            return;
                                        }
                                        setNewDeptName('');
                                        setNewDeptHodUserId('');
                                        fetchDepartments();
                                        fetchUsers();
                                        notify('Department created.');
                                    }}
                                >
                                    Add department
                                </Button>
                            </Box>
                            <Box sx={{ height: 360, width: '100%' }}>
                                <DataGrid
                                    rows={departments}
                                    columns={[
                                        { field: 'name', headerName: 'Name', flex: 1 },
                                        { field: 'code', headerName: 'Code', width: 100 },
                                        {
                                            field: 'hod',
                                            headerName: 'HOD',
                                            flex: 1,
                                            valueGetter: (_: unknown, row: any) =>
                                                row?.hod ? `${row.hod.firstName} ${row.hod.lastName}` : 'Unassigned',
                                        },
                                        {
                                            field: 'subjects',
                                            headerName: 'Subjects',
                                            width: 100,
                                            valueGetter: (_: unknown, row: any) => row?._count?.subjects ?? 0,
                                        },
                                        {
                                            field: 'deptActions',
                                            headerName: 'Actions',
                                            width: 140,
                                            sortable: false,
                                            renderCell: (params: any) => (
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => {
                                                        setHodDepartment({
                                                            id: params.row.id,
                                                            name: params.row.name,
                                                            hodUserId: params.row.hodUserId ?? params.row.hod?.id ?? null,
                                                        });
                                                        setHodModalOpen(true);
                                                    }}
                                                >
                                                    Assign HOD
                                                </Button>
                                            ),
                                        },
                                    ]}
                                    loading={loading}
                                    disableRowSelectionOnClick
                                />
                            </Box>
                        </Box>
                    )}
                </Box>
            </Paper>

            <AddClassModal
                open={isClassModalOpen}
                onClose={() => setIsClassModalOpen(false)}
                onSuccess={() => { fetchClasses(); if (tabIndex === 0) fetchOverview(); notify('Class created.'); }}
            />
            <AddUserModal
                open={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
                onSuccess={() => { fetchUsers(); if (tabIndex === 0) fetchOverview(); }}
            />
            <AssignTeacherModal
                open={assignOpen}
                onClose={() => setAssignOpen(false)}
                title={assignTitle}
                description={assignDescription}
                teachers={teacherOptions}
                initialTeacherProfileId={assignInitialTeacherProfileId}
                onSave={handleSaveAssignment}
            />
            <AssignHodModal
                open={hodModalOpen}
                onClose={() => setHodModalOpen(false)}
                departmentName={hodDepartment?.name ?? ''}
                candidates={hodCandidates}
                initialHodUserId={hodDepartment?.hodUserId ?? null}
                onSave={handleSaveHod}
            />
            <ClassSubjectsModal
                open={classSubjectsOpen}
                onClose={() => setClassSubjectsOpen(false)}
                classInfo={classSubjectsTarget ? {
                    id: classSubjectsTarget.id,
                    name: classSubjectsTarget.name,
                    grade: classSubjectsTarget.grade,
                } : null}
                subjects={subjects}
                teachers={teacherOptions}
                onUpdated={fetchClasses}
                onNotify={notify}
            />

            <Snackbar
                open={!!toast}
                autoHideDuration={5000}
                onClose={() => setToast(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={toast?.severity ?? 'success'} variant="filled" onClose={() => setToast(null)} sx={{ width: '100%' }}>
                    {toast?.msg}
                </Alert>
            </Snackbar>
        </Container>
    );
}

export default function PrincipalDashboardPage() {
    return (
        <Suspense fallback={
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                <CircularProgress />
            </Box>
        }>
            <PrincipalDashboard />
        </Suspense>
    );
}
