'use client';

import { Suspense } from 'react';
import { Container, Typography, Box, CircularProgress } from '@mui/material';
import ParentChildPicker from '@/app/components/ParentChildPicker';
import PublishedReports from '@/app/components/PublishedReports';
import { useParentChild } from '@/lib/useParentChild';

function ParentReportsInner() {
    const { children, selected, loading, setChildId } = useParentChild();

    if (loading) {
        return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>;
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
            <Box mb={3}>
                <Typography variant="h4" fontWeight="bold">Report Cards</Typography>
                <Typography color="text.secondary">Published academic reports for your child.</Typography>
            </Box>

            {selected && (
                <ParentChildPicker options={children} value={selected.id} onChange={setChildId} />
            )}

            {selected ? (
                <PublishedReports childId={selected.id} />
            ) : (
                <Typography color="text.secondary">No children linked to your account.</Typography>
            )}
        </Container>
    );
}

export default function ParentReportsPage() {
    return (
        <Suspense fallback={<Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>}>
            <ParentReportsInner />
        </Suspense>
    );
}
