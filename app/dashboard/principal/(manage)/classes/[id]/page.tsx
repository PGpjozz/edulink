'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import { ArrowBack, PersonAdd } from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import AddLearnerModal from '../../../AddLearnerModal';
import { ClassSubjectsEditor } from '../../../ClassSubjectsModal';
import { canManageClasses, canManageUsers } from '@/lib/permissions';
import type { ClassData, SubjectData, TeacherOption } from '../../../_components/types';

const GRADES = ['R', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

type ClassLearner = {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    idNumber: string | null;
    isActive?: boolean;
};

function errorText(msg: string) {
    try {
        const parsed = JSON.parse(msg);
        if (parsed?.error) return parsed.error;
    } catch {
        /* plain text */
    }
    return msg;
}

export default function ClassDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { data: session } = useSession();
    const role = session?.user?.primaryRole ?? session?.user?.role ?? '';
    const permissions = session?.user?.permissions ?? [];
    const mayManageClasses = canManageClasses({ role, permissions });
    const mayManageUsers = canManageUsers({ role, permissions });

    const [klass, setKlass] = useState<ClassData | null>(null);
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [missing, setMissing] = useState(false);
    const [name, setName] = useState('');
    const [grade, setGrade] = useState('');
    const [teacherProfileId, setTeacherProfileId] = useState('');
    const [teachers, setTeachers] = useState<TeacherOption[]>([]);
    const [subjects, setSubjects] = useState<SubjectData[]>([]);
    const [learners, setLearners] = useState<ClassLearner[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [addOpen, setAddOpen] = useState(false);
    const [editing, setEditing] = useState<ClassLearner | null>(null);
    const [editFirst, setEditFirst] = useState('');
    const [editLast, setEditLast] = useState('');
    const [editClassId, setEditClassId] = useState('');

    const load = useCallback(() => {
        if (!id) return;
        setLoading(true);
        Promise.all([
            fetch('/api/classes').then((r) => r.json()),
            fetch(`/api/classes/${id}/learners`).then((r) => r.json()),
            fetch('/api/subjects').then((r) => r.json()),
            fetch('/api/users/teaching-staff').then((r) => r.json()),
        ])
            .then(([classRows, learnerRows, subjectRows, staffRows]) => {
                const list: ClassData[] = Array.isArray(classRows) ? classRows : [];
                setClasses(list);
                const match = list.find((row) => row.id === id) ?? null;
                setKlass(match);
                setMissing(!match);
                if (match) {
                    setName(match.name);
                    setGrade(String(match.grade));
                    setTeacherProfileId(match.teacherProfileId || '');
                }
                setLearners(Array.isArray(learnerRows) ? learnerRows : []);
                setSubjects(Array.isArray(subjectRows) ? subjectRows : []);
                if (Array.isArray(staffRows)) {
                    setTeachers(staffRows.map((t: { teacherProfileId: string; label?: string; firstName: string; lastName: string }) => ({
                        teacherProfileId: t.teacherProfileId,
                        name: t.label || `${t.firstName} ${t.lastName}`,
                    })));
                }
            })
            .catch(() => setError('Could not load this class'))
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    const saveDetails = async () => {
        if (!klass) return;
        setSaving(true);
        setError('');
        try {
            const res = await fetch('/api/classes', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    classId: klass.id,
                    name: name.trim(),
                    grade,
                    teacherProfileId: teacherProfileId || null,
                }),
            });
            if (!res.ok) throw new Error(errorText(await res.text()) || 'Could not save this class');
            load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save this class');
        } finally {
            setSaving(false);
        }
    };

    const openLearner = (row: ClassLearner) => {
        setEditing(row);
        setEditFirst(row.firstName);
        setEditLast(row.lastName);
        setEditClassId(klass?.id || '');
        setError('');
    };

    const saveLearner = async () => {
        if (!editing) return;
        setSaving(true);
        setError('');
        try {
            const res = await fetch(`/api/users/${editing.userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName: editFirst.trim(),
                    lastName: editLast.trim(),
                    classId: editClassId || null,
                }),
            });
            if (!res.ok) throw new Error(errorText(await res.text()) || 'Could not update this learner');
            setEditing(null);
            load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not update this learner');
        } finally {
            setSaving(false);
        }
    };

    const removeLearner = async (row: ClassLearner) => {
        if (!window.confirm(`Remove ${row.firstName} ${row.lastName} from this class? Their account stays in the school.`)) return;
        setError('');
        const res = await fetch(`/api/users/${row.userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ classId: null }),
        });
        if (!res.ok) {
            setError(errorText(await res.text()));
            return;
        }
        load();
    };

    const learnerColumns: GridColDef[] = [
        { field: 'firstName', headerName: 'First name', flex: 1 },
        { field: 'lastName', headerName: 'Last name', flex: 1 },
        { field: 'idNumber', headerName: 'ID number', flex: 1, valueGetter: (_v, row) => row?.idNumber || '—' },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 200,
            renderCell: (params) => (
                <Box display="flex" gap={1}>
                    {mayManageUsers && <Button size="small" variant="outlined" onClick={() => openLearner(params.row)}>Edit</Button>}
                    {mayManageUsers && <Button size="small" color="error" onClick={() => removeLearner(params.row)}>Remove</Button>}
                </Box>
            ),
        },
    ];

    if (!loading && missing) {
        return (
            <Box>
                <Button startIcon={<ArrowBack />} onClick={() => router.push('/dashboard/principal/classes')}>Back to classes</Button>
                <Alert severity="warning" sx={{ mt: 2 }}>This class was not found.</Alert>
            </Box>
        );
    }

    return (
        <Box>
            <Button startIcon={<ArrowBack />} onClick={() => router.push('/dashboard/principal/classes')} sx={{ mb: 2 }}>
                Back to classes
            </Button>
            <Typography variant="h5" gutterBottom>{klass?.name || 'Class'}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                View and change this class, its learners, and the subjects it takes.
            </Typography>
            {error && !editing && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                <Typography variant="subtitle1" gutterBottom>Class details</Typography>
                <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                    <TextField size="small" label="Class name" value={name} onChange={(e) => setName(e.target.value)} disabled={!mayManageClasses} />
                    <FormControl size="small" sx={{ minWidth: 140 }} disabled={!mayManageClasses}>
                        <InputLabel>Grade</InputLabel>
                        <Select value={grade} label="Grade" onChange={(e) => setGrade(e.target.value)}>
                            {GRADES.map((g) => <MenuItem key={g} value={g}>Grade {g}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 220 }} disabled={!mayManageClasses}>
                        <InputLabel>Form teacher</InputLabel>
                        <Select value={teacherProfileId} label="Form teacher" onChange={(e) => setTeacherProfileId(e.target.value)}>
                            <MenuItem value=""><em>Unassigned</em></MenuItem>
                            {teachers.map((t) => (
                                <MenuItem key={t.teacherProfileId} value={t.teacherProfileId}>{t.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    {mayManageClasses && (
                        <Button variant="contained" onClick={saveDetails} disabled={saving || loading}>Save class</Button>
                    )}
                    {mayManageClasses && (
                        <Button variant="outlined" onClick={() => router.push(`/dashboard/principal/class/${id}/timetable`)}>Timetable</Button>
                    )}
                </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle1">Learners ({learners.length})</Typography>
                    {mayManageUsers && (
                        <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setAddOpen(true)} disabled={!klass}>
                            Add learner
                        </Button>
                    )}
                </Box>
                <Box sx={{ height: 360, width: '100%' }}>
                    <DataGrid rows={learners} columns={learnerColumns} loading={loading} disableRowSelectionOnClick />
                </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle1" gutterBottom>Subjects</Typography>
                <Divider sx={{ mb: 2 }} />
                {klass && (
                    <ClassSubjectsEditor
                        classInfo={{ id: klass.id, name: klass.name, grade: String(klass.grade) }}
                        subjects={subjects}
                        teachers={teachers}
                        onUpdated={load}
                    />
                )}
            </Paper>

            <AddLearnerModal
                open={addOpen}
                onClose={() => setAddOpen(false)}
                classInfo={klass ? { id: klass.id, name: klass.name, grade: String(klass.grade) } : null}
                onSuccess={load}
            />

            <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Edit learner</DialogTitle>
                <DialogContent>
                    {error && editing && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <TextField margin="dense" label="First name" fullWidth value={editFirst} onChange={(e) => setEditFirst(e.target.value)} />
                    <TextField margin="dense" label="Last name" fullWidth value={editLast} onChange={(e) => setEditLast(e.target.value)} />
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Class</InputLabel>
                        <Select value={editClassId} label="Class" onChange={(e) => setEditClassId(e.target.value)}>
                            {classes.map((c) => (
                                <MenuItem key={c.id} value={c.id}>{c.name} (Grade {c.grade})</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditing(null)}>Cancel</Button>
                    <Button variant="contained" onClick={saveLearner} disabled={saving}>Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
