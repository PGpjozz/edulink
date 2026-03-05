'use client';

import { useState, useEffect } from 'react';
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
    Snackbar,
    InputAdornment,
    IconButton,
    Typography
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

interface AddUserModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface LearnerOption {
    id: string;
    profileId: string;
    name: string;
    grade: string;
}

const GRADES = ['8', '9', '10', '11', '12'];

export default function AddUserModal({ open, onClose, onSuccess }: AddUserModalProps) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('TEACHER');
    const [idNumber, setIdNumber] = useState('');
    const [grade, setGrade] = useState('8');
    const [learnerProfileId, setLearnerProfileId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successInfo, setSuccessInfo] = useState('');
    const [learners, setLearners] = useState<LearnerOption[]>([]);

    useEffect(() => {
        if (open && role === 'PARENT') {
            fetch('/api/learners')
                .then(r => r.json())
                .then((data: any[]) => setLearners(
                    Array.isArray(data) ? data.map(l => ({
                        id: l.user?.id ?? l.userId,
                        profileId: l.id,
                        name: `${l.user?.firstName ?? ''} ${l.user?.lastName ?? ''}`.trim(),
                        grade: l.grade ?? ''
                    })) : []
                ))
                .catch(() => setLearners([]));
        }
    }, [open, role]);

    const reset = () => {
        setFirstName(''); setLastName(''); setEmail(''); setIdNumber('');
        setGrade('8'); setLearnerProfileId(''); setPassword(''); setRole('TEACHER');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const finalPassword = password.trim() || 'password123';

        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    email: email || undefined,
                    role,
                    idNumber: idNumber || undefined,
                    password: finalPassword,
                    grade: role === 'LEARNER' ? grade : undefined,
                    learnerProfileId: role === 'PARENT' && learnerProfileId ? learnerProfileId : undefined,
                }),
            });

            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'Failed to create user');
            }

            const login = role === 'LEARNER' ? `ID: ${idNumber}` : `Email: ${email}`;
            setSuccessInfo(`User created. Login: ${login} | Password: ${finalPassword}`);
            onSuccess();
            reset();
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Error creating user.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Snackbar
                open={!!successInfo}
                autoHideDuration={12000}
                onClose={() => setSuccessInfo('')}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert severity="success" onClose={() => setSuccessInfo('')} sx={{ width: '100%' }}>
                    {successInfo}
                </Alert>
            </Snackbar>

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
                            <Select value={role} label="Role" onChange={(e) => { setRole(e.target.value); setError(''); }}>
                                <MenuItem value="TEACHER">Teacher</MenuItem>
                                <MenuItem value="LEARNER">Learner</MenuItem>
                                <MenuItem value="PARENT">Parent / Guardian</MenuItem>
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
                            <>
                                <TextField
                                    margin="dense"
                                    label="ID Number"
                                    fullWidth
                                    required
                                    value={idNumber}
                                    onChange={(e) => setIdNumber(e.target.value)}
                                    helperText="Learners log in with their ID number"
                                />
                                <FormControl fullWidth margin="dense">
                                    <InputLabel>Grade</InputLabel>
                                    <Select value={grade} label="Grade" onChange={(e) => setGrade(e.target.value)} required>
                                        {GRADES.map(g => <MenuItem key={g} value={g}>Grade {g}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </>
                        )}

                        {role === 'PARENT' && (
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Link to Learner (optional)</InputLabel>
                                <Select
                                    value={learnerProfileId}
                                    label="Link to Learner (optional)"
                                    onChange={(e) => setLearnerProfileId(e.target.value)}
                                >
                                    <MenuItem value=""><em>None — link later</em></MenuItem>
                                    {learners.map(l => (
                                        <MenuItem key={l.profileId} value={l.profileId}>
                                            {l.name} (Grade {l.grade})
                                        </MenuItem>
                                    ))}
                                </Select>
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1 }}>
                                    Linking enables attendance alerts and portal access for this child.
                                </Typography>
                            </FormControl>
                        )}

                        <TextField
                            margin="dense"
                            label="Initial Password"
                            fullWidth
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Leave blank to use: password123"
                            helperText="The user must change this after first login."
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowPassword(p => !p)} edge="end">
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />

                    </DialogContent>
                    <DialogActions sx={{ p: 3 }}>
                        <Button onClick={onClose} disabled={loading}>Cancel</Button>
                        <Button type="submit" variant="contained" disabled={loading}>
                            Create User
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </>
    );
}
