'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Grid,
    Card,
    CardContent,
    Button,
    Chip,
    Stack,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    MenuBook,
    FileDownload,
    Assignment,
    ChevronRight,
    Refresh,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import PageHeader from '@/app/components/ui/PageHeader';
import PageTransition from '@/app/components/ui/PageTransition';
import LoadingSkeleton from '@/app/components/ui/LoadingSkeleton';
import EmptyState from '@/app/components/ui/EmptyState';

export default function TeacherGradebook() {
    type SubjectSummary = {
        id: string;
        name: string;
        grade: string;
        code?: string;
        _count?: { assessments?: number; quizzes?: number };
    };
    const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchGradebookData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/subjects');
            const data: SubjectSummary[] = await res.json();
            setSubjects(data);
        } catch (err) {
            console.error('Failed to fetch gradebook subjects:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGradebookData();
    }, []);

    const exportToCSV = (subject: SubjectSummary) => {
        console.log(`Exporting CSV for ${subject.name}`);
        alert(`Exporting grades for ${subject.name} to CSV...`);
    };

    return (
        <PageTransition>
            <Container maxWidth="xl">
                <PageHeader
                    title="Digital Gradebook"
                    subtitle="Access your subjects and manage holistic academic records."
                    breadcrumbs={[{ label: 'My Classroom', href: '/dashboard/teacher' }, { label: 'Gradebook' }]}
                    actions={
                        <Button startIcon={<Refresh />} onClick={fetchGradebookData}>
                            Refresh
                        </Button>
                    }
                />

                {loading ? (
                    <LoadingSkeleton variant="cards" count={6} />
                ) : subjects.length === 0 ? (
                    <EmptyState
                        icon={<Assignment sx={{ fontSize: 56 }} />}
                        title="No subjects yet"
                        description="Subjects assigned to you will appear here for grading."
                    />
                ) : (
                    <Grid container spacing={3}>
                        {subjects.map((subject) => (
                            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={subject.id}>
                                <Card
                                    sx={{
                                        height: '100%',
                                        borderRadius: 3,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        boxShadow: 0,
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: 2,
                                        },
                                    }}
                                >
                                    <CardContent>
                                        <Box display="flex" justifyContent="space-between" mb={2}>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <MenuBook color="primary" />
                                                <Box component="span" fontWeight="bold">
                                                    {subject.name}
                                                </Box>
                                            </Box>
                                            <Chip label={`Gr ${subject.grade}`} size="small" variant="outlined" />
                                        </Box>
                                        <Stack spacing={1} sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                                            <Box display="flex" justifyContent="space-between">
                                                <Box component="span" fontSize="0.75rem" fontWeight="bold">
                                                    Assessments
                                                </Box>
                                                <Box component="span" fontSize="0.75rem">
                                                    {subject._count?.assessments || 0}
                                                </Box>
                                            </Box>
                                            <Box display="flex" justifyContent="space-between">
                                                <Box component="span" fontSize="0.75rem" fontWeight="bold">
                                                    Quizzes
                                                </Box>
                                                <Box component="span" fontSize="0.75rem">
                                                    {subject._count?.quizzes || 0}
                                                </Box>
                                            </Box>
                                        </Stack>
                                        <Box mt={3} display="flex" gap={1}>
                                            <Button
                                                variant="contained"
                                                fullWidth
                                                size="small"
                                                endIcon={<ChevronRight />}
                                                onClick={() => router.push(`/dashboard/teacher/gradebook/${subject.id}`)}
                                            >
                                                Open grades
                                            </Button>
                                            <Tooltip title="Export CSV">
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    sx={{ border: '1px solid', borderColor: 'divider' }}
                                                    onClick={() => exportToCSV(subject)}
                                                >
                                                    <FileDownload fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Container>
        </PageTransition>
    );
}
