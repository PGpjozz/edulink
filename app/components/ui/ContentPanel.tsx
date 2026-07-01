'use client';

import { Paper, Typography, Box, SxProps, Theme } from '@mui/material';
import { ReactNode } from 'react';

interface ContentPanelProps {
    title?: string;
    subtitle?: string;
    actions?: ReactNode;
    children: ReactNode;
    sx?: SxProps<Theme>;
    noPadding?: boolean;
}

export default function ContentPanel({
    title,
    subtitle,
    actions,
    children,
    sx,
    noPadding,
}: ContentPanelProps) {
    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
                ...sx,
            }}
        >
            {(title || actions) && (
                <Box
                    px={3}
                    py={2}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    flexWrap="wrap"
                    gap={1}
                    sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}
                >
                    <Box>
                        {title && (
                            <Typography variant="subtitle1" fontWeight="bold">
                                {title}
                            </Typography>
                        )}
                        {subtitle && (
                            <Typography variant="body2" color="text.secondary">
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                    {actions}
                </Box>
            )}
            <Box p={noPadding ? 0 : 3}>{children}</Box>
        </Paper>
    );
}
