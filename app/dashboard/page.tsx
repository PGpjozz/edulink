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

        const activeRole = (session.user.activeRole ?? session.user.primaryRole ?? session.user.role) as DashboardRole;
        let path = dashboardHomePath(activeRole);

        if (activeRole === 'HOD' && session.user.hasTeacherProfile) {
            path = '/dashboard/teacher';
        }

        router.push(path);
    }, [session, status, router]);

    return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
            <CircularProgress />
        </Box>
    );
}
