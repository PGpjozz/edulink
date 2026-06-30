'use client';

import { useState, useMemo } from 'react';
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
    Box,
    Typography,
    Autocomplete,
} from '@mui/material';
import { getCurrentTermLabel } from '@/lib/report-generation';
import { formatAssessmentTitle, getTermOptions } from '@/lib/assessment-utils';

interface AddAssessmentModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    subjectId: string;
    subjectName?: string;
}

const PAPER_SUGGESTIONS = [
    'Paper 1',
    'Paper 2',
    'Paper 3',
    'Test 1',
    'Test 2',
    'Assignment 1',
    'Assignment 2',
    'Practical',
];

export default function AddAssessmentModal({
    open,
    onClose,
    onSuccess,
    subjectId,
    subjectName = '',
}: AddAssessmentModalProps) {
    const [term, setTerm] = useState(getCurrentTermLabel());
    const [paper, setPaper] = useState('');
    const [title, setTitle] = useState('');
    const [type, setType] = useState('EXAM');
    const [totalMarks, setTotalMarks] = useState('100');
    const [weight, setWeight] = useState('25');
    const [date, setDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const termOptions = useMemo(() => getTermOptions(), []);
    const previewTitle = formatAssessmentTitle({
        term,
        paper,
        title,
        type,
        subjectName,
    });

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
                    term,
                    paper: paper || undefined,
                    title: title || undefined,
                    type,
                    totalMarks,
                    weight,
                    date,
                }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to create assessment');

            onSuccess();
            onClose();
            setTerm(getCurrentTermLabel());
            setPaper('');
            setTitle('');
            setType('EXAM');
            setTotalMarks('100');
            setWeight('25');
            setDate('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error creating assessment.');
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

                    <FormControl fullWidth margin="dense" required>
                        <InputLabel>Term</InputLabel>
                        <Select value={term} label="Term" onChange={(e) => setTerm(e.target.value)}>
                            {termOptions.map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Autocomplete
                        freeSolo
                        options={PAPER_SUGGESTIONS}
                        value={paper}
                        onChange={(_e, value) => setPaper(value ?? '')}
                        onInputChange={(_e, value) => setPaper(value)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                margin="dense"
                                label="Paper / assessment name"
                                placeholder="e.g. Paper 2"
                                helperText="For paper exams: Paper 1, Paper 2, etc."
                            />
                        )}
                        sx={{ mt: 1 }}
                    />

                    <FormControl fullWidth margin="dense" sx={{ mt: 1 }}>
                        <InputLabel>Type</InputLabel>
                        <Select value={type} label="Type" onChange={(e) => setType(e.target.value)}>
                            <MenuItem value="TEST">Test</MenuItem>
                            <MenuItem value="EXAM">Exam</MenuItem>
                            <MenuItem value="ASSIGNMENT">Assignment</MenuItem>
                        </Select>
                    </FormControl>

                    <Box display="flex" gap={2} mt={1}>
                        <TextField
                            margin="dense"
                            label="Total marks"
                            type="number"
                            fullWidth
                            required
                            value={totalMarks}
                            onChange={(e) => setTotalMarks(e.target.value)}
                            helperText="Paper is out of this many marks"
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
                        sx={{ mt: 1 }}
                    />

                    <TextField
                        margin="dense"
                        label="Custom title (optional)"
                        fullWidth
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        helperText="Leave blank to auto-generate from term and paper"
                        sx={{ mt: 1 }}
                    />

                    <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                            <strong>Preview:</strong> {previewTitle}
                        </Typography>
                    </Alert>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="contained" disabled={loading}>
                        Create
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
