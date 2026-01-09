'use client';

import { Container } from '@mui/material';
import LearnerProgressView from '@/app/components/LearnerProgressView';

export default function LearnerDashboard() {
    return (
        <Container maxWidth="xl" sx={{ mt: 4 }}>
            <LearnerProgressView />
        </Container>
    );
}
