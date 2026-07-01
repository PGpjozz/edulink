'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Box, CircularProgress, Paper, Typography, Alert } from '@mui/material';
import BrandLogo from '@/app/components/BrandLogo';

function ImpersonateInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token') ?? '';
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token) {
            setError('Missing impersonation token');
            return;
        }

        signIn('credentials', {
            impersonationToken: token,
            redirect: false,
        }).then((result) => {
            if (result?.error) {
                setError('Invalid or expired impersonation link');
                return;
            }
            router.replace('/dashboard');
            router.refresh();
        });
    }, [token, router]);

    return (
        <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" p={2}>
            <Paper sx={{ p: 4, maxWidth: 420, width: '100%', textAlign: 'center' }}>
                <Box display="flex" justifyContent="center" mb={2}>
                    <BrandLogo variant="icon" height={48} />
                </Box>
                {error ? (
                    <>
                        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                        <Typography variant="body2" color="text.secondary">
                            Request a new impersonation link from the provider portal.
                        </Typography>
                    </>
                ) : (
                    <>
                        <CircularProgress sx={{ mb: 2 }} />
                        <Typography fontWeight={600}>Signing you in securely…</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Support impersonation session (audited)
                        </Typography>
                    </>
                )}
            </Paper>
        </Box>
    );
}

export default function ImpersonatePage() {
    return (
        <Suspense fallback={<CircularProgress />}>
            <ImpersonateInner />
        </Suspense>
    );
}
