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
    Alert
} from '@mui/material';

type TeacherOption = {
    teacherProfileId: string;
    name: string;
};

export default function AssignTeacherModal({
    open,
    onClose,
    title,
    description,
    teachers,
    initialTeacherProfileId,
    onSave
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    teachers: TeacherOption[];
    initialTeacherProfileId: string | null;
    onSave: (teacherProfileId: string | null) => Promise<void>;
}) {
    const [teacherProfileId, setTeacherProfileId] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const selectValue = useMemo(() => {
        return teacherProfileId;
    }, [teacherProfileId]);

    useEffect(() => {
        setTeacherProfileId(initialTeacherProfileId || '');
        setError('');
        setSaving(false);
    }, [open, initialTeacherProfileId]);

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            await onSave(teacherProfileId || null);
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                {description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {description}
                    </Typography>
                )}

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Box sx={{ mt: 1 }}>
                    <FormControl fullWidth>
                        <InputLabel>Teacher</InputLabel>
                        <Select
                            value={selectValue}
                            label="Teacher"
                            onChange={(e) => setTeacherProfileId(e.target.value)}
                        >
                            <MenuItem value="">Unassigned</MenuItem>
                            {teachers.map((t) => (
                                <MenuItem key={t.teacherProfileId} value={t.teacherProfileId}>
                                    {t.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
                <Button onClick={onClose} disabled={saving}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
