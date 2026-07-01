'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, Button, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import AssignHodModal from '../../AssignHodModal';
import type { UserData, HodCandidate } from '../../_components/types';

export default function PrincipalDepartmentsPage() {
    const [departments, setDepartments] = useState<any[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(false);
    const [newDeptName, setNewDeptName] = useState('');
    const [newDeptHodUserId, setNewDeptHodUserId] = useState('');
    const [hodModalOpen, setHodModalOpen] = useState(false);
    const [hodDepartment, setHodDepartment] = useState<{ id: string; name: string; hodUserId: string | null } | null>(null);

    const fetchDepartments = () => {
        setLoading(true);
        fetch('/api/departments').then((r) => r.json()).then((d) => setDepartments(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
    };

    const fetchUsers = () => {
        fetch('/api/users').then((r) => r.json()).then(setUsers);
    };

    useEffect(() => {
        fetchDepartments();
        fetchUsers();
    }, []);

    const hodCandidates: HodCandidate[] = users
        .filter((u) => ['TEACHER', 'PRINCIPAL', 'HOD', 'SCHOOL_ADMIN'].includes(u.role))
        .map((u) => ({ userId: u.id, name: `${u.firstName} ${u.lastName}`, role: u.role }));

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
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>Departments</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Organize subjects and assign Heads of Department (HOD).
            </Typography>
            <Box display="flex" gap={2} mb={3} flexWrap="wrap" alignItems="center">
                <TextField size="small" label="Department name" value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} />
                <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel>HOD (optional)</InputLabel>
                    <Select value={newDeptHodUserId} label="HOD (optional)" onChange={(e) => setNewDeptHodUserId(e.target.value)}>
                        <MenuItem value=""><em>Assign later</em></MenuItem>
                        {hodCandidates.map((c) => <MenuItem key={c.userId} value={c.userId}>{c.name}</MenuItem>)}
                    </Select>
                </FormControl>
                <Button variant="contained" onClick={async () => {
                    if (!newDeptName.trim()) return;
                    const res = await fetch('/api/departments', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: newDeptName.trim(), hodUserId: newDeptHodUserId || null }),
                    });
                    if (!res.ok) return;
                    setNewDeptName('');
                    setNewDeptHodUserId('');
                    fetchDepartments();
                    fetchUsers();
                }}>Add department</Button>
            </Box>
            <Box sx={{ height: 400, width: '100%' }}>
                <DataGrid
                    rows={departments}
                    loading={loading}
                    disableRowSelectionOnClick
                    columns={[
                        { field: 'name', headerName: 'Name', flex: 1 },
                        { field: 'code', headerName: 'Code', width: 100 },
                        { field: 'hod', headerName: 'HOD', flex: 1, valueGetter: (_v, row) => row?.hod ? `${row.hod.firstName} ${row.hod.lastName}` : 'Unassigned' },
                        { field: 'subjects', headerName: 'Subjects', width: 100, valueGetter: (_v, row) => row?._count?.subjects ?? 0 },
                        {
                            field: 'deptActions', headerName: 'Actions', width: 140, sortable: false,
                            renderCell: (params) => (
                                <Button size="small" variant="outlined" onClick={() => {
                                    setHodDepartment({ id: params.row.id, name: params.row.name, hodUserId: params.row.hodUserId ?? params.row.hod?.id ?? null });
                                    setHodModalOpen(true);
                                }}>Assign HOD</Button>
                            ),
                        },
                    ]}
                />
            </Box>
            <AssignHodModal open={hodModalOpen} onClose={() => setHodModalOpen(false)} departmentName={hodDepartment?.name ?? ''} candidates={hodCandidates} initialHodUserId={hodDepartment?.hodUserId ?? null} onSave={handleSaveHod} />
        </Box>
    );
}
