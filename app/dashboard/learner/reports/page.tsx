'use client';

import { Container, Typography, Box } from '@mui/material';
import PublishedReports from '@/app/components/PublishedReports';

export default function LearnerReportsPage() {
    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
            <Box mb={3}>
                <Typography variant="h4" fontWeight="bold">Report Cards</Typography>
                <Typography color="text.secondary">Your published academic reports, term by term.</Typography>
            </Box>
            <PublishedReports />
        </Container>
    );
}
