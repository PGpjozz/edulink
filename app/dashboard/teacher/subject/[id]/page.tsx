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
import PageHeader from '@/app/components/ui/PageHeader';
import PageTransition from '@/app/components/ui/PageTransition';
import ContentPanel from '@/app/components/ui/ContentPanel';


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

    const fetchAssessments = useCallback(() => {
        Promise.resolve().then(() => setLoading(true));
        fetch(`/api/assessments?subjectId=${subjectId}`)
            .then(res => res.json())
            .then(data => setAssessments(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [subjectId]);

    useEffect(() => {
        if (subjectId) {
            fetchAssessments();
        }
    }, [subjectId, fetchAssessments]);

    return (
        <PageTransition>
            <Container maxWidth="xl">
                <PageHeader
                    title="Subject management"
                    subtitle="Manage assessments, resources, and grades."
                    breadcrumbs={[
                        { label: 'My Classroom', href: '/dashboard/teacher' },
                        { label: 'Subject' },
                    ]}
                    actions={
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsModalOpen(true)}>
                            Create assessment
                        </Button>
                    }
                />

                <Box mb={4}>
                    <SubjectHub subjectId={subjectId} role="TEACHER" />
                </Box>

                <ContentPanel title="Assessment gradebook" noPadding>
                <Box sx={{ height: 500, width: '100%' }}>
                    <DataGrid
                        rows={assessments}
                        columns={columns}
                        loading={loading}
                        disableRowSelectionOnClick
                    />
                </Box>
                </ContentPanel>

            <AddAssessmentModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchAssessments}
                subjectId={subjectId}
            />
            </Container>
        </PageTransition>
    );
}
