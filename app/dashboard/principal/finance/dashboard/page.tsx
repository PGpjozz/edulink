'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PrincipalFinanceDashboardRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/dashboard/principal');
    }, [router]);
    return null;
}
