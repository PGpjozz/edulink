'use client';

import { Box, Skeleton, Grid } from '@mui/material';

interface LoadingSkeletonProps {
    variant?: 'page' | 'cards' | 'table' | 'list';
    count?: number;
}

export default function LoadingSkeleton({ variant = 'page', count = 3 }: LoadingSkeletonProps) {
    if (variant === 'cards') {
        return (
            <Grid container spacing={3}>
                {Array.from({ length: count }).map((_, i) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                        <Skeleton variant="rounded" height={160} sx={{ borderRadius: 3 }} />
                    </Grid>
                ))}
            </Grid>
        );
    }

    if (variant === 'table') {
        return (
            <Box>
                <Skeleton variant="rounded" height={48} sx={{ mb: 1, borderRadius: 2 }} />
                {Array.from({ length: count }).map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={52} sx={{ mb: 1, borderRadius: 1 }} />
                ))}
            </Box>
        );
    }

    if (variant === 'list') {
        return (
            <Box display="flex" flexDirection="column" gap={1}>
                {Array.from({ length: count }).map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: 2 }} />
                ))}
            </Box>
        );
    }

    return (
        <Box>
            <Skeleton variant="text" width="40%" height={48} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="60%" height={24} sx={{ mb: 4 }} />
            <Grid container spacing={3}>
                {Array.from({ length: 3 }).map((_, i) => (
                    <Grid size={{ xs: 12, md: 4 }} key={i}>
                        <Skeleton variant="rounded" height={120} sx={{ borderRadius: 3 }} />
                    </Grid>
                ))}
            </Grid>
            <Skeleton variant="rounded" height={300} sx={{ mt: 4, borderRadius: 3 }} />
        </Box>
    );
}
