'use client';

import { Chip, ChipProps } from '@mui/material';

const ROLE_STYLES: Record<string, { label: string; color: ChipProps['color'] }> = {
    TEACHER: { label: 'Teacher', color: 'primary' },
    HOD: { label: 'HOD', color: 'secondary' },
    PARENT: { label: 'Parent', color: 'info' },
    LEARNER: { label: 'Learner', color: 'success' },
    PRINCIPAL: { label: 'Principal', color: 'warning' },
    SCHOOL_ADMIN: { label: 'Admin', color: 'default' },
    SCHOOL_OWNER: { label: 'Owner', color: 'warning' },
    PROVIDER: { label: 'Provider', color: 'default' },
};

interface RoleChipProps {
    role: string;
    size?: ChipProps['size'];
    variant?: ChipProps['variant'];
}

export default function RoleChip({ role, size = 'small', variant = 'outlined' }: RoleChipProps) {
    const style = ROLE_STYLES[role] ?? { label: role, color: 'default' as const };
    return <Chip label={style.label} color={style.color} size={size} variant={variant} />;
}
