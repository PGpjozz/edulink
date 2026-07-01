'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { getBreadcrumbs } from '@/lib/breadcrumbs';

export function useBreadcrumbs(params: Record<string, string> = {}) {
    const pathname = usePathname();
    return useMemo(() => getBreadcrumbs(pathname, params), [pathname, params]);
}
