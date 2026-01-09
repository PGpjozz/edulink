'use client';

import { Container, Box } from '@mui/material';
import PTMScheduler from '@/app/components/PTMScheduler';

export default function TeacherMeetingsPage() {
    return (
        <Container maxWidth="xl" sx={{ mt: 4 }}>
            <Box mb={4}>
                <PTMScheduler role="TEACHER" />
            </Box>
        </Container>
    );
}
