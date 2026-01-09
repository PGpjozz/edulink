'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CircularProgress, Box } from '@mui/material';

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'loading') return;

        if (!session) {
            router.push('/auth/signin');
            return;
        }

        const { role } = session.user;

        switch (role) {
            case 'PROVIDER':
                router.push('/dashboard/provider');
                break;
            case 'PRINCIPAL':
            case 'SCHOOL_ADMIN':
                router.push('/dashboard/principal');
                break;
            case 'TEACHER':
                router.push('/dashboard/teacher');
                break;
            case 'LEARNER':
                router.push('/dashboard/learner');
                break;
            case 'PARENT':
                router.push('/dashboard/parent');
                break;
            default:
                router.push('/unauthorized');
        }
    }, [session, status, router]);

    return (
        <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="100vh"
        >
            <CircularProgress />
        </Box>
    );
}
