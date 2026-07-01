'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
import AddUserModal from '../../AddUserModal';
import type { UserData } from '../../_components/types';

export default function PrincipalUsersPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(false);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);

    const fetchUsers = () => {
        setLoading(true);
        fetch('/api/users').then((r) => r.json()).then(setUsers).finally(() => setLoading(false));
    };

    useEffect(() => { fetchUsers(); }, []);

    const userColumns: GridColDef[] = [
        { field: 'firstName', headerName: 'First Name', flex: 1 },
        { field: 'lastName', headerName: 'Last Name', flex: 1 },
        { field: 'email', headerName: 'Email / ID', flex: 1.5, valueGetter: (_v, row) => row?.email || row?.idNumber || '-' },
        { field: 'role', headerName: 'Role', width: 120 },
        { field: 'isActive', headerName: 'Status', width: 100, type: 'boolean' },
    ];

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="h6">School Users</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsUserModalOpen(true)}>Add user</Button>
            </Box>
            <Box sx={{ height: 480, width: '100%' }}>
                <DataGrid rows={users} columns={userColumns} loading={loading} disableRowSelectionOnClick slots={{ toolbar: GridToolbar }} slotProps={{ toolbar: { showQuickFilter: true } }} />
            </Box>
            <AddUserModal open={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} onSuccess={fetchUsers} />
        </Box>
    );
}
