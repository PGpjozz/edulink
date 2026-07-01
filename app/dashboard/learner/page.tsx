'use client';

import { Container } from '@mui/material';
import { useSession } from 'next-auth/react';
import LearnerProgressView from '@/app/components/LearnerProgressView';
import LearnerTodayPanel from '@/app/components/LearnerTodayPanel';
import PageHeader from '@/app/components/ui/PageHeader';
import PageTransition from '@/app/components/ui/PageTransition';

export default function LearnerDashboard() {
    const { data: session } = useSession();
    const firstName = session?.user?.name?.split(' ')[0] ?? 'Learner';

    return (
        <PageTransition>
            <Container maxWidth="xl">
                <PageHeader
                    title={`Welcome, ${firstName}`}
                    subtitle="Track your progress, homework, and announcements."
                />
                <LearnerTodayPanel />
                <LearnerProgressView hideHeader />
            </Container>
        </PageTransition>
    );
}
