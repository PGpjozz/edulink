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

interface AddUserModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddUserModal({ open, onClose, onSuccess }: AddUserModalProps) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('TEACHER');
    const [idNumber, setIdNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    email: email || undefined,
                    role,
                    idNumber: idNumber || undefined
                }),
            });

            if (!res.ok) throw new Error('Failed to create user');

            onSuccess();
            onClose();
            // Reset
            setFirstName('');
            setLastName('');
            setEmail('');
            setIdNumber('');
            setRole('TEACHER');
        } catch (err) {
            setError('Error creating user.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add New User</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    <Box display="flex" gap={2}>
                        <TextField
                            margin="dense"
                            label="First Name"
                            fullWidth
                            required
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                        />
                        <TextField
                            margin="dense"
                            label="Last Name"
                            fullWidth
                            required
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                        />
                    </Box>

                    <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
                        <InputLabel>Role</InputLabel>
                        <Select
                            value={role}
                            label="Role"
                            onChange={(e) => setRole(e.target.value)}
                        >
                            <MenuItem value="TEACHER">Teacher</MenuItem>
                            <MenuItem value="LEARNER">Learner</MenuItem>
                            <MenuItem value="SCHOOL_ADMIN">Admin</MenuItem>
                        </Select>
                    </FormControl>

                    {role !== 'LEARNER' && (
                        <TextField
                            margin="dense"
                            label="Email Address"
                            type="email"
                            fullWidth
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    )}

                    {role === 'LEARNER' && (
                        <TextField
                            margin="dense"
                            label="ID Number"
                            fullWidth
                            required
                            value={idNumber}
                            onChange={(e) => setIdNumber(e.target.value)}
                            helperText="Required for learner login"
                        />
                    )}

                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={loading}>
                        Create User
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
