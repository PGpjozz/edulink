'use client';

import { Container, Typography, Box } from '@mui/material';
import MessagingInterface from '@/app/components/MessagingInterface';

export default function MessagesPage() {
    return (
        <Container maxWidth="xl" sx={{ mt: 4 }}>
            <Box mb={4}>
                <Typography variant="h4" fontWeight="bold">My Messages</Typography>
                <Typography color="text.secondary">Contact teachers, parents, or administration.</Typography>
            </Box>
            <MessagingInterface />
        </Container>
    );
}
