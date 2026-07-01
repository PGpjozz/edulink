'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CircularProgress, Box } from '@mui/material';
import { type DashboardRole, dashboardHomePath } from '@/lib/dashboard-roles';

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'loading') return;

        if (!session) {
            router.push('/auth/signin');
            return;
        }

        if (session.user.mustChangePassword) {
            router.push('/dashboard/change-password');
            return;
        }

        const activeRole = (session.user.activeRole ?? session.user.primaryRole) as DashboardRole;
        router.push(dashboardHomePath(activeRole));
    }, [session, status, router]);

    return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
            <CircularProgress />
        </Box>
    );
}
