'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    Box, Button, Container, Paper, TextField, Typography, Alert,
} from '@mui/material';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [tempPassword, setTempPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setTempPassword('');

        const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        const data = await res.json();
        setLoading(false);
        setMessage(data.message || 'Check your email for reset instructions.');
        if (data.tempPassword) setTempPassword(data.tempPassword);
    };

    return (
        <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', minHeight: '100vh' }}>
            <Paper sx={{ p: 4, width: '100%', borderRadius: 3 }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Reset password
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Enter your school email address. If an account exists, a temporary password will be sent to you.
                </Typography>
                {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
                {tempPassword && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Temporary password: <strong>{tempPassword}</strong> — sign in and change it immediately.
                    </Alert>
                )}
                <Box component="form" onSubmit={handleSubmit}>
                    <TextField
                        fullWidth label="Email" type="email" value={email}
                        onChange={(e) => setEmail(e.target.value)} required margin="normal"
                    />
                    <Button fullWidth variant="contained" type="submit" sx={{ mt: 2 }} disabled={loading}>
                        {loading ? 'Processing…' : 'Reset password'}
                    </Button>
                    <Button fullWidth component={Link} href="/auth/signin" sx={{ mt: 1 }}>
                        Back to sign in
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}
