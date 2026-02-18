'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';

export default function AdminDashboard() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard/provider');
    }, [router]);

    return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress />
        </Box>
    );
}
