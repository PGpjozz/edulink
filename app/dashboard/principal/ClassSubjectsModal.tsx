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
    Chip,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, ContentCopy } from '@mui/icons-material';
import Link from 'next/link';

type TeacherOption = { teacherProfileId: string; name: string };

type ClassSubjectRow = {
    id: string;
    subjectId: string;
    subject: { id: string; name: string; code?: string | null; grade: string; offering?: 'COMPULSORY' | 'OPTIONAL' };
    teacherProfileId?: string | null;
    teacher?: { user?: { firstName: string; lastName: string } } | null;
};

type SubjectOption = { id: string; name: string; code?: string | null; grade: string; offering?: 'COMPULSORY' | 'OPTIONAL' };
type ClassOption = { id: string; name: string; grade: string };

export function ClassSubjectsEditor({
    classInfo,
    subjects,
    teachers,
    onUpdated,
}: {
    classInfo: { id: string; name: string; grade: string };
    subjects: SubjectOption[];
    teachers: TeacherOption[];
    onUpdated?: () => void;
}) {
    const [rows, setRows] = useState<ClassSubjectRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [addSubjectId, setAddSubjectId] = useState('');
    const [addTeacherId, setAddTeacherId] = useState('');
    const [copyFromClassId, setCopyFromClassId] = useState('');
    const [siblingClasses, setSiblingClasses] = useState<ClassOption[]>([]);
    const [savingId, setSavingId] = useState<string | null>(null);

    const fetchRows = useCallback(async () => {
        if (!classInfo) return;
        setLoading(true);
        setError('');
        try {
            await fetch('/api/class-subjects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ classId: classInfo.id, syncCompulsory: true }),
            });
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
        setAddSubjectId('');
        setAddTeacherId('');
        setCopyFromClassId('');
        fetch('/api/classes')
            .then((r) => r.json())
            .then((data) => {
                const list = Array.isArray(data) ? data : [];
                setSiblingClasses(list.filter((c: ClassOption) => c.grade === classInfo.grade && c.id !== classInfo.id));
            })
            .catch(() => setSiblingClasses([]));
        fetchRows();
    }, [classInfo, fetchRows]);

    const linkedSubjectIds = new Set(rows.map((r) => r.subjectId));
    const availableSubjects = subjects.filter(
        (s) => s.grade === classInfo?.grade && s.offering === 'OPTIONAL' && !linkedSubjectIds.has(s.id)
    );

    const handleCopy = async () => {
        if (!classInfo || !copyFromClassId) return;
        setError('');
        const res = await fetch('/api/class-subjects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ classId: classInfo.id, copyFromClassId }),
        });
        if (!res.ok) {
            setError(await res.text());
            return;
        }
        setCopyFromClassId('');
        await fetchRows();
        onUpdated?.();
    };

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
    };

    return (
        <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Grade {classInfo.grade}. Compulsory subjects are on every class in the grade. Optional subjects are only on the classes you add them to, and each class can have its own teacher.
            </Typography>
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
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Typography variant="caption" color="text.secondary">
                                                    {row.subject.code || '—'}
                                                </Typography>
                                                <Chip
                                                    size="small"
                                                    label={row.subject.offering === 'OPTIONAL' ? 'This class' : 'Compulsory'}
                                                    color={row.subject.offering === 'OPTIONAL' ? 'default' : 'primary'}
                                                    variant="outlined"
                                                />
                                            </Stack>
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
                                            {row.subject.offering === 'OPTIONAL' ? (
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleRemove(row.id)}
                                                aria-label="Remove subject"
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                            ) : null}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {siblingClasses.length > 0 && (
                            <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                    Share subjects from another Grade {classInfo?.grade} class
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                    Copies subjects this class does not already take. Remove any that should stay on the other class only.
                                </Typography>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                    <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
                                        <InputLabel>Copy from</InputLabel>
                                        <Select value={copyFromClassId} label="Copy from" onChange={(e) => setCopyFromClassId(e.target.value)}>
                                            {siblingClasses.map((c) => (
                                                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <Button variant="outlined" startIcon={<ContentCopy />} onClick={handleCopy} disabled={!copyFromClassId}>
                                        Copy
                                    </Button>
                                </Stack>
                            </Box>
                        )}

                        <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                Add an optional subject
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
                            {availableSubjects.length === 0 && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    {subjects.length === 0 ? (
                                        <>
                                            No subjects yet. Create them on the{' '}
                                            <Link href="/dashboard/principal/subjects">Subjects</Link> page, then link them here.
                                        </>
                                    ) : (
                                        <>No optional Grade {classInfo?.grade} subjects left to add. Create one on the Subjects page and mark it “Chosen per class”.</>
                                    )}
                                </Typography>
                            )}
                        </Box>
                    </>
                )}
        </Box>
    );
}

export default function ClassSubjectsModal({
    open,
    onClose,
    classInfo,
    subjects,
    teachers,
    onUpdated,
}: {
    open: boolean;
    onClose: () => void;
    classInfo: { id: string; name: string; grade: string } | null;
    subjects: SubjectOption[];
    teachers: TeacherOption[];
    onUpdated?: () => void;
}) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Class subjects — {classInfo?.name ?? ''}</DialogTitle>
            <DialogContent>
                {classInfo && (
                    <ClassSubjectsEditor classInfo={classInfo} subjects={subjects} teachers={teachers} onUpdated={onUpdated} />
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
