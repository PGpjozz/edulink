'use client';

import { Card, CardContent, Box, Typography, useTheme } from '@mui/material';
import { ReactNode } from 'react';

type StatCardVariant = 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info';

interface StatCardProps {
    label: string;
    value: string | number;
    icon?: ReactNode;
    variant?: StatCardVariant;
    subtitle?: string;
}

const variantStyles: Record<StatCardVariant, { bg: string; color: string; iconOpacity: number }> = {
    default: { bg: 'background.paper', color: 'text.primary', iconOpacity: 0.15 },
    primary: { bg: 'primary.main', color: 'primary.contrastText', iconOpacity: 0.25 },
    success: { bg: 'success.main', color: 'success.contrastText', iconOpacity: 0.25 },
    error: { bg: 'error.main', color: 'error.contrastText', iconOpacity: 0.25 },
    warning: { bg: 'warning.main', color: 'warning.contrastText', iconOpacity: 0.25 },
    info: { bg: 'info.main', color: 'info.contrastText', iconOpacity: 0.25 },
};

export default function StatCard({ label, value, icon, variant = 'default', subtitle }: StatCardProps) {
    const theme = useTheme();
    const styles = variantStyles[variant];
    const isFilled = variant !== 'default';

    return (
        <Card
            sx={{
                borderRadius: 3,
                height: '100%',
                bgcolor: styles.bg,
                color: styles.color,
                border: isFilled ? 'none' : `1px solid ${theme.palette.divider}`,
                boxShadow: isFilled ? 2 : 0,
            }}
        >
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                        <Typography
                            variant="body2"
                            sx={{ opacity: isFilled ? 0.9 : 1, color: isFilled ? 'inherit' : 'text.secondary' }}
                        >
                            {label}
                        </Typography>
                        <Typography variant="h3" fontWeight="bold" sx={{ mt: 0.5, lineHeight: 1.2 }}>
                            {value}
                        </Typography>
                        {subtitle && (
                            <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 0.5 }}>
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                    {icon && (
                        <Box sx={{ opacity: styles.iconOpacity, fontSize: 48, lineHeight: 0 }}>
                            {icon}
                        </Box>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
}
