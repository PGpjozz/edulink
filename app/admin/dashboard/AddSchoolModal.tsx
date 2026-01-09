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
    Box,
    Alert
} from '@mui/material';

interface AddSchoolModalProps {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export default function AddSchoolModal({ open, onClose, onCreated }: AddSchoolModalProps) {
    const [name, setName] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [tier, setTier] = useState('SMALL');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/schools', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, contactEmail, tier, gradesOffered: ['8', '9', '10', '11', '12'] }),
            });

            if (!res.ok) throw new Error('Failed to create school');

            onCreated();
            onClose();
            // Reset form
            setName('');
            setContactEmail('');
            setTier('SMALL');
        } catch (err) {
            setError('Error creating school. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add New School</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    <TextField
                        autoFocus
                        margin="dense"
                        label="School Name"
                        fullWidth
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />

                    <TextField
                        margin="dense"
                        label="Contact Email"
                        type="email"
                        fullWidth
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                    />

                    <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
                        <InputLabel>Billing Tier</InputLabel>
                        <Select
                            value={tier}
                            label="Billing Tier"
                            onChange={(e) => setTier(e.target.value)}
                        >
                            <MenuItem value="SMALL">Small (R15,000)</MenuItem>
                            <MenuItem value="MEDIUM">Medium (R30,000)</MenuItem>
                            <MenuItem value="LARGE">Large (R55,000)</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={loading}>
                        {loading ? 'Creating...' : 'Create School'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
