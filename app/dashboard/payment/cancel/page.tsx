'use client';

import { Container, Typography, Paper, Alert, Button } from '@mui/material';
import Link from 'next/link';

export default function PaymentCancelPage() {
    return (
        <Container maxWidth="sm" sx={{ mt: 8 }}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Alert severity="warning" sx={{ mb: 2 }}>Payment cancelled</Alert>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                    No charge was made. You can try again from your billing page.
                </Typography>
                <Button component={Link} href="/dashboard" variant="contained">
                    Back to dashboard
                </Button>
            </Paper>
        </Container>
    );
}
