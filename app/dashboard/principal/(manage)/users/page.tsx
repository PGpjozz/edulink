'use client';

import { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Select,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
import AddUserModal from '../../AddUserModal';
import type { ClassOption, UserData } from '../../_components/types';

function errorText(msg: string) {
    try {
        const parsed = JSON.parse(msg);
        if (parsed?.error) return parsed.error;
    } catch {
        /* plain text */
    }
    return msg;
}

export default function PrincipalUsersPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editing, setEditing] = useState<UserData | null>(null);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [classId, setClassId] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [alsoTeaches, setAlsoTeaches] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fetchUsers = () => {
        setLoading(true);
        fetch('/api/users').then((r) => r.json()).then((data) => setUsers(Array.isArray(data) ? data : [])).finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchUsers();
        fetch('/api/classes')
            .then((r) => r.json())
            .then((data) => setClasses(Array.isArray(data) ? data.map((c) => ({ id: c.id, name: c.name, grade: String(c.grade) })) : []))
            .catch(() => setClasses([]));
    }, []);

    const openEdit = (row: UserData) => {
        setEditing(row);
        setFirstName(row.firstName);
        setLastName(row.lastName);
        setEmail(row.email || '');
        setClassId(row.classId || '');
        setIsActive(row.isActive);
        setAlsoTeaches(Boolean(row.teacherProfileId));
        setError('');
    };

    const saveEdit = async () => {
        if (!editing) return;
        setSaving(true);
        setError('');
        try {
            const res = await fetch(`/api/users/${editing.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    email: editing.role === 'LEARNER' ? undefined : email,
                    isActive,
                    classId: editing.role === 'LEARNER' ? classId || null : undefined,
                    alsoTeaches: ['PRINCIPAL', 'SCHOOL_ADMIN', 'SCHOOL_OWNER', 'HOD'].includes(editing.role) ? alsoTeaches : undefined,
                }),
            });
            if (!res.ok) throw new Error(errorText(await res.text()) || 'Could not update this person');
            setEditing(null);
            fetchUsers();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not update this person');
        } finally {
            setSaving(false);
        }
    };

    const userColumns: GridColDef[] = [
        { field: 'firstName', headerName: 'First Name', flex: 1 },
        { field: 'lastName', headerName: 'Last Name', flex: 1 },
        { field: 'email', headerName: 'Email / ID', flex: 1.5, valueGetter: (_v, row) => row?.email || row?.idNumber || '-' },
        { field: 'role', headerName: 'Role', width: 130 },
        {
            field: 'className',
            headerName: 'Class',
            flex: 1,
            valueGetter: (_v, row) => (row?.role === 'LEARNER' ? row?.className || 'Not in a class' : '—'),
        },
        { field: 'isActive', headerName: 'Active', width: 90, type: 'boolean' },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 110,
            renderCell: (params) => (
                <Button size="small" variant="outlined" onClick={() => openEdit(params.row)}>Edit</Button>
            ),
        },
    ];

    const isLearner = editing?.role === 'LEARNER';

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" mb={2}>
                <Box>
                    <Typography variant="h6">School Users</Typography>
                    <Typography variant="body2" color="text.secondary">Edit learners and staff, move a learner to another class, or deactivate an account.</Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsUserModalOpen(true)}>Add user</Button>
            </Box>
            <Box sx={{ height: 480, width: '100%' }}>
                <DataGrid rows={users} columns={userColumns} loading={loading} disableRowSelectionOnClick slots={{ toolbar: GridToolbar }} slotProps={{ toolbar: { showQuickFilter: true } }} />
            </Box>
            <AddUserModal open={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} onSuccess={fetchUsers} />

            <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Edit {editing?.role === 'LEARNER' ? 'learner' : 'staff'}</DialogTitle>
                <DialogContent>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <TextField margin="dense" label="First name" fullWidth value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    <TextField margin="dense" label="Last name" fullWidth value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    {isLearner ? (
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Class</InputLabel>
                            <Select value={classId} label="Class" onChange={(e) => setClassId(e.target.value)}>
                                {classes.map((c) => (
                                    <MenuItem key={c.id} value={c.id}>{c.name} (Grade {c.grade})</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    ) : (
                        <TextField margin="dense" label="Email" type="email" fullWidth value={email} onChange={(e) => setEmail(e.target.value)} />
                    )}
                    {editing && ['PRINCIPAL', 'SCHOOL_ADMIN', 'SCHOOL_OWNER', 'HOD'].includes(editing.role) && (
                        <FormControlLabel
                            control={<Switch checked={alsoTeaches} onChange={(e) => setAlsoTeaches(e.target.checked)} />}
                            label="Also teaches"
                        />
                    )}
                    <FormControlLabel
                        control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
                        label={isActive ? 'Active' : 'Deactivated'}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditing(null)}>Cancel</Button>
                    <Button variant="contained" onClick={saveEdit} disabled={saving}>Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
