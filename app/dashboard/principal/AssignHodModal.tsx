'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    Typography,
    Alert,
} from '@mui/material';

export type HodCandidate = {
    userId: string;
    name: string;
    role: string;
};

export default function AssignHodModal({
    open,
    onClose,
    departmentName,
    candidates,
    initialHodUserId,
    onSave,
}: {
    open: boolean;
    onClose: () => void;
    departmentName: string;
    candidates: HodCandidate[];
    initialHodUserId: string | null;
    onSave: (hodUserId: string | null) => Promise<void>;
}) {
    const [hodUserId, setHodUserId] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const selectValue = useMemo(() => hodUserId, [hodUserId]);

    useEffect(() => {
        setHodUserId(initialHodUserId || '');
        setError('');
        setSaving(false);
    }, [open, initialHodUserId]);

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            await onSave(hodUserId || null);
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Assign HOD — {departmentName}</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    The selected staff member becomes Head of Department and can access the HOD dashboard.
                </Typography>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <FormControl fullWidth sx={{ mt: 1 }}>
                    <InputLabel>Head of Department</InputLabel>
                    <Select
                        value={selectValue}
                        label="Head of Department"
                        onChange={(e) => setHodUserId(e.target.value)}
                    >
                        <MenuItem value="">
                            <em>Unassigned</em>
                        </MenuItem>
                        {candidates.map((c) => (
                            <MenuItem key={c.userId} value={c.userId}>
                                {c.name} ({c.role.replace('_', ' ')})
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>Cancel</Button>
                <Button variant="contained" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
