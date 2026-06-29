'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Box, Button, Container, Paper, Typography, Alert } from '@mui/material';

const ERROR_MESSAGES: Record<string, string> = {
    Configuration:
        'Auth is misconfigured. Ensure NEXTAUTH_SECRET and DATABASE_URL are set in .env.local, then restart the dev server.',
    AccessDenied: 'You do not have permission to sign in.',
    Verification: 'The sign-in link is invalid or has expired.',
    Default: 'Something went wrong during sign-in.',
};

function AuthErrorInner() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error') || 'Default';
    const message = ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default;

    return (
        <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', minHeight: '100vh' }}>
            <Paper sx={{ p: 4, width: '100%', borderRadius: 4 }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Sign-in error
                </Typography>
                <Alert severity="error" sx={{ mb: 3 }}>
                    {message}
                </Alert>
                {error === 'Configuration' && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Stop the server with Ctrl+C, run <code>npm run dev</code> again, then try signing in.
                    </Typography>
                )}
                <Box display="flex" gap={2} flexWrap="wrap">
                    <Button component={Link} href="/auth/signin" variant="contained">
                        School sign in
                    </Button>
                    <Button component={Link} href="/auth/provider-signin" variant="outlined">
                        Provider sign in
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}

export default function AuthErrorPage() {
    return (
        <Suspense>
            <AuthErrorInner />
        </Suspense>
    );
}
