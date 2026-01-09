'use client';

import { useState, useEffect } from 'react';
import { Container, Button, CircularProgress, Alert, Box, Typography } from '@mui/material';
import { useSearchParams } from 'next/navigation';
import ReportCard from '@/app/components/ReportCard';
import { ArrowBack } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

export default function LearnerReportPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const searchParams = useSearchParams();
    const router = useRouter();
    const childId = searchParams.get('childId');

    useEffect(() => {
        const url = childId ? `/api/learner/report?childId=${childId}` : '/api/learner/report';
        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error('Failed to load report data');
                return res.json();
            })
            .then(setData)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [childId]);

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
            <Box mb={4} display="flex" alignItems="center" gap={2} className="no-print">
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => router.back()}
                >
                    Back to Dashboard
                </Button>
                <Typography variant="h5" fontWeight="bold">Academic Report Card</Typography>
            </Box>

            {loading && (
                <Box display="flex" justifyContent="center" py={10}>
                    <CircularProgress />
                </Box>
            )}

            {error && <Alert severity="error">{error}</Alert>}

            {data && <ReportCard data={data} />}
        </Container>
    );
}
