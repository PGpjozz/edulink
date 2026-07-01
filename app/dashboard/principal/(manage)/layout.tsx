'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Box, Container, Tab, Tabs, Paper } from '@mui/material';
import Link from 'next/link';
import PageHeader from '@/app/components/ui/PageHeader';
import PageTransition from '@/app/components/ui/PageTransition';

const TABS = [
    { label: 'Overview', href: '/dashboard/principal' },
    { label: 'Classes & Grades', href: '/dashboard/principal/classes' },
    { label: 'Teachers & Staff', href: '/dashboard/principal/users' },
    { label: 'Subjects', href: '/dashboard/principal/subjects' },
    { label: 'Departments', href: '/dashboard/principal/departments' },
] as const;

const LEGACY_TAB_MAP: Record<string, string> = {
    classes: '/dashboard/principal/classes',
    users: '/dashboard/principal/users',
    subjects: '/dashboard/principal/subjects',
    departments: '/dashboard/principal/departments',
};

function PrincipalManageLayoutInner({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && LEGACY_TAB_MAP[tab]) {
            router.replace(LEGACY_TAB_MAP[tab]);
        }
    }, [searchParams, router]);

    const activeTab =
        TABS.find((t) => t.href === pathname)?.href ??
        (pathname === '/dashboard/principal' ? '/dashboard/principal' : false);

    return (
        <PageTransition>
            <Container maxWidth="xl">
                <PageHeader
                    title="School Management"
                    subtitle="Overview, classes, staff, subjects, and departments."
                />
                <Paper
                    sx={{
                        width: '100%',
                        mb: 4,
                        borderRadius: 3,
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider',
                    }}
                    elevation={0}
                >
                    <Tabs
                        value={activeTab}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{ borderBottom: 1, borderColor: 'divider' }}
                    >
                        {TABS.map((tab) => (
                            <Tab
                                key={tab.href}
                                label={tab.label}
                                value={tab.href}
                                component={Link}
                                href={tab.href}
                            />
                        ))}
                    </Tabs>
                    <Box sx={{ p: 3 }}>{children}</Box>
                </Paper>
            </Container>
        </PageTransition>
    );
}

export default function PrincipalManageLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={null}>
            <PrincipalManageLayoutInner>{children}</PrincipalManageLayoutInner>
        </Suspense>
    );
}
