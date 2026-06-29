'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Container, Typography, Box, Paper, TextField, Button, Alert, Stack,
} from '@mui/material';

export default function AcceptInvitePage() {
    const params = useParams();
    const router = useRouter();
    const token = params.token as string;
    const [invite, setInvite] = useState<{
        email: string;
        role: string;
        firstName?: string;
        lastName?: string;
        school?: { name: string };
    } | null>(null);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch(`/api/invites/${token}`)
            .then((r) => r.json())
            .then((d) => {
                if (!d.valid && d.error) setError(d.error);
                else if (!d.valid) setError('Invalid or expired invite');
                else setInvite({
                    email: d.email,
                    role: d.role,
                    firstName: d.firstName,
                    lastName: d.lastName,
                    school: { name: d.schoolName },
                });
            });
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirm) {
            setError('Passwords do not match');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        setLoading(true);
        setError('');
        const res = await fetch(`/api/invites/${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) {
            setError(data.error || 'Could not accept invite');
            return;
        }
        router.push('/auth/signin?invited=1');
    };

    if (!invite && !error) {
        return (
            <Container maxWidth="sm" sx={{ mt: 8 }}>
                <Typography>Loading invite…</Typography>
            </Container>
        );
    }

    return (
        <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
            <Paper sx={{ p: 4 }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Join {invite?.school?.name ?? 'your school'}
                </Typography>
                {invite && (
                    <Typography color="text.secondary" sx={{ mb: 3 }}>
                        You&apos;ve been invited as <strong>{invite.role.replace('_', ' ')}</strong>
                        {invite.email ? ` (${invite.email})` : ''}.
                    </Typography>
                )}
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {invite && (
                    <Box component="form" onSubmit={handleSubmit}>
                        <Stack spacing={2}>
                            <TextField
                                label="Create password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <TextField
                                label="Confirm password"
                                type="password"
                                required
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                            />
                            <Button type="submit" variant="contained" fullWidth disabled={loading}>
                                {loading ? 'Creating account…' : 'Accept invite & sign in'}
                            </Button>
                        </Stack>
                    </Box>
                )}
            </Paper>
        </Container>
    );
}
