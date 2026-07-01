'use client';

import { Container } from '@mui/material';
import MessagingInterface from '@/app/components/MessagingInterface';
import PageHeader from '@/app/components/ui/PageHeader';
import PageTransition from '@/app/components/ui/PageTransition';
import ContentPanel from '@/app/components/ui/ContentPanel';

export default function MessagesPage() {
    return (
        <PageTransition>
            <Container maxWidth="xl">
                <PageHeader
                    title="Messages"
                    subtitle="Contact teachers, parents, or school staff directly."
                />
                <ContentPanel noPadding>
                    <MessagingInterface />
                </ContentPanel>
            </Container>
        </PageTransition>
    );
}
