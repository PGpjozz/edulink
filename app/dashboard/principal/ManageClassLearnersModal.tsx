'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    OutlinedInput,
    Checkbox,
    ListItemText,
    IconButton,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    CircularProgress,
    Stack,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';

type RosterRow = { id: string; firstName: string; lastName: string; idNumber?: string; email?: string };
type AvailableLearner = { id: string; grade: string; class?: { id: string } | null; user: { firstName: string; lastName: string; idNumber?: string | null } };

export default function ManageClassLearnersModal({
    open,
    onClose,
    classInfo,
    onUpdated,
    onNotify,
}: {
    open: boolean;
    onClose: () => void;
    classInfo: { id: string; name: string; grade: string } | null;
    onUpdated?: () => void;
    onNotify?: (msg: string) => void;
}) {
    const [roster, setRoster] = useState<RosterRow[]>([]);
    const [available, setAvailable] = useState<AvailableLearner[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const refresh = useCallback(async () => {
        if (!classInfo) return;
        setLoading(true);
        setError('');
        try {
            const [rosterRes, learnersRes] = await Promise.all([
                fetch(`/api/classes/${classInfo.id}/learners`),
                fetch('/api/learners'),
            ]);
            const rosterData = rosterRes.ok ? await rosterRes.json() : [];
            const learnersData = learnersRes.ok ? await learnersRes.json() : [];
            setRoster(Array.isArray(rosterData) ? rosterData : []);
            // Available = same grade, not currently in any class.
            setAvailable(
                (Array.isArray(learnersData) ? learnersData : []).filter(
                    (l: AvailableLearner) => l.grade === classInfo.grade && !l.class
                )
            );
        } catch {
            setError('Failed to load learners');
        } finally {
            setLoading(false);
        }
    }, [classInfo]);

    useEffect(() => {
        if (open && classInfo) {
            setSelected([]);
            refresh();
        }
    }, [open, classInfo, refresh]);

    const handleAdd = async () => {
        if (!classInfo || selected.length === 0) return;
        setBusy(true);
        setError('');
        try {
            const res = await fetch(`/api/classes/${classInfo.id}/learners`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ learnerProfileIds: selected }),
            });
            if (!res.ok) { setError(await res.text()); return; }
            const data = await res.json();
            setSelected([]);
            await refresh();
            onUpdated?.();
            onNotify?.(`${data.enrolled} learner(s) enrolled.`);
        } finally {
            setBusy(false);
        }
    };

    const handleRemove = async (learnerProfileId: string) => {
        if (!classInfo) return;
        setBusy(true);
        setError('');
        try {
            const res = await fetch(`/api/classes/${classInfo.id}/learners`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ learnerProfileId }),
            });
            if (!res.ok) { setError(await res.text()); return; }
            await refresh();
            onUpdated?.();
            onNotify?.('Learner removed from class.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                Learners — {classInfo?.name ?? ''}
                {classInfo && (
                    <Typography variant="body2" color="text.secondary">
                        Grade {classInfo.grade} · {roster.length} enrolled
                    </Typography>
                )}
            </DialogTitle>
            <DialogContent>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {loading ? (
                    <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                ) : (
                    <>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Learner</TableCell>
                                    <TableCell>ID / Admission</TableCell>
                                    <TableCell width={56} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {roster.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3}>
                                            <Typography variant="body2" color="text.secondary">
                                                No learners enrolled yet. Add grade {classInfo?.grade} learners below.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {roster.map((l) => (
                                    <TableRow key={l.id}>
                                        <TableCell>{l.firstName} {l.lastName}</TableCell>
                                        <TableCell>{l.idNumber || l.email || '—'}</TableCell>
                                        <TableCell>
                                            <IconButton size="small" color="error" disabled={busy}
                                                onClick={() => handleRemove(l.id)} aria-label="Remove learner">
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                Enrol grade {classInfo?.grade} learners
                            </Typography>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                                <FormControl size="small" sx={{ flex: 1, minWidth: 220 }}>
                                    <InputLabel>Learners (not in a class)</InputLabel>
                                    <Select
                                        multiple
                                        value={selected}
                                        onChange={(e) => setSelected(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                                        input={<OutlinedInput label="Learners (not in a class)" />}
                                        renderValue={(sel) => `${sel.length} selected`}
                                    >
                                        {available.length === 0 && (
                                            <MenuItem disabled>No unassigned grade {classInfo?.grade} learners</MenuItem>
                                        )}
                                        {available.map((l) => (
                                            <MenuItem key={l.id} value={l.id}>
                                                <Checkbox checked={selected.includes(l.id)} />
                                                <ListItemText
                                                    primary={`${l.user.firstName} ${l.user.lastName}`}
                                                    secondary={l.user.idNumber || ''}
                                                />
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={handleAdd}
                                    disabled={busy || selected.length === 0}
                                >
                                    Enrol
                                </Button>
                            </Stack>
                        </Box>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
