'use client';

import { useEffect, useState } from 'react';
import {
    Container, Typography, Box, Paper, Checkbox, FormControlLabel,
    FormGroup, Button, Alert, Stack, Chip,
} from '@mui/material';
import { PERMISSION_KEYS } from '@/lib/permissions';

type StaffUser = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    permissions: string[];
};

export default function PermissionsPage() {
    const [staff, setStaff] = useState<StaffUser[]>([]);
    const [selected, setSelected] = useState<StaffUser | null>(null);
    const [draft, setDraft] = useState<string[]>([]);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/users')
            .then((r) => r.json())
            .then((users) => {
                const list = (Array.isArray(users) ? users : []).filter((u: StaffUser) =>
                    ['TEACHER', 'HOD', 'SCHOOL_ADMIN', 'PRINCIPAL'].includes(u.role)
                );
                setStaff(list);
            });
    }, []);

    const selectUser = (u: StaffUser) => {
        setSelected(u);
        setDraft(u.permissions ?? []);
        setMessage('');
        setError('');
    };

    const toggle = (key: string) => {
        setDraft((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    };

    const save = async () => {
        if (!selected) return;
        setError('');
        setMessage('');
        const res = await fetch(`/api/users/${selected.id}/permissions`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ permissions: draft }),
        });
        const data = await res.json();
        if (!res.ok) {
            setError(data.error || 'Failed to save');
            return;
        }
        setMessage('Permissions updated.');
        setStaff((prev) => prev.map((u) => (u.id === selected.id ? { ...u, permissions: draft } : u)));
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>Staff permissions</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
                Grant extra capabilities beyond each role&apos;s defaults.
            </Typography>

            <Box display="flex" gap={3} flexDirection={{ xs: 'column', md: 'row' }}>
                <Paper sx={{ p: 2, minWidth: 280, flex: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>Staff</Typography>
                    <Stack spacing={1}>
                        {staff.map((u) => (
                            <Box
                                key={u.id}
                                onClick={() => selectUser(u)}
                                sx={{
                                    p: 1.5,
                                    borderRadius: 1,
                                    cursor: 'pointer',
                                    bgcolor: selected?.id === u.id ? 'action.selected' : 'transparent',
                                    '&:hover': { bgcolor: 'action.hover' },
                                }}
                            >
                                <Typography fontWeight="medium">{u.firstName} {u.lastName}</Typography>
                                <Chip size="small" label={u.role} sx={{ mt: 0.5 }} />
                            </Box>
                        ))}
                    </Stack>
                </Paper>

                <Paper sx={{ p: 3, flex: 2 }}>
                    {!selected ? (
                        <Typography color="text.secondary">Select a staff member.</Typography>
                    ) : (
                        <>
                            <Typography variant="h6" gutterBottom>
                                {selected.firstName} {selected.lastName}
                            </Typography>
                            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                            {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
                            <FormGroup>
                                {PERMISSION_KEYS.map((key) => (
                                    <FormControlLabel
                                        key={key}
                                        control={
                                            <Checkbox
                                                checked={draft.includes(key)}
                                                onChange={() => toggle(key)}
                                            />
                                        }
                                        label={key.replace(/_/g, ' ')}
                                    />
                                ))}
                            </FormGroup>
                            <Button variant="contained" sx={{ mt: 2 }} onClick={save}>
                                Save permissions
                            </Button>
                        </>
                    )}
                </Paper>
            </Box>
        </Container>
    );
}
