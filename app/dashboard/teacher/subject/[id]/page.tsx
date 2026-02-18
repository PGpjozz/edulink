'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Button,
    Paper,
    Chip,
    IconButton
} from '@mui/material';
import { Add as AddIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useRouter, useParams } from 'next/navigation';
import AddAssessmentModal from './AddAssessmentModal';
import SubjectHub from '@/app/components/SubjectHub';


interface AssessmentData {
    id: string;
    title: string;
    type: string;
    date: string;
    totalMarks: number;
    weight: number;
}

const columns: GridColDef[] = [
    { field: 'title', headerName: 'Title', flex: 1 },
    {
        field: 'type', headerName: 'Type', width: 130,
        renderCell: (params) => (
            <Chip label={params.value} size="small" variant="outlined" />
        )
    },
    {
        field: 'date', headerName: 'Date', width: 150,
        valueFormatter: (value) => new Date(value).toLocaleDateString()
    },
    { field: 'totalMarks', headerName: 'Total Marks', width: 110 },
    {
        field: 'weight', headerName: 'Weight', width: 100,
        valueFormatter: (value) => `${value}%`
    },
    {
        field: 'actions', headerName: 'Actions', flex: 1,
        renderCell: (params) => (
            <Button
                variant="contained"
                size="small"
                onClick={() => window.location.href = `${window.location.pathname}/assessment/${params.row.id}`}
            >
                Grade
            </Button>
        )
    }
];

export default function SubjectDetail() {
    const router = useRouter();
    const params = useParams();
    const subjectId = params.id as string;

    const [assessments, setAssessments] = useState<AssessmentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchAssessments = () => {
        setLoading(true);
        fetch(`/api/assessments?subjectId=${subjectId}`)
            .then(res => res.json())
            .then(data => setAssessments(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (subjectId) fetchAssessments();
    }, [subjectId]);

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
                        Manage assessments and grades
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
            />
        </Container>
    );
}
