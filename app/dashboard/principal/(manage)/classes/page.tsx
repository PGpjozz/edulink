'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AddClassModal from '../../AddClassModal';
import { canManageClasses } from '@/lib/permissions';
import type { ClassData } from '../../_components/types';

export default function PrincipalClassesPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const role = session?.user?.primaryRole ?? session?.user?.role ?? '';
    const permissions = session?.user?.permissions ?? [];
    const mayManageClasses = canManageClasses({ role, permissions });

    const [classes, setClasses] = useState<ClassData[]>([]);
    const [loading, setLoading] = useState(false);
    const [isClassModalOpen, setIsClassModalOpen] = useState(false);

    const fetchClasses = () => {
        setLoading(true);
        fetch('/api/classes')
            .then((r) => r.json())
            .then((data) => setClasses(Array.isArray(data) ? data : []))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchClasses();
    }, []);

    const openClass = (classId: string) => {
        router.push(`/dashboard/principal/classes/${classId}`);
    };

    const classColumns: GridColDef[] = [
        { field: 'name', headerName: 'Class Name', flex: 1 },
        { field: 'grade', headerName: 'Grade', width: 100 },
        { field: 'learners', headerName: 'Learners', width: 110, valueGetter: (_v, row) => row?._count?.learners || 0 },
        {
            field: 'teacher', headerName: 'Class Teacher', flex: 1,
            valueGetter: (_v, row) => {
                const t = row?.teacher?.user;
                return t ? `${t.firstName} ${t.lastName}` : 'Unassigned';
            },
        },
        {
            field: 'actions', headerName: 'Actions', width: 120,
            renderCell: (params) => (
                <Button size="small" variant="contained" onClick={() => openClass(params.row.id)}>Open</Button>
            ),
        },
    ];

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" mb={2}>
                <Box>
                    <Typography variant="h6">Active Classes</Typography>
                    <Typography variant="body2" color="text.secondary">Open a class to view and change its learners, subjects, and form teacher.</Typography>
                </Box>
                {mayManageClasses && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsClassModalOpen(true)}>Add class</Button>
                )}
            </Box>
            <Box sx={{ height: 480, width: '100%' }}>
                <DataGrid
                    rows={classes}
                    columns={classColumns}
                    loading={loading}
                    disableRowSelectionOnClick
                    onRowClick={(params) => openClass(String(params.id))}
                    slots={{ toolbar: GridToolbar }}
                    slotProps={{ toolbar: { showQuickFilter: true } }}
                />
            </Box>
            <AddClassModal open={isClassModalOpen} onClose={() => setIsClassModalOpen(false)} onSuccess={fetchClasses} />
        </Box>
    );
}
