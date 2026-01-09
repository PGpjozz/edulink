'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert
} from '@mui/material';

interface AddClassModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddClassModal({ open, onClose, onSuccess }: AddClassModalProps) {
    const [name, setName] = useState('');
    const [grade, setGrade] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/classes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, grade }),
            });

            if (!res.ok) throw new Error('Failed to create class');

            onSuccess();
            onClose();
            setName('');
            setGrade('');
        } catch (err) {
            setError('Error creating class.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Add New Class</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    <TextField
                        autoFocus
                        margin="dense"
                        label="Class Name (e.g. 8A)"
                        fullWidth
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />

                    <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
                        <InputLabel>Grade</InputLabel>
                        <Select
                            value={grade}
                            label="Grade"
                            onChange={(e) => setGrade(e.target.value)}
                            required
                        >
                            {['R', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map((g) => (
                                <MenuItem key={g} value={g}>Grade {g}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={loading}>
                        Create
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
