'use client';

import { useState, useEffect } from 'react';
import {
    Container, Typography, Box, Paper, TextField, Button, FormControl,
    InputLabel, Select, MenuItem, Alert, Stack, Chip,
} from '@mui/material';

const ROLES = ['PRINCIPAL', 'SCHOOL_ADMIN', 'HOD', 'TEACHER', 'PARENT'];

export default function InvitesPage() {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('TEACHER');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [result, setResult] = useState<{ acceptUrl?: string; devLink?: string; emailSent?: boolean } | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [pending, setPending] = useState<any[]>([]);

    const loadPending = () => {
        fetch('/api/invites')
            .then((r) => r.json())
            .then((d) => setPending(Array.isArray(d) ? d : []));
    };

    useEffect(() => { loadPending(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResult(null);
        const res = await fetch('/api/invites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, role, firstName, lastName }),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) {
            setError(data.error || 'Failed to create invite');
            return;
        }
        setResult(data);
        setEmail('');
        loadPending();
    };

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>Invite staff</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
                Send an invite link so staff can set their password and join your school.
            </Typography>

            <Paper sx={{ p: 3, mb: 3 }}>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {result?.acceptUrl && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        Invite created.
                        {result.emailSent
                            ? ' An email was sent to the invitee.'
                            : ' Share this link (email not configured):'}
                        {!result.emailSent && (
                            <>
                                <br />
                                <strong>{result.devLink || result.acceptUrl}</strong>
                            </>
                        )}
                    </Alert>
                )}
                <Box component="form" onSubmit={handleSubmit}>
                    <Stack spacing={2}>
                        <TextField label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                        <Box display="flex" gap={2}>
                            <TextField label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} fullWidth />
                            <TextField label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} fullWidth />
                        </Box>
                        <FormControl fullWidth>
                            <InputLabel>Role</InputLabel>
                            <Select value={role} label="Role" onChange={(e) => setRole(e.target.value)}>
                                {ROLES.map((r) => (
                                    <MenuItem key={r} value={r}>{r.replace('_', ' ')}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button type="submit" variant="contained" disabled={loading}>
                            {loading ? 'Creating…' : 'Create invite link'}
                        </Button>
                    </Stack>
                </Box>
            </Paper>

            <Typography variant="h6" gutterBottom>Pending invites</Typography>
            <Stack spacing={1}>
                {pending.map((p) => (
                    <Paper key={p.id} variant="outlined" sx={{ p: 2 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box>
                                <Typography fontWeight="medium">{p.email}</Typography>
                                <Chip size="small" label={p.role} sx={{ mt: 0.5 }} />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                                Expires {new Date(p.expiresAt).toLocaleDateString()}
                            </Typography>
                        </Box>
                    </Paper>
                ))}
                {pending.length === 0 && (
                    <Typography color="text.secondary">No pending invites.</Typography>
                )}
            </Stack>
        </Container>
    );
}
