'use client';

import { Container, Typography, Button, Box } from '@mui/material';
import { useRouter } from 'next/navigation';

export default function Unauthorized() {
    const router = useRouter();

    return (
        <Container maxWidth="sm" sx={{ textAlign: 'center', mt: 10 }}>
            <Typography variant="h3" color="error" gutterBottom>
                Access Denied
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
                You do not have permission to view this page.
            </Typography>
            <Box sx={{ mt: 4 }}>
                <Button variant="outlined" onClick={() => router.back()}>
                    Go Back
                </Button>
            </Box>
        </Container>
    );
}
