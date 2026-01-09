'use client';

import { Container, Box } from '@mui/material';
import BillingPortal from '@/app/components/BillingPortal';

export default function ParentBillingPage() {
    return (
        <Container maxWidth="xl" sx={{ mt: 4 }}>
            <Box mb={4}>
                <BillingPortal />
            </Box>
        </Container>
    );
}
