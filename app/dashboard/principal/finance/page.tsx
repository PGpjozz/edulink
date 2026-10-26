'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** School fee collection is out of the product. Old links go back to the school overview. */
export default function PrincipalFinanceRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/dashboard/principal');
    }, [router]);
    return null;
}
