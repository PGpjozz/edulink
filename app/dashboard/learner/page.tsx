'use client';

import { Container, Typography, Box } from '@mui/material';
import { useSession } from 'next-auth/react';
import LearnerProgressView from '@/app/components/LearnerProgressView';
import LearnerTodayPanel from '@/app/components/LearnerTodayPanel';

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

export default function LearnerDashboard() {
    const { data: session } = useSession();
    const firstName = session?.user?.name?.split(' ')[0] ?? 'there';

    return (
        <Container maxWidth="xl" sx={{ mt: 4 }}>
            <Box mb={3}>
                <Typography variant="h4" fontWeight="bold">
                    {getGreeting()}, {firstName}
                </Typography>
                <Typography color="text.secondary">
                    Here&apos;s what&apos;s happening with your learning today.
                </Typography>
            </Box>
            <LearnerTodayPanel />
            <LearnerProgressView />
        </Container>
    );
}
