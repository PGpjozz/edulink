'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Container, Tab, Tabs, Typography } from '@mui/material';
import BrandLogo from '@/app/components/BrandLogo';
import { BRAND } from '@/lib/branding';

const NAV = [
    { label: 'Overview', href: '/dashboard/provider' },
    { label: 'Onboard', href: '/dashboard/provider/onboard' },
    { label: 'Schools', href: '/dashboard/provider/schools' },
    { label: 'Billing', href: '/dashboard/provider/billing' },
    { label: 'Audit', href: '/dashboard/provider/audit' },
];

export default function ProviderShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const active =
        NAV.find((item) =>
            item.href === '/dashboard/provider'
                ? pathname === item.href
                : pathname.startsWith(item.href),
        )?.href ?? '/dashboard/provider';

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            <Box textAlign="center" mb={3}>
                <Box display="flex" justifyContent="center" mb={1}>
                    <BrandLogo variant="full" height={52} />
                </Box>
                <Typography variant="h5" fontWeight={800}>
                    {BRAND.providerPortalTitle}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                    Platform operations, billing, and tenant management
                </Typography>
            </Box>

            <Tabs
                value={active}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            >
                {NAV.map((item) => (
                    <Tab
                        key={item.href}
                        label={item.label}
                        value={item.href}
                        component={Link}
                        href={item.href}
                    />
                ))}
            </Tabs>

            {children}
        </Container>
    );
}
