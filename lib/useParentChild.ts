'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export type ParentChild = {
    id: string;
    profileId: string;
    name: string;
    grade?: string;
    className?: string;
};

export function useParentChild() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [children, setChildren] = useState<ParentChild[]>([]);
    const [loading, setLoading] = useState(true);

    const childUserId = searchParams.get('childId');

    useEffect(() => {
        fetch('/api/parent/children')
            .then((r) => (r.ok ? r.json() : []))
            .then((kids) => {
                const list: ParentChild[] = (Array.isArray(kids) ? kids : []).map((k: {
                    id: string;
                    profileId: string;
                    name: string;
                    grade?: string;
                    className?: string;
                }) => ({
                    id: k.id,
                    profileId: k.profileId,
                    name: k.name,
                    grade: k.grade,
                    className: k.className,
                }));
                setChildren(list);
            })
            .finally(() => setLoading(false));
    }, []);

    const selected = children.find((c) => c.id === childUserId) ?? children[0] ?? null;

    const setChildId = useCallback((userId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('childId', userId);
        router.push(`${pathname}?${params.toString()}`);
    }, [pathname, router, searchParams]);

    useEffect(() => {
        if (!loading && children.length > 0 && !childUserId) {
            setChildId(children[0].id);
        }
    }, [loading, children, childUserId, setChildId]);

    return { children, selected, loading, setChildId, childUserId: selected?.id ?? null, learnerProfileId: selected?.profileId ?? null };
}
