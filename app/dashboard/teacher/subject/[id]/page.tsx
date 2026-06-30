'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Container,
    Typography,
    Button,
    Paper,
    Chip
} from '@mui/material';
import { Add as AddIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useRouter, useParams } from 'next/navigation';
import AddAssessmentModal from './AddAssessmentModal';
import SubjectHub from '@/app/components/SubjectHub';
import { formatAssessmentShortLabel } from '@/lib/assessment-utils';

interface AssessmentData {
    id: string;
    title: string;
    term?: string | null;
    paper?: string | null;
    type: string;
    date: string;
    totalMarks: number;
    weight: number;
    _count?: { grades: number };
}

const baseColumns: GridColDef[] = [
    {
        field: 'label',
        headerName: 'Assessment',
        flex: 1.2,
        valueGetter: (_value, row: AssessmentData) =>
            formatAssessmentShortLabel({
                term: row.term,
                paper: row.paper,
                title: row.title,
                type: row.type,
            }),
    },
    { field: 'term', headerName: 'Term', width: 130 },
    { field: 'paper', headerName: 'Paper', width: 110 },
    {
        field: 'type', headerName: 'Type', width: 120,
        renderCell: (params) => (
            <Chip label={params.value} size="small" variant="outlined" />
        )
    },
    {
        field: 'date', headerName: 'Date', width: 120,
        valueFormatter: (value) => new Date(value).toLocaleDateString()
    },
    { field: 'totalMarks', headerName: 'Out of', width: 90 },
    {
        field: 'weight', headerName: 'Weight', width: 90,
        valueFormatter: (value) => `${value}%`
    },
    {
        field: 'graded',
        headerName: 'Marked',
        width: 90,
        valueGetter: (_value, row: AssessmentData) => row._count?.grades ?? 0,
    },
];

export default function SubjectDetail() {
    const router = useRouter();
    const params = useParams();
    const subjectId = params.id as string;

    const columns: GridColDef[] = [
        ...baseColumns,
        {
            field: 'actions', headerName: 'Actions', flex: 0.8,
            renderCell: (params) => (
                <Button
                    variant="contained"
                    size="small"
                    onClick={() => router.push(`/dashboard/teacher/subject/${subjectId}/assessment/${params.row.id}`)}
                >
                    Enter marks
                </Button>
            )
        }
    ];

    const [assessments, setAssessments] = useState<AssessmentData[]>([]);
    const [subjectName, setSubjectName] = useState('');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchAssessments = useCallback(() => {
        Promise.resolve().then(() => setLoading(true));
        Promise.all([
            fetch(`/api/assessments?subjectId=${subjectId}`).then((res) => res.json()),
            fetch('/api/subjects').then((res) => (res.ok ? res.json() : [])),
        ])
            .then(([assessmentData, subjects]) => {
                setAssessments(Array.isArray(assessmentData) ? assessmentData : []);
                const subject = Array.isArray(subjects)
                    ? subjects.find((s: { id: string }) => s.id === subjectId)
                    : null;
                setSubjectName(subject?.name ?? '');
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [subjectId]);

    useEffect(() => {
        if (subjectId) {
            fetchAssessments();
        }
    }, [subjectId, fetchAssessments]);

    return (
        <Container maxWidth="xl" sx={{ mt: 4 }}>
            <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => router.back()}
                sx={{ mb: 2 }}
            >
                Back to Dashboard
            </Button>

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">
                        Subject Management
                    </Typography>
                    <Typography color="text.secondary">
                        Create paper-based assessments and enter marks after marking scripts
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setIsModalOpen(true)}
                >
                    Create Assessment
                </Button>
            </Box>

            <Box mb={6}>
                <SubjectHub subjectId={subjectId} role="TEACHER" />
            </Box>

            <Paper sx={{ width: '100%', p: 2 }}>
                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ px: 1, py: 1 }}>
                    Assessment Gradebook
                </Typography>
                <Box sx={{ height: 500, width: '100%' }}>
                    <DataGrid
                        rows={assessments}
                        columns={columns}
                        loading={loading}
                        disableRowSelectionOnClick
                    />
                </Box>
            </Paper>

            <AddAssessmentModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchAssessments}
                subjectId={subjectId}
                subjectName={subjectName}
            />
        </Container>
    );
}
