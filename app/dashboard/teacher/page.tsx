'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    Grid,
    Button,
    Chip,
    Dialog,
    Skeleton,
    Alert,
} from '@mui/material';
import {
    Assignment as AssignmentIcon,
    EventAvailable,
    Schedule
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import TimetableView from '@/app/components/TimetableView';
import TeacherTodayPanel from '@/app/components/TeacherTodayPanel';

type ClassInfo = { id: string; name: string; grade: string; _count?: { learners?: number }; timetable?: unknown };
type SubjectSummary = { id: string; name: string; grade: string; code?: string; _count?: { assessments?: number } };

function SubjectCardSkeleton() {
    return (
        <Grid size={{ xs: 12, md: 4 }}>
            <Skeleton variant="rounded" height={200} />
        </Grid>
    );
}

function ClassesSection({ onViewSchedule }: { onViewSchedule: (cls: ClassInfo) => void }) {
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/classes')
            .then((res) => {
                if (!res.ok) throw new Error('Failed to load classes');
                return res.json();
            })
            .then((data) => {
                if (!Array.isArray(data)) throw new Error('Invalid response');
                setClasses(data);
            })
            .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load classes'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <Grid container spacing={3}>
                {[1, 2].map((i) => (
                    <Grid size={{ xs: 12, md: 4 }} key={i}>
                        <Skeleton variant="rounded" height={160} />
                    </Grid>
                ))}
            </Grid>
        );
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    return (
        <Grid container spacing={3}>
            {classes.map((cls) => (
                <Grid size={{ xs: 12, md: 4 }} key={cls.id}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" fontWeight="bold">{cls.name}</Typography>
                            <Typography color="text.secondary">Grade {cls.grade}</Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>{cls._count?.learners || 0} Learners</Typography>
                        </CardContent>
                        <Box p={2} pt={0} display="flex" gap={1}>
                            <Button
                                variant="contained"
                                fullWidth
                                size="small"
                                startIcon={<EventAvailable />}
                                onClick={() => router.push(`/dashboard/teacher/class/${cls.id}/attendance`)}
                            >
                                Attendance
                            </Button>
                            <Button
                                variant="outlined"
                                fullWidth
                                size="small"
                                startIcon={<Schedule />}
                                onClick={() => onViewSchedule(cls)}
                            >
                                Schedule
                            </Button>
                        </Box>
                    </Card>
                </Grid>
            ))}
            {classes.length === 0 && (
                <Grid size={{ xs: 12 }}>
                    <Typography color="text.secondary">No classes found.</Typography>
                </Grid>
            )}
        </Grid>
    );
}

export default function TeacherDashboard() {
    const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timetableOpen, setTimetableOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/subjects')
            .then((res) => {
                if (!res.ok) throw new Error('Failed to load subjects');
                return res.json();
            })
            .then((data) => {
                if (!Array.isArray(data)) throw new Error('Invalid response');
                setSubjects(data);
            })
            .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load subjects'))
            .finally(() => setLoading(false));
    }, []);

    const handleViewSchedule = (cls: ClassInfo) => {
        setSelectedClass(cls);
        setTimetableOpen(true);
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 4 }}>
            <Box mb={4}>
                <Typography variant="h4" fontWeight="bold">
                    My Classroom
                </Typography>
            </Box>

            <TeacherTodayPanel />

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Typography variant="h6" gutterBottom color="text.secondary">
                Assigned Subjects
            </Typography>

            <Grid container spacing={3} sx={{ mb: 6 }}>
                {loading ? (
                    <>
                        <SubjectCardSkeleton />
                        <SubjectCardSkeleton />
                        <SubjectCardSkeleton />
                    </>
                ) : subjects.length === 0 ? (
                    <Grid size={{ xs: 12 }}>
                        <Typography color="text.secondary">
                            No subjects assigned yet.
                        </Typography>
                    </Grid>
                ) : (
                    subjects.map((subject) => (
                        <Grid size={{ xs: 12, md: 4 }} key={subject.id}>
                            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                        <Typography variant="h5" fontWeight="bold" gutterBottom>
                                            {subject.name}
                                        </Typography>
                                        <Chip label={`Grade ${subject.grade}`} size="small" color="primary" />
                                    </Box>
                                    <Typography color="text.secondary" gutterBottom>
                                        Code: {subject.code || '-'}
                                    </Typography>
                                    <Typography variant="body2" sx={{ mt: 2 }}>
                                        {subject._count?.assessments || 0} Assessments
                                    </Typography>
                                </CardContent>
                                <Box p={2} pt={0}>
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        startIcon={<AssignmentIcon />}
                                        onClick={() => router.push(`/dashboard/teacher/subject/${subject.id}`)}
                                    >
                                        Manage Assessments
                                    </Button>
                                </Box>
                            </Card>
                        </Grid>
                    ))
                )}
            </Grid>

            <Box mb={4}>
                <Typography variant="h5" fontWeight="bold">My Classes</Typography>
                <Typography color="text.secondary">Classes you manage as a form teacher.</Typography>
            </Box>

            <ClassesSection onViewSchedule={handleViewSchedule} />

            <Dialog
                open={timetableOpen}
                onClose={() => setTimetableOpen(false)}
                maxWidth="lg"
                fullWidth
            >
                <Box p={3}>
                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                        {selectedClass?.name} - Weekly Schedule
                    </Typography>
                    <TimetableView timetable={selectedClass?.timetable} />
                    <Box mt={2} display="flex" justifyContent="flex-end">
                        <Button onClick={() => setTimetableOpen(false)}>Close</Button>
                    </Box>
                </Box>
            </Dialog>
        </Container>
    );
}
