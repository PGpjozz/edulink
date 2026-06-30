'use client';

import { useSession } from 'next-auth/react';
import { Container, Typography, Paper, Box, Stack } from '@mui/material';
import { Campaign as CampaignIcon } from '@mui/icons-material';
import AnnouncementsFeed from '@/app/components/AnnouncementsFeed';

export default function StaffDashboard() {
    const { data: session } = useSession();
    const name = session?.user?.name ?? 'there';

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                Welcome, {name}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
                Your staff workspace. Keep up with school announcements and messages here.
            </Typography>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <CampaignIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight="bold">
                        Announcements
                    </Typography>
                </Box>
                <Stack spacing={1}>
                    <AnnouncementsFeed compact />
                </Stack>
            </Paper>
        </Container>
    );
}
