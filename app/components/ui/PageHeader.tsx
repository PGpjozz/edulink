'use client';

import { Box, Typography, Breadcrumbs, Link as MuiLink } from '@mui/material';
import NextLink from 'next/link';
import { ReactNode } from 'react';

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    breadcrumbs?: BreadcrumbItem[];
    actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, breadcrumbs, actions }: PageHeaderProps) {
    return (
        <Box
            mb={4}
            display="flex"
            justifyContent="space-between"
            alignItems="flex-start"
            flexWrap="wrap"
            gap={2}
        >
            <Box>
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <Breadcrumbs sx={{ mb: 1, fontSize: '0.875rem' }}>
                        {breadcrumbs.map((crumb, i) =>
                            crumb.href ? (
                                <MuiLink
                                    key={crumb.label}
                                    component={NextLink}
                                    href={crumb.href}
                                    underline="hover"
                                    color="text.secondary"
                                >
                                    {crumb.label}
                                </MuiLink>
                            ) : (
                                <Typography key={crumb.label} color="text.primary" fontSize="inherit">
                                    {crumb.label}
                                </Typography>
                            )
                        )}
                    </Breadcrumbs>
                )}
                <Typography variant="h4" fontWeight="bold" letterSpacing="-0.02em">
                    {title}
                </Typography>
                {subtitle && (
                    <Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: 560 }}>
                        {subtitle}
                    </Typography>
                )}
            </Box>
            {actions && (
                <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
                    {actions}
                </Box>
            )}
        </Box>
    );
}
