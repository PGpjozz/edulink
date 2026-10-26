'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Parent fee payments are out of the product. */
export default function ParentBillingRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/dashboard/parent');
    }, [router]);
    return null;
}
