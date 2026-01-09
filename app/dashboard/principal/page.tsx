'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Tabs,
    Tab,
    Paper,
    Button
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import AddClassModal from './AddClassModal';
import AddUserModal from './AddUserModal';

interface ClassData {
    id: string;
    name: string;
    grade: string;
    _count: { learners: number };
    teacher?: { user: { firstName: string; lastName: string } };
}

interface UserData {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    isActive: boolean;
}

const classColumns: GridColDef[] = [
    { field: 'name', headerName: 'Class Name', flex: 1 },
    { field: 'grade', headerName: 'Grade', width: 100 },
    {
        field: 'learners', headerName: 'Learners', width: 100,
        valueGetter: (params: any) => params.row._count?.learners || 0
    },
    {
        field: 'teacher', headerName: 'Class Teacher', flex: 1,
        valueGetter: (params: any) => {
            const t = params.row.teacher?.user;
            return t ? `${t.firstName} ${t.lastName}` : 'Unassigned';
        }
    },
    {
        field: 'actions',
        headerName: 'Actions',
        width: 150,
        renderCell: (params: any) => (
            <Button
                variant="outlined"
                size="small"
                onClick={() => window.location.href = `/dashboard/principal/class/${params.row.id}/timetable`}
            >
                Timetable
            </Button>
        )
    }
];

const userColumns: GridColDef[] = [
    { field: 'firstName', headerName: 'First Name', flex: 1 },
    { field: 'lastName', headerName: 'Last Name', flex: 1 },
    {
        field: 'email', headerName: 'Email / ID', flex: 1.5,
        valueGetter: (params: any) => params.row.email || params.row.idNumber || '-'
    },
    { field: 'role', headerName: 'Role', width: 120 },
    { field: 'isActive', headerName: 'Status', width: 100, type: 'boolean' },
];

export default function PrincipalDashboard() {
    const [tabIndex, setTabIndex] = useState(0);

    // Data
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(false);

    // Modals
    const [isClassModalOpen, setIsClassModalOpen] = useState(false);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);

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

    useEffect(() => {
        if (tabIndex === 1) fetchClasses();
        if (tabIndex === 2) fetchUsers();
    }, [tabIndex]);

    return (
        <Container maxWidth="xl" sx={{ mt: 4 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                School Management
            </Typography>

            <Paper sx={{ width: '100%', mb: 4 }}>
                <Tabs
                    value={tabIndex}
                    onChange={(_, v) => setTabIndex(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    indicatorColor="primary"
                    textColor="primary"
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="Overview" />
                    <Tab label="Classes & Grades" />
                    <Tab label="Teachers & Staff" />
                </Tabs>

                <Box sx={{ p: 3 }}>
                    {tabIndex === 0 && (
                        <Typography>Welcome back, Principal. Overview stats here.</Typography>
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
                </Box>
            </Paper>
        </Container>
    );
}
