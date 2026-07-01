'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import AssignTeacherModal from '../../AssignTeacherModal';
import type { SubjectData, TeacherOption } from '../../_components/types';

export default function PrincipalSubjectsPage() {
    const [subjects, setSubjects] = useState<SubjectData[]>([]);
    const [loading, setLoading] = useState(false);
    const [teacherOptions, setTeacherOptions] = useState<TeacherOption[]>([]);
    const [assignOpen, setAssignOpen] = useState(false);
    const [assignTitle, setAssignTitle] = useState('');
    const [assignDescription, setAssignDescription] = useState<string>();
    const [assignInitialTeacherProfileId, setAssignInitialTeacherProfileId] = useState<string | null>(null);
    const [assignTargetId, setAssignTargetId] = useState<string | null>(null);

    const fetchSubjects = () => {
        setLoading(true);
        fetch('/api/subjects').then((r) => r.json()).then(setSubjects).finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchSubjects();
        fetch('/api/users/teaching-staff').then((r) => r.json()).then((data) => {
            if (Array.isArray(data)) {
                setTeacherOptions(data.map((t: { teacherProfileId: string; label?: string; firstName: string; lastName: string }) => ({
                    teacherProfileId: t.teacherProfileId,
                    name: t.label || `${t.firstName} ${t.lastName}`,
                })));
            }
        });
    }, []);

    const subjectColumns: GridColDef[] = [
        { field: 'name', headerName: 'Subject', flex: 1 },
        { field: 'grade', headerName: 'Grade', width: 110 },
        {
            field: 'teacher', headerName: 'Teacher', flex: 1,
            valueGetter: (_v, row) => {
                const t = row?.teacher?.user;
                return t ? `${t.firstName} ${t.lastName}` : 'Unassigned';
            },
        },
        {
            field: 'actions', headerName: 'Actions', width: 170,
            renderCell: (params) => (
                <Button size="small" variant="outlined" onClick={() => {
                    setAssignTargetId(params.row.id);
                    setAssignTitle(`Assign Subject Teacher: ${params.row.name}`);
                    setAssignDescription('Assign the teacher responsible for this subject (per grade).');
                    setAssignInitialTeacherProfileId(params.row.teacherId || null);
                    setAssignOpen(true);
                }}>Assign teacher</Button>
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

    return (
        <Box>
            <Typography variant="h6" gutterBottom>Subjects</Typography>
            <Box sx={{ height: 480, width: '100%' }}>
                <DataGrid rows={subjects} columns={subjectColumns} loading={loading} disableRowSelectionOnClick />
            </Box>
            <AssignTeacherModal open={assignOpen} onClose={() => setAssignOpen(false)} title={assignTitle} description={assignDescription} teachers={teacherOptions} initialTeacherProfileId={assignInitialTeacherProfileId} onSave={handleSaveAssignment} />
        </Box>
    );
}
