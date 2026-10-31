'use client';

import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Alert,
    InputAdornment,
    IconButton,
    Typography,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

interface AddLearnerModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    classInfo: { id: string; name: string; grade: string } | null;
}

export default function AddLearnerModal({ open, onClose, onSuccess, classInfo }: AddLearnerModalProps) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [idNumber, setIdNumber] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setFirstName('');
        setLastName('');
        setIdNumber('');
        setPassword('');
        setError('');
    }, [open, classInfo?.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!classInfo) return;
        setLoading(true);
        setError('');

        const finalPassword = password.trim();
        if (!finalPassword) {
            setError('Password is required');
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    role: 'LEARNER',
                    idNumber,
                    password: finalPassword,
                    grade: classInfo.grade,
                    classId: classInfo.id,
                }),
            });

            if (!res.ok) {
                const msg = await res.text();
                let display = msg;
                try {
                    const parsed = JSON.parse(msg);
                    if (parsed?.error) display = parsed.error;
                } catch {
                    /* plain-text error */
                }
                throw new Error(display || 'Failed to add learner');
            }

            onSuccess();
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error adding learner.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Add learner to {classInfo?.name ?? 'class'}</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Grade {classInfo?.grade}. They sign in with this ID number.
                    </Typography>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="First name"
                        fullWidth
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                    />
                    <TextField
                        margin="dense"
                        label="Last name"
                        fullWidth
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                    />
                    <TextField
                        margin="dense"
                        label="ID number"
                        fullWidth
                        required
                        value={idNumber}
                        onChange={(e) => setIdNumber(e.target.value)}
                        helperText="13-digit South African ID number"
                    />
                    <TextField
                        margin="dense"
                        label="Initial password"
                        fullWidth
                        required
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        helperText="They must change this password after first login."
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setShowPassword((p) => !p)} edge="end" aria-label="Toggle password visibility">
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={loading || !classInfo}>
                        Add learner
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
