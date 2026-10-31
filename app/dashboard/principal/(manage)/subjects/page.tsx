'use client';

import { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    FormGroup,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import AssignTeacherModal from '../../AssignTeacherModal';
import type { ClassOption, SubjectData, TeacherOption } from '../../_components/types';

const GRADES = ['R', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

function errorText(msg: string) {
    try {
        const parsed = JSON.parse(msg);
        if (parsed?.error) return parsed.error;
    } catch {
        /* plain text */
    }
    return msg;
}

export default function PrincipalSubjectsPage() {
    const [subjects, setSubjects] = useState<SubjectData[]>([]);
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [teacherOptions, setTeacherOptions] = useState<TeacherOption[]>([]);
    const [assignOpen, setAssignOpen] = useState(false);
    const [assignTitle, setAssignTitle] = useState('');
    const [assignDescription, setAssignDescription] = useState<string>();
    const [assignInitialTeacherProfileId, setAssignInitialTeacherProfileId] = useState<string | null>(null);
    const [assignTargetId, setAssignTargetId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [grade, setGrade] = useState('11');
    const [compulsory, setCompulsory] = useState(true);
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState<SubjectData | null>(null);
    const [editName, setEditName] = useState('');
    const [editCode, setEditCode] = useState('');
    const [editGrade, setEditGrade] = useState('11');
    const [editCompulsory, setEditCompulsory] = useState(true);
    const [editClassIds, setEditClassIds] = useState<string[]>([]);

    const fetchSubjects = () => {
        setLoading(true);
        fetch('/api/subjects')
            .then((r) => r.json())
            .then((data) => setSubjects(Array.isArray(data) ? data : []))
            .catch(() => setSubjects([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchSubjects();
        fetch('/api/classes')
            .then((r) => r.json())
            .then((data) => setClasses(Array.isArray(data) ? data.map((c) => ({ id: c.id, name: c.name, grade: String(c.grade) })) : []))
            .catch(() => setClasses([]));
        fetch('/api/users/teaching-staff').then((r) => r.json()).then((data) => {
            if (Array.isArray(data)) {
                setTeacherOptions(data.map((t: { teacherProfileId: string; label?: string; firstName: string; lastName: string }) => ({
                    teacherProfileId: t.teacherProfileId,
                    name: t.label || `${t.firstName} ${t.lastName}`,
                })));
            }
        });
    }, []);

    const gradeClasses = classes.filter((c) => c.grade === grade);
    const editGradeClasses = classes.filter((c) => c.grade === editGrade);

    const toggleClass = (id: string, selected: string[], setSelected: (ids: string[]) => void) => {
        setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
    };

    const openEdit = (row: SubjectData) => {
        setEditing(row);
        setEditName(row.name);
        setEditCode(row.code || '');
        setEditGrade(row.grade);
        setEditCompulsory(row.offering !== 'OPTIONAL');
        setEditClassIds(row.classSubjects?.map((cs) => cs.classId) ?? []);
        setError('');
    };

    const subjectColumns: GridColDef[] = [
        { field: 'name', headerName: 'Subject', flex: 1 },
        { field: 'code', headerName: 'Code', width: 110 },
        { field: 'grade', headerName: 'Grade', width: 90 },
        {
            field: 'classes',
            headerName: 'Who takes it',
            flex: 1,
            valueGetter: (_v, row) => {
                if (row?.offering !== 'OPTIONAL') return 'Every class';
                const names = (row?.classSubjects ?? []).map((cs: { class?: { name: string } }) => cs.class?.name).filter(Boolean);
                return names.length ? names.join(', ') : 'No class yet';
            },
        },
        {
            field: 'actions', headerName: 'Actions', width: 280,
            renderCell: (params) => (
                <Box display="flex" gap={1}>
                    <Button size="small" variant="outlined" onClick={() => openEdit(params.row)}>Edit</Button>
                    <Button size="small" variant="outlined" onClick={() => {
                        setAssignTargetId(params.row.id);
                        setAssignTitle(`Assign teacher: ${params.row.name}`);
                        setAssignDescription('Default teacher for this subject. Each class can still have its own teacher.');
                        setAssignInitialTeacherProfileId(params.row.teacherId || null);
                        setAssignOpen(true);
                    }}>Teacher</Button>
                    <Button size="small" color="error" onClick={() => removeSubject(params.row)}>Delete</Button>
                </Box>
            ),
        },
    ];

    const handleSaveAssignment = async (teacherProfileId: string | null) => {
        if (!assignTargetId) return;
        const res = await fetch('/api/subjects', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subjectId: assignTargetId, teacherProfileId }),
        });
        if (!res.ok) throw new Error(await res.text());
        fetchSubjects();
    };

    const handleAddSubject = async () => {
        setError('');
        if (!name.trim() || !code.trim() || !grade) {
            setError('Name, code, and grade are required');
            return;
        }
        if (!compulsory && selectedClassIds.length === 0) {
            setError('Choose at least one class in this grade, or mark the subject compulsory.');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch('/api/subjects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    code: code.trim(),
                    grade,
                    offering: compulsory ? 'COMPULSORY' : 'OPTIONAL',
                    classIds: compulsory ? undefined : selectedClassIds,
                }),
            });
            if (!res.ok) throw new Error(errorText(await res.text()) || 'Could not add the subject');
            setName('');
            setCode('');
            setSelectedClassIds([]);
            fetchSubjects();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not add the subject');
        } finally {
            setSaving(false);
        }
    };

    const saveEdit = async () => {
        if (!editing) return;
        setError('');
        if (!editCompulsory && editClassIds.filter((id) => editGradeClasses.some((c) => c.id === id)).length === 0) {
            setError('Choose at least one class in this grade, or mark the subject compulsory.');
            return;
        }
        setSaving(true);
        try {
            const classIds = editClassIds.filter((id) => editGradeClasses.some((c) => c.id === id));
            const res = await fetch('/api/subjects', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subjectId: editing.id,
                    name: editName.trim(),
                    code: editCode.trim(),
                    grade: editGrade,
                    offering: editCompulsory ? 'COMPULSORY' : 'OPTIONAL',
                    classIds: editCompulsory ? undefined : classIds,
                }),
            });
            if (!res.ok) throw new Error(errorText(await res.text()) || 'Could not update the subject');
            setEditing(null);
            fetchSubjects();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not update the subject');
        } finally {
            setSaving(false);
        }
    };

    const removeSubject = async (row: SubjectData) => {
        if (!window.confirm(`Delete ${row.name}? Classes will no longer take it.`)) return;
        setError('');
        const res = await fetch('/api/subjects', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subjectId: row.id }),
        });
        if (!res.ok) {
            setError(errorText(await res.text()));
            return;
        }
        fetchSubjects();
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>Subjects</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Compulsory subjects go to every class in the grade. Otherwise pick the classes in that grade that take it.
            </Typography>
            {error && !editing && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Box display="flex" gap={2} mb={2} flexWrap="wrap" alignItems="center">
                <TextField size="small" label="Subject name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Accounting" />
                <TextField size="small" label="Code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="ACC" sx={{ width: 120 }} />
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Grade</InputLabel>
                    <Select value={grade} label="Grade" onChange={(e) => { setGrade(e.target.value); setSelectedClassIds([]); }}>
                        {GRADES.map((g) => <MenuItem key={g} value={g}>Grade {g}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControlLabel
                    control={<Checkbox checked={compulsory} onChange={(e) => setCompulsory(e.target.checked)} />}
                    label="Compulsory for every class"
                />
                <Button variant="contained" onClick={handleAddSubject} disabled={saving}>Add subject</Button>
            </Box>
            {!compulsory && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2">Who takes it in Grade {grade}</Typography>
                    {gradeClasses.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">Create the Grade {grade} classes first.</Typography>
                    ) : (
                        <FormGroup row>
                            {gradeClasses.map((c) => (
                                <FormControlLabel
                                    key={c.id}
                                    control={<Checkbox checked={selectedClassIds.includes(c.id)} onChange={() => toggleClass(c.id, selectedClassIds, setSelectedClassIds)} />}
                                    label={c.name}
                                />
                            ))}
                        </FormGroup>
                    )}
                </Box>
            )}
            <Box sx={{ height: 480, width: '100%' }}>
                <DataGrid rows={subjects} columns={subjectColumns} loading={loading} disableRowSelectionOnClick />
            </Box>
            <AssignTeacherModal open={assignOpen} onClose={() => setAssignOpen(false)} title={assignTitle} description={assignDescription} teachers={teacherOptions} initialTeacherProfileId={assignInitialTeacherProfileId} onSave={handleSaveAssignment} />

            <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit {editing?.name}</DialogTitle>
                <DialogContent>
                    {error && editing && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <TextField margin="dense" label="Subject name" fullWidth value={editName} onChange={(e) => setEditName(e.target.value)} />
                    <TextField margin="dense" label="Code" fullWidth value={editCode} onChange={(e) => setEditCode(e.target.value)} />
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Grade</InputLabel>
                        <Select value={editGrade} label="Grade" onChange={(e) => setEditGrade(e.target.value)}>
                            {GRADES.map((g) => <MenuItem key={g} value={g}>Grade {g}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControlLabel
                        control={<Checkbox checked={editCompulsory} onChange={(e) => setEditCompulsory(e.target.checked)} />}
                        label="Compulsory for every class in this grade"
                    />
                    {!editCompulsory && (
                        <Box>
                            <Typography variant="subtitle2">Who takes it</Typography>
                            {editGradeClasses.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">No classes in Grade {editGrade}.</Typography>
                            ) : (
                                <FormGroup>
                                    {editGradeClasses.map((c) => (
                                        <FormControlLabel
                                            key={c.id}
                                            control={<Checkbox checked={editClassIds.includes(c.id)} onChange={() => toggleClass(c.id, editClassIds, setEditClassIds)} />}
                                            label={c.name}
                                        />
                                    ))}
                                </FormGroup>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditing(null)}>Cancel</Button>
                    <Button variant="contained" onClick={saveEdit} disabled={saving}>Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
