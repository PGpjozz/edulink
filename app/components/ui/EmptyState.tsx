'use client';

import { Box, Typography, Button } from '@mui/material';
import Link from 'next/link';
import { ReactNode } from 'react';

interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    actionHref?: string;
}

export default function EmptyState({
    icon,
    title,
    description,
    actionLabel,
    onAction,
    actionHref,
}: EmptyStateProps) {
    return (
        <Box
            textAlign="center"
            py={6}
            px={3}
            sx={{
                borderRadius: 3,
                border: '1px dashed',
                borderColor: 'divider',
                bgcolor: 'action.hover',
            }}
        >
            {icon && (
                <Box sx={{ fontSize: 56, color: 'text.disabled', mb: 2, lineHeight: 0 }}>
                    {icon}
                </Box>
            )}
            <Typography variant="h6" fontWeight="bold" gutterBottom>
                {title}
            </Typography>
            {description && (
                <Typography color="text.secondary" sx={{ maxWidth: 400, mx: 'auto', mb: actionLabel ? 2 : 0 }}>
                    {description}
                </Typography>
            )}
            {actionLabel && (onAction || actionHref) && (
                actionHref ? (
                    <Button variant="contained" component={Link} href={actionHref} sx={{ mt: 1 }}>
                        {actionLabel}
                    </Button>
                ) : (
                    <Button variant="contained" onClick={onAction} sx={{ mt: 1 }}>
                        {actionLabel}
                    </Button>
                )
            )}
        </Box>
    );
}
