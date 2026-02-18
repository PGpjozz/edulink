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
    Alert,
    Box
} from '@mui/material';

interface AddAssessmentModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    subjectId: string;
}

export default function AddAssessmentModal({ open, onClose, onSuccess, subjectId }: AddAssessmentModalProps) {
    const [title, setTitle] = useState('');
    const [type, setType] = useState('TEST');
    const [totalMarks, setTotalMarks] = useState('');
    const [weight, setWeight] = useState('');
    const [date, setDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/assessments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subjectId,
                    title,
                    type,
                    totalMarks,
                    weight,
                    date
                }),
            });

            if (!res.ok) throw new Error('Failed to create assessment');

            onSuccess();
            onClose();
            // Reset
            setTitle('');
            setType('TEST');
            setTotalMarks('');
            setWeight('');
            setDate('');
        } catch {
            setError('Error creating assessment.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Create Assessment</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    <TextField
                        autoFocus
                        margin="dense"
                        label="Title (e.g. Term 1 Test)"
                        fullWidth
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />

                    <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
                        <InputLabel>Type</InputLabel>
                        <Select
                            value={type}
                            label="Type"
                            onChange={(e) => setType(e.target.value)}
                        >
                            <MenuItem value="TEST">Test</MenuItem>
                            <MenuItem value="EXAM">Exam</MenuItem>
                            <MenuItem value="ASSIGNMENT">Assignment</MenuItem>
                        </Select>
                    </FormControl>

                    <Box display="flex" gap={2} mt={1}>
                        <TextField
                            margin="dense"
                            label="Total Marks"
                            type="number"
                            fullWidth
                            required
                            value={totalMarks}
                            onChange={(e) => setTotalMarks(e.target.value)}
                        />
                        <TextField
                            margin="dense"
                            label="Weight (%)"
                            type="number"
                            fullWidth
                            required
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                        />
                    </Box>

                    <TextField
                        margin="dense"
                        label="Date"
                        type="date"
                        fullWidth
                        required
                        InputLabelProps={{ shrink: true }}
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        sx={{ mt: 2 }}
                    />

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
