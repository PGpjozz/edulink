'use client';

import { Suspense } from 'react';
import { Box, Avatar, Typography, ToggleButton, ToggleButtonGroup, useTheme, useMediaQuery, Paper } from '@mui/material';
import { useParentChild } from '@/lib/useParentChild';

function ParentChildBarInner() {
    const { children, selected, setChildId } = useParentChild();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    if (children.length <= 1) return null;

    return (
        <Paper
            elevation={0}
            sx={{
                position: isMobile ? 'sticky' : 'static',
                top: isMobile ? 56 : 0,
                zIndex: theme.zIndex.appBar - 1,
                mb: 3,
                p: 1.5,
                borderRadius: 3,
                border: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
            }}
        >
            <ToggleButtonGroup
                value={selected?.id ?? ''}
                exclusive
                onChange={(_, val) => val && setChildId(val)}
                fullWidth={isMobile}
                sx={{ flexWrap: 'wrap', gap: 1 }}
            >
                {children.map((child) => (
                    <ToggleButton
                        key={child.id}
                        value={child.id}
                        sx={{
                            borderRadius: '12px !important',
                            px: 2,
                            py: 1,
                            textTransform: 'none',
                            border: '1px solid !important',
                            flex: isMobile ? '1 1 100%' : '0 1 auto',
                        }}
                    >
                        <Avatar sx={{ width: 28, height: 28, mr: 1, bgcolor: 'primary.main', fontSize: '0.85rem' }}>
                            {child.name[0]}
                        </Avatar>
                        <Box textAlign="left">
                            <Typography variant="body2" fontWeight="bold" lineHeight={1.2}>
                                {child.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Gr {child.grade} · {child.className}
                            </Typography>
                        </Box>
                    </ToggleButton>
                ))}
            </ToggleButtonGroup>
        </Paper>
    );
}

export default function ParentChildBar() {
    return (
        <Suspense fallback={null}>
            <ParentChildBarInner />
        </Suspense>
    );
}
