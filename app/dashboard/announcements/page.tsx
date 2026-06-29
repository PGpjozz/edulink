'use client';

import { Container, Typography, Box, Button } from '@mui/material';
import AnnouncementsFeed from '@/app/components/AnnouncementsFeed';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

const STAFF_ROLES = ['SCHOOL_OWNER', 'PRINCIPAL', 'SCHOOL_ADMIN', 'HOD', 'TEACHER'];

export default function AnnouncementsPage() {
    const { data: session } = useSession();
    const canPost = session?.user?.role && STAFF_ROLES.includes(session.user.role);
    const postHref =
        session?.user?.role === 'SCHOOL_OWNER'
            ? '/dashboard/school-owner/announcements'
            : '/dashboard/announcements/new';

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight="bold">Announcements</Typography>
                {canPost && (
                    <Button variant="contained" component={Link} href={postHref}>
                        Post announcement
                    </Button>
                )}
            </Box>
            <AnnouncementsFeed />
        </Container>
    );
}
