'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
import { useRouter } from 'next/navigation';
import AddClassModal from '../../AddClassModal';
import AssignTeacherModal from '../../AssignTeacherModal';
import ClassSubjectsModal from '../../ClassSubjectsModal';
import type { ClassData, SubjectData, TeacherOption } from '../../_components/types';

export default function PrincipalClassesPage() {
    const router = useRouter();
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [subjects, setSubjects] = useState<SubjectData[]>([]);
    const [loading, setLoading] = useState(false);
    const [teacherOptions, setTeacherOptions] = useState<TeacherOption[]>([]);
    const [isClassModalOpen, setIsClassModalOpen] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [assignTitle, setAssignTitle] = useState('');
    const [assignDescription, setAssignDescription] = useState<string>();
    const [assignInitialTeacherProfileId, setAssignInitialTeacherProfileId] = useState<string | null>(null);
    const [assignTarget, setAssignTarget] = useState<{ type: 'class' | 'subject'; id: string } | null>(null);
    const [classSubjectsOpen, setClassSubjectsOpen] = useState(false);
    const [classSubjectsTarget, setClassSubjectsTarget] = useState<ClassData | null>(null);

    const fetchClasses = () => {
        setLoading(true);
        fetch('/api/classes').then((r) => r.json()).then(setClasses).finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchClasses();
        fetch('/api/users/teaching-staff').then((r) => r.json()).then((data) => {
            if (Array.isArray(data)) {
                setTeacherOptions(data.map((t: { teacherProfileId: string; label?: string; firstName: string; lastName: string }) => ({
                    teacherProfileId: t.teacherProfileId,
                    name: t.label || `${t.firstName} ${t.lastName}`,
                })));
            }
        });
        fetch('/api/subjects').then((r) => r.json()).then(setSubjects);
    }, []);

    const classColumns: GridColDef[] = [
        { field: 'name', headerName: 'Class Name', flex: 1 },
        { field: 'grade', headerName: 'Grade', width: 100 },
        { field: 'learners', headerName: 'Learners', width: 100, valueGetter: (_v, row) => row?._count?.learners || 0 },
        {
            field: 'teacher', headerName: 'Class Teacher', flex: 1,
            valueGetter: (_v, row) => {
                const t = row?.teacher?.user;
                return t ? `${t.firstName} ${t.lastName}` : 'Unassigned';
            },
        },
        {
            field: 'actions', headerName: 'Actions', width: 340,
            renderCell: (params) => (
                <Box display="flex" gap={1} flexWrap="wrap">
                    <Button size="small" variant="outlined" onClick={() => { setClassSubjectsTarget(params.row); setClassSubjectsOpen(true); }}>Subjects</Button>
                    <Button size="small" variant="outlined" onClick={() => {
                        setAssignTarget({ type: 'class', id: params.row.id });
                        setAssignTitle(`Assign Class Teacher: ${params.row.name}`);
                        setAssignDescription('Set the form teacher responsible for this class.');
                        setAssignInitialTeacherProfileId(params.row.teacherProfileId || null);
                        setAssignOpen(true);
                    }}>Form teacher</Button>
                    <Button size="small" variant="outlined" onClick={() => router.push(`/dashboard/principal/class/${params.row.id}/timetable`)}>Timetable</Button>
                </Box>
            ),
        },
    ];

    const handleSaveAssignment = async (teacherProfileId: string | null) => {
        if (!assignTarget || assignTarget.type !== 'class') return;
        const res = await fetch('/api/classes', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ classId: assignTarget.id, teacherProfileId }),
        });
        if (!res.ok) throw new Error(await res.text());
        fetchClasses();
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="h6">Active Classes</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsClassModalOpen(true)}>Add class</Button>
            </Box>
            <Box sx={{ height: 480, width: '100%' }}>
                <DataGrid rows={classes} columns={classColumns} loading={loading} disableRowSelectionOnClick slots={{ toolbar: GridToolbar }} slotProps={{ toolbar: { showQuickFilter: true } }} />
            </Box>
            <AddClassModal open={isClassModalOpen} onClose={() => setIsClassModalOpen(false)} onSuccess={fetchClasses} />
            <AssignTeacherModal open={assignOpen} onClose={() => setAssignOpen(false)} title={assignTitle} description={assignDescription} teachers={teacherOptions} initialTeacherProfileId={assignInitialTeacherProfileId} onSave={handleSaveAssignment} />
            <ClassSubjectsModal open={classSubjectsOpen} onClose={() => setClassSubjectsOpen(false)} classInfo={classSubjectsTarget ? { id: classSubjectsTarget.id, name: classSubjectsTarget.name, grade: classSubjectsTarget.grade } : null} subjects={subjects} teachers={teacherOptions} onUpdated={fetchClasses} />
        </Box>
    );
}
