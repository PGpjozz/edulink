'use client';

import { Container, Button } from '@mui/material';
import AnnouncementsFeed from '@/app/components/AnnouncementsFeed';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import PageHeader from '@/app/components/ui/PageHeader';
import PageTransition from '@/app/components/ui/PageTransition';
import ContentPanel from '@/app/components/ui/ContentPanel';

const STAFF_ROLES = ['SCHOOL_OWNER', 'PRINCIPAL', 'SCHOOL_ADMIN', 'HOD', 'TEACHER'];

export default function AnnouncementsPage() {
    const { data: session } = useSession();
    const canPost = session?.user?.role && STAFF_ROLES.includes(session.user.role);
    const postHref =
        session?.user?.role === 'SCHOOL_OWNER'
            ? '/dashboard/school-owner/announcements'
            : '/dashboard/announcements/new';

    return (
        <PageTransition>
            <Container maxWidth="md">
                <PageHeader
                    title="Announcements"
                    subtitle="School-wide updates and notices for your community."
                    actions={
                        canPost ? (
                            <Button variant="contained" component={Link} href={postHref}>
                                Post announcement
                            </Button>
                        ) : undefined
                    }
                />
                <ContentPanel>
                    <AnnouncementsFeed />
                </ContentPanel>
            </Container>
        </PageTransition>
    );
}
