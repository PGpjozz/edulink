'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Button,
    Container,
    TextField,
    Typography,
    Paper,
    Tabs,
    Tab,
    Alert,
    CircularProgress
} from '@mui/material';
import { motion } from 'framer-motion';

export default function SignIn() {
    const router = useRouter();
    const [tabIndex, setTabIndex] = useState(0); // 0: Email, 1: ID Number
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const res = await signIn('credentials', {
            identifier,
            password,
            redirect: false,
        });

        if (res?.error) {
            setError('Invalid credentials');
            setLoading(false);
        } else {
            router.push('/dashboard');
            router.refresh();
        }
    };

    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        setTabIndex(newValue);
        setIdentifier('');
        setPassword('');
        setError('');
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
                    Sign in to your account
                </Typography>

                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tabs value={tabIndex} onChange={handleTabChange} variant="fullWidth">
                        <Tab label="Staff & Parents" />
                        <Tab label="Learners" />
                    </Tabs>
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Box component="form" onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        label={tabIndex === 0 ? "Email Address" : "ID Number"}
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        margin="normal"
                        required
                        placeholder={tabIndex === 0 ? "Enter your email" : "Enter your ID number"}
                    />
                    <TextField
                        fullWidth
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        margin="normal"
                        required
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
