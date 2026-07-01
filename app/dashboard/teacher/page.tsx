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
} from '@mui/material';
import {
    Assignment as AssignmentIcon,
    EventAvailable,
    Schedule,
    MenuBook,
    Groups,
    School,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import TimetableView from '@/app/components/TimetableView';
import TeacherTodayPanel from '@/app/components/TeacherTodayPanel';
import PageHeader from '@/app/components/ui/PageHeader';
import PageTransition from '@/app/components/ui/PageTransition';
import LoadingSkeleton from '@/app/components/ui/LoadingSkeleton';
import EmptyState from '@/app/components/ui/EmptyState';
import StatCard from '@/app/components/ui/StatCard';
import ContentPanel from '@/app/components/ui/ContentPanel';
import { getTimeGreeting } from '@/lib/greeting';

type ClassInfo = { id: string; name: string; grade: string; _count?: { learners?: number }; timetable?: unknown };
type SubjectSummary = { id: string; name: string; grade: string; code?: string; _count?: { assessments?: number } };

const SUBJECT_ICONS: Record<string, string> = {
    Mathematics: '📐',
    'English Home Language': '📖',
    English: '📖',
    'Physical Sciences': '🔬',
    Accounting: '📊',
};

export default function TeacherDashboard() {
    const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [departmentName, setDepartmentName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [timetableOpen, setTimetableOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
    const router = useRouter();
    const { data: session } = useSession();

    useEffect(() => {
        const requests: Promise<void>[] = [
            fetch('/api/subjects').then(res => res.json()).then(data => setSubjects(Array.isArray(data) ? data : [])).catch(() => {}),
            fetch('/api/classes').then(res => res.json()).then(data => setClasses(Array.isArray(data) ? data : [])).catch(() => {}),
        ];

        if (session?.user?.role === 'HOD') {
            requests.push(
                fetch('/api/departments')
                    .then(res => res.json())
                    .then((depts: { name: string }[]) => {
                        if (Array.isArray(depts) && depts[0]) setDepartmentName(depts[0].name);
                    })
                    .catch(() => {}),
            );
        }

        Promise.all(requests).finally(() => setLoading(false));
    }, [session?.user?.role]);

    const firstName = session?.user?.name?.split(' ')[0] ?? 'Teacher';
    const greeting = getTimeGreeting();
    const totalLearners = classes.reduce((sum, c) => sum + (c._count?.learners ?? 0), 0);
    const totalAssessments = subjects.reduce((sum, s) => sum + (s._count?.assessments ?? 0), 0);

    if (loading) {
        return (
            <Container maxWidth="xl">
                <LoadingSkeleton variant="page" />
            </Container>
        );
    }

    return (
        <PageTransition>
            <Container maxWidth="xl">
                <PageHeader
                    title={`${greeting}, ${firstName}`}
                    subtitle={
                        session?.user?.role === 'HOD' && departmentName
                            ? `Head of ${departmentName} · ${subjects.length} subjects · ${classes.length} classes`
                            : `${subjects.length} subjects assigned · ${classes.length} classes`
                    }
                    actions={
                        session?.user?.role === 'HOD' ? (
                            <Button variant="outlined" onClick={() => router.push('/dashboard/hod')}>
                                Department overview
                            </Button>
                        ) : undefined
                    }
                />

                <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <StatCard label="Subjects" value={subjects.length} icon={<MenuBook />} variant="primary" />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <StatCard label="Classes" value={classes.length} icon={<School />} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <StatCard label="Learners" value={totalLearners} icon={<Groups />} subtitle={`${totalAssessments} assessments`} />
                    </Grid>
                </Grid>

                <Box sx={{ mb: 4 }}>
                    <TeacherTodayPanel />
                </Box>

                <ContentPanel title="Assigned subjects" subtitle="Manage assessments and learner progress" sx={{ mb: 4 }}>
                    {subjects.length === 0 ? (
                        <EmptyState
                            icon={<MenuBook sx={{ fontSize: 56 }} />}
                            title="No subjects assigned"
                            description="Your principal will assign subjects to you. Check back soon or contact administration."
                        />
                    ) : (
                        <Grid container spacing={2}>
                            {subjects.map((subject) => (
                                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={subject.id}>
                                    <Card
                                        sx={{
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            transition: 'transform 0.15s, box-shadow 0.15s',
                                            '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
                                        }}
                                    >
                                        <CardContent sx={{ flexGrow: 1 }}>
                                            <Box display="flex" gap={1.5} alignItems="flex-start" mb={1}>
                                                <Typography fontSize="1.75rem" lineHeight={1}>
                                                    {SUBJECT_ICONS[subject.name] ?? '📚'}
                                                </Typography>
                                                <Box flex={1}>
                                                    <Typography variant="h6" fontWeight="bold">
                                                        {subject.name}
                                                    </Typography>
                                                    <Chip label={`Grade ${subject.grade}`} size="small" color="primary" variant="outlined" sx={{ mt: 0.5 }} />
                                                </Box>
                                            </Box>
                                            <Typography variant="body2" color="text.secondary">
                                                Code: {subject.code || '—'} · {subject._count?.assessments || 0} assessments
                                            </Typography>
                                        </CardContent>
                                        <Box px={2} pb={2}>
                                            <Button
                                                variant="contained"
                                                fullWidth
                                                size="small"
                                                startIcon={<AssignmentIcon />}
                                                onClick={() => router.push(`/dashboard/teacher/subject/${subject.id}`)}
                                            >
                                                Manage assessments
                                            </Button>
                                        </Box>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </ContentPanel>

                <ContentPanel title="My classes" subtitle="Form classes you manage">
                    {classes.length === 0 ? (
                        <EmptyState
                            icon={<Groups sx={{ fontSize: 56 }} />}
                            title="No classes yet"
                            description="Classes where you are the form teacher will appear here."
                        />
                    ) : (
                        <Grid container spacing={2}>
                            {classes.map((cls) => (
                                <Grid size={{ xs: 12, md: 4 }} key={cls.id}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="h6" fontWeight="bold">{cls.name}</Typography>
                                            <Typography color="text.secondary">Grade {cls.grade}</Typography>
                                            <Chip
                                                label={`${cls._count?.learners || 0} learners`}
                                                size="small"
                                                sx={{ mt: 1 }}
                                            />
                                        </CardContent>
                                        <Box px={2} pb={2} display="flex" gap={1}>
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
                                                onClick={() => {
                                                    setSelectedClass(cls);
                                                    setTimetableOpen(true);
                                                }}
                                            >
                                                Schedule
                                            </Button>
                                        </Box>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </ContentPanel>

                <Dialog open={timetableOpen} onClose={() => setTimetableOpen(false)} maxWidth="lg" fullWidth>
                    <Box p={3}>
                        <Typography variant="h5" fontWeight="bold" gutterBottom>
                            {selectedClass?.name} — weekly schedule
                        </Typography>
                        <TimetableView timetable={selectedClass?.timetable} />
                        <Box mt={2} display="flex" justifyContent="flex-end">
                            <Button onClick={() => setTimetableOpen(false)}>Close</Button>
                        </Box>
                    </Box>
                </Dialog>
            </Container>
        </PageTransition>
    );
}
