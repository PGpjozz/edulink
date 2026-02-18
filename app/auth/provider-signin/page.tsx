'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Box,
    Button,
    Container,
    TextField,
    Typography,
    Paper,
    Alert,
    CircularProgress
} from '@mui/material';
import { motion } from 'framer-motion';

function ProviderSignInInner() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard/provider';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const res = await signIn('credentials', {
            identifier: email,
            password,
            redirect: false,
        });

        if (res?.error) {
            setError('Invalid credentials');
            setLoading(false);
            return;
        }

        router.push(callbackUrl);
        router.refresh();
    };

    return (
        <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', minHeight: '100vh' }}>
            <Paper
                component={motion.div}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                elevation={3}
                sx={{ p: 4, width: '100%', borderRadius: 4 }}
            >
                <Typography variant="h4" component="h1" gutterBottom align="center" fontWeight="bold" color="primary">
                    EduLink
                </Typography>
                <Typography variant="body1" align="center" color="text.secondary" gutterBottom>
                    SaaS Provider Sign In
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Box component="form" onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        label="Provider Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        margin="normal"
                        required
                        placeholder="provider@edulink.com"
                        autoComplete="email"
                    />
                    <TextField
                        fullWidth
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        margin="normal"
                        required
                        autoComplete="current-password"
                    />

                    <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        type="submit"
                        sx={{ mt: 3, mb: 2 }}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}

export default function ProviderSignIn() {
    return (
        <Suspense fallback={null}>
            <ProviderSignInInner />
        </Suspense>
    );
}
