'use client';

import { Container } from '@mui/material';
import LearnerProgressView from '@/app/components/LearnerProgressView';
import LearnerTodayPanel from '@/app/components/LearnerTodayPanel';

export default function LearnerDashboard() {
    return (
        <Container maxWidth="xl" sx={{ mt: 4 }}>
            <LearnerTodayPanel />
            <LearnerProgressView />
        </Container>
    );
}
