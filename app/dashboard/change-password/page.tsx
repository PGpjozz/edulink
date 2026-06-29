'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Box, Button, Container, Paper, TextField, Typography, Alert,
} from '@mui/material';

export default function ChangePasswordPage() {
    const { data: session, update } = useSession();
    const router = useRouter();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 8) {
            setError('New password must be at least 8 characters');
            return;
        }
        if (newPassword !== confirm) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        const res = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword }),
        });
        const data = await res.json();
        setLoading(false);

        if (!res.ok) {
            setError(data.error || 'Failed to update password');
            return;
        }

        await update({ mustChangePassword: false });
        router.push('/dashboard');
        router.refresh();
    };

    return (
        <Container maxWidth="sm" sx={{ mt: 8 }}>
            <Paper sx={{ p: 4, borderRadius: 3 }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Change your password
                </Typography>
                {session?.user?.mustChangePassword && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        You must set a new password before continuing.
                    </Alert>
                )}
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <Box component="form" onSubmit={handleSubmit}>
                    <TextField
                        fullWidth margin="normal" type="password" label="Current password"
                        value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required
                    />
                    <TextField
                        fullWidth margin="normal" type="password" label="New password"
                        value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required
                    />
                    <TextField
                        fullWidth margin="normal" type="password" label="Confirm new password"
                        value={confirm} onChange={(e) => setConfirm(e.target.value)} required
                    />
                    <Button fullWidth variant="contained" type="submit" sx={{ mt: 3 }} disabled={loading}>
                        {loading ? 'Saving…' : 'Update password'}
                    </Button>
                    {!session?.user?.mustChangePassword && (
                        <Button fullWidth sx={{ mt: 1 }} onClick={() => router.back()}>
                            Cancel
                        </Button>
                    )}
                    {session?.user?.mustChangePassword && (
                        <Button fullWidth color="inherit" sx={{ mt: 1 }} onClick={() => signOut({ callbackUrl: '/auth/signin' })}>
                            Sign out
                        </Button>
                    )}
                </Box>
            </Paper>
        </Container>
    );
}
