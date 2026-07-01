'use client';

import { useState } from 'react';
import { signIn, signOut, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Button,
    TextField,
    Typography,
    Paper,
    Tabs,
    Tab,
    Alert,
    CircularProgress,
    Grid,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import { School, Lock, Email } from '@mui/icons-material';
import { motion } from 'framer-motion';

export default function SignIn() {
    const router = useRouter();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [tabIndex, setTabIndex] = useState(0);
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
            setError('Invalid credentials. Please check your email or ID number and password.');
            setLoading(false);
        } else {
            const session = await getSession();
            if (session?.user?.mustChangePassword) {
                router.push('/dashboard/change-password');
                return;
            }
            if (session?.user?.role === 'PROVIDER') {
                await signOut({ redirect: false });
                setError('Provider accounts must sign in at the provider portal.');
                setLoading(false);
                return;
            }
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

    const formPanel = (
        <Paper
            component={motion.div}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            elevation={0}
            sx={{
                p: { xs: 3, sm: 4 },
                width: '100%',
                maxWidth: 440,
                borderRadius: 4,
                border: '1px solid',
                borderColor: 'divider',
            }}
        >
            <Typography variant="h5" fontWeight="bold" gutterBottom>
                Sign in
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {tabIndex === 0 ? 'Staff and parents use email' : 'Learners use ID number'}
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
                    label={tabIndex === 0 ? 'Email address' : 'ID number'}
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    margin="normal"
                    required
                    InputProps={{ startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} /> }}
                    placeholder={tabIndex === 0 ? 'you@school.edu.za' : 'Your learner ID'}
                />
                <TextField
                    fullWidth
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    margin="normal"
                    required
                    InputProps={{ startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} /> }}
                />

                <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    type="submit"
                    sx={{ mt: 3, mb: 1, py: 1.25 }}
                    disabled={loading}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign in'}
                </Button>
            </Box>

            <Typography variant="body2" align="center" color="text.secondary" sx={{ mt: 2 }}>
                <a href="/auth/forgot-password" style={{ color: theme.palette.primary.main }}>Forgot password?</a>
            </Typography>
            <Typography variant="body2" align="center" color="text.secondary" sx={{ mt: 1 }}>
                EduLink provider?{' '}
                <a href="/auth/provider-signin" style={{ color: theme.palette.primary.main, fontWeight: 600 }}>
                    Provider portal
                </a>
            </Typography>
        </Paper>
    );

    if (isMobile) {
        return (
            <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" p={2} bgcolor="background.default">
                {formPanel}
            </Box>
        );
    }

    return (
        <Grid container minHeight="100vh">
            <Grid
                size={{ xs: 12, md: 6 }}
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    p: 6,
                    background: `linear-gradient(145deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    color: 'primary.contrastText',
                }}
            >
                <Box maxWidth={400}>
                    <School sx={{ fontSize: 56, mb: 2, opacity: 0.9 }} />
                    <Typography variant="h3" fontWeight="bold" gutterBottom>
                        EduLink
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9, mb: 3, fontWeight: 400 }}>
                        Your school, connected — attendance, grades, messages, and more in one place.
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.75 }}>
                        Parents, teachers, and learners stay in sync with real-time updates from your school.
                    </Typography>
                </Box>
            </Grid>
            <Grid
                size={{ xs: 12, md: 6 }}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 4,
                    bgcolor: 'background.default',
                }}
            >
                {formPanel}
            </Grid>
        </Grid>
    );
}
