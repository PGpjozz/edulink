'use client';

import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import type { ParentChild } from '@/lib/useParentChild';

export default function ParentChildPicker({
    children,
    value,
    onChange,
}: {
    children: ParentChild[];
    value: string;
    onChange: (userId: string) => void;
}) {
    if (children.length <= 1) return null;

    return (
        <FormControl sx={{ mb: 2, minWidth: 220 }}>
            <InputLabel>Child</InputLabel>
            <Select value={value} label="Child" onChange={(e) => onChange(e.target.value)}>
                {children.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
            </Select>
        </FormControl>
    );
}
