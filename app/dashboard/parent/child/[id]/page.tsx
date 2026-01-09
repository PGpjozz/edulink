'use client';

import { Container, Button } from '@mui/material';
import LearnerProgressView from '@/app/components/LearnerProgressView';
import { useParams, useRouter } from 'next/navigation';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

export default function ChildProgressPage() {
    const params = useParams();
    const router = useRouter();
    const childId = params.id as string;

    return (
        <Container maxWidth="xl" sx={{ mt: 4 }}>
            <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => router.back()}
                sx={{ mb: 2 }}
            >
                Back to Children
            </Button>
            <LearnerProgressView childId={childId} />
        </Container>
    );
}
