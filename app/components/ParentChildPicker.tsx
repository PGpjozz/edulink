'use client';

import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import type { ParentChild } from '@/lib/useParentChild';

export default function ParentChildPicker({
    learners,
    value,
    onChange,
}: {
    learners: ParentChild[];
    value: string;
    onChange: (userId: string) => void;
}) {
    if (learners.length <= 1) return null;

    return (
        <FormControl sx={{ mb: 2, minWidth: 220 }}>
            <InputLabel>Child</InputLabel>
            <Select value={value} label="Child" onChange={(e) => onChange(e.target.value)}>
                {learners.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
            </Select>
        </FormControl>
    );
}
