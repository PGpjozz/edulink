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

type TeacherOption = { teacherProfileId: string; name: string };

type ClassSubjectRow = {
    id: string;
    subjectId: string;
    subject: { id: string; name: string; code?: string | null; grade: string };
    teacherProfileId?: string | null;
    teacher?: { user?: { firstName: string; lastName: string } } | null;
};

type SubjectOption = { id: string; name: string; code?: string | null; grade: string };

export default function ClassSubjectsModal({
    open,
    onClose,
    classInfo,
    subjects,
    teachers,
    onUpdated,
    onNotify,
}: {
    open: boolean;
    onClose: () => void;
    classInfo: { id: string; name: string; grade: string } | null;
    subjects: SubjectOption[];
    teachers: TeacherOption[];
    onUpdated?: () => void;
    onNotify?: (msg: string) => void;
}) {
    const [rows, setRows] = useState<ClassSubjectRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [addSubjectId, setAddSubjectId] = useState('');
    const [addTeacherId, setAddTeacherId] = useState('');
    const [savingId, setSavingId] = useState<string | null>(null);

    const fetchRows = useCallback(async () => {
        if (!classInfo) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/class-subjects?classId=${classInfo.id}`);
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            setRows(Array.isArray(data) ? data : []);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load subjects');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [classInfo]);

    useEffect(() => {
        if (open && classInfo) {
            setAddSubjectId('');
            setAddTeacherId('');
            fetchRows();
        }
    }, [open, classInfo, fetchRows]);

    const linkedSubjectIds = new Set(rows.map((r) => r.subjectId));
    const availableSubjects = subjects.filter(
        (s) => s.grade === classInfo?.grade && !linkedSubjectIds.has(s.id)
    );

    const handleAdd = async () => {
        if (!classInfo || !addSubjectId) return;
        setError('');
        const res = await fetch('/api/class-subjects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                classId: classInfo.id,
                subjectId: addSubjectId,
                teacherProfileId: addTeacherId || null,
            }),
        });
        if (!res.ok) {
            setError(await res.text());
            return;
        }
        setAddSubjectId('');
        setAddTeacherId('');
        await fetchRows();
        onUpdated?.();
        onNotify?.('Subject added to class.');
    };

    const handleTeacherChange = async (row: ClassSubjectRow, teacherProfileId: string) => {
        if (!classInfo) return;
        setSavingId(row.id);
        setError('');
        const res = await fetch('/api/class-subjects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                classId: classInfo.id,
                subjectId: row.subjectId,
                teacherProfileId: teacherProfileId || null,
            }),
        });
        setSavingId(null);
        if (!res.ok) {
            setError(await res.text());
            return;
        }
        await fetchRows();
        onUpdated?.();
        onNotify?.('Subject teacher updated.');
    };

    const handleRemove = async (id: string) => {
        setError('');
        const res = await fetch('/api/class-subjects', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        if (!res.ok) {
            setError(await res.text());
            return;
        }
        await fetchRows();
        onUpdated?.();
        onNotify?.('Subject removed from class.');
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                Class subjects — {classInfo?.name ?? ''}
                {classInfo && (
                    <Typography variant="body2" color="text.secondary">
                        Grade {classInfo.grade} · Assign which subjects this class takes and who teaches each
                    </Typography>
                )}
            </DialogTitle>
            <DialogContent>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {loading ? (
                    <Box display="flex" justifyContent="center" py={4}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Subject</TableCell>
                                    <TableCell>Teacher</TableCell>
                                    <TableCell width={56} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3}>
                                            <Typography variant="body2" color="text.secondary">
                                                No subjects linked yet. Add subjects for this class below.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {rows.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>
                                            <Typography fontWeight="medium">{row.subject.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {row.subject.code || '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <FormControl size="small" fullWidth disabled={savingId === row.id}>
                                                <Select
                                                    value={row.teacherProfileId || ''}
                                                    displayEmpty
                                                    onChange={(e) => handleTeacherChange(row, e.target.value)}
                                                >
                                                    <MenuItem value="">
                                                        <em>Unassigned</em>
                                                    </MenuItem>
                                                    {teachers.map((t) => (
                                                        <MenuItem key={t.teacherProfileId} value={t.teacherProfileId}>
                                                            {t.name}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </TableCell>
                                        <TableCell>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleRemove(row.id)}
                                                aria-label="Remove subject"
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                Add subject to class
                            </Typography>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                                <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
                                    <InputLabel>Subject</InputLabel>
                                    <Select
                                        value={addSubjectId}
                                        label="Subject"
                                        onChange={(e) => setAddSubjectId(e.target.value)}
                                    >
                                        {availableSubjects.map((s) => (
                                            <MenuItem key={s.id} value={s.id}>
                                                {s.name} ({s.code || s.grade})
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
                                    <InputLabel>Teacher (optional)</InputLabel>
                                    <Select
                                        value={addTeacherId}
                                        label="Teacher (optional)"
                                        onChange={(e) => setAddTeacherId(e.target.value)}
                                    >
                                        <MenuItem value="">
                                            <em>Assign later</em>
                                        </MenuItem>
                                        {teachers.map((t) => (
                                            <MenuItem key={t.teacherProfileId} value={t.teacherProfileId}>
                                                {t.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={handleAdd}
                                    disabled={!addSubjectId || availableSubjects.length === 0}
                                >
                                    Add
                                </Button>
                            </Stack>
                            {availableSubjects.length === 0 && subjects.length > 0 && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    All grade {classInfo?.grade} subjects are already linked, or none exist yet.
                                </Typography>
                            )}
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
