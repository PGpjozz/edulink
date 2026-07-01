'use client';

import { useState } from 'react';
import {
    Box,
    Button,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Typography,
    Chip,
} from '@mui/material';
import { SwapHoriz, Check } from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    DASHBOARD_ROLE_LABELS,
    type DashboardRole,
    dashboardHomePath,
} from '@/lib/dashboard-roles';

export default function RoleSwitcher() {
    const { data: session, update } = useSession();
    const router = useRouter();
    const [anchor, setAnchor] = useState<null | HTMLElement>(null);
    const [switching, setSwitching] = useState(false);

    if (!session?.user) return null;

    const available = (session.user.availableRoles ?? []) as DashboardRole[];
    const activeRole = (session.user.activeRole ?? session.user.primaryRole) as DashboardRole;
    const primaryRole = session.user.primaryRole as DashboardRole;

    if (available.length <= 1) return null;

    const handleSwitch = async (role: DashboardRole) => {
        setAnchor(null);
        if (role === activeRole) return;

        setSwitching(true);
        try {
            const res = await fetch('/api/auth/switch-role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role }),
            });
            const data = await res.json();
            if (!res.ok) return;

            await update({ activeRole: role });
            router.push(data.redirectTo ?? dashboardHomePath(role));
        } finally {
            setSwitching(false);
        }
    };

    return (
        <Box sx={{ px: 2, mb: 2 }}>
            <Button
                fullWidth
                variant="outlined"
                size="small"
                startIcon={<SwapHoriz />}
                onClick={(e) => setAnchor(e.currentTarget)}
                disabled={switching}
                sx={{ justifyContent: 'flex-start', textTransform: 'none', borderRadius: 2, py: 1 }}
            >
                <Box textAlign="left" flex={1}>
                    <Typography variant="caption" color="text.secondary" display="block">
                        Active role
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                        {DASHBOARD_ROLE_LABELS[activeRole] ?? activeRole}
                    </Typography>
                </Box>
                <Chip label={available.length} size="small" sx={{ ml: 1 }} />
            </Button>
            <Menu
                anchorEl={anchor}
                open={Boolean(anchor)}
                onClose={() => setAnchor(null)}
                PaperProps={{ sx: { minWidth: 220 } }}
            >
                {available.map((role) => (
                    <MenuItem key={role} onClick={() => handleSwitch(role)} selected={role === activeRole}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                            {role === activeRole ? <Check fontSize="small" color="primary" /> : null}
                        </ListItemIcon>
                        <ListItemText
                            primary={DASHBOARD_ROLE_LABELS[role]}
                            secondary={role === primaryRole ? 'Primary account role' : undefined}
                        />
                    </MenuItem>
                ))}
            </Menu>
        </Box>
    );
}
