'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Container, Typography, Paper, Alert, Button, CircularProgress, Box } from '@mui/material';
import Link from 'next/link';

function PaymentReturnInner() {
    const searchParams = useSearchParams();
    const ref = searchParams.get('ref');
    const [status, setStatus] = useState<'loading' | 'pending' | 'paid' | 'failed'>('loading');

    useEffect(() => {
        if (!ref) {
            setStatus('pending');
            return;
        }
        let attempts = 0;
        const poll = () => {
            fetch(`/api/payfast/status?ref=${ref}`)
                .then((r) => r.json())
                .then((d) => {
                    if (d.status === 'COMPLETED') setStatus('paid');
                    else if (d.status === 'FAILED') setStatus('failed');
                    else if (attempts++ < 8) setTimeout(poll, 2000);
                    else setStatus('pending');
                })
                .catch(() => setStatus('pending'));
        };
        poll();
    }, [ref]);

    return (
        <Container maxWidth="sm" sx={{ mt: 8 }}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
                {status === 'loading' && <CircularProgress />}
                {status === 'paid' && (
                    <>
                        <Alert severity="success" sx={{ mb: 2 }}>Payment received. Thank you!</Alert>
                        <Typography color="text.secondary" sx={{ mb: 2 }}>
                            Your account will reflect the payment shortly.
                        </Typography>
                    </>
                )}
                {status === 'pending' && (
                    <>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Payment submitted. If you completed PayFast, confirmation may take a minute.
                        </Alert>
                    </>
                )}
                {status === 'failed' && (
                    <Alert severity="error" sx={{ mb: 2 }}>Payment was not completed.</Alert>
                )}
                <Button component={Link} href="/dashboard" variant="contained">
                    Back to dashboard
                </Button>
            </Paper>
        </Container>
    );
}

export default function PaymentReturnPage() {
    return (
        <Suspense fallback={<Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>}>
            <PaymentReturnInner />
        </Suspense>
    );
}
