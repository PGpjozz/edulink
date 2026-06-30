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
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    CircularProgress
} from '@mui/material';
import {
    Assignment as AssignmentIcon,
    EventAvailable,
    Schedule,
    Groups
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import TimetableView from '@/app/components/TimetableView';
import TeacherTodayPanel from '@/app/components/TeacherTodayPanel';

type ClassInfo = { id: string; name: string; grade: string; _count?: { learners?: number }; timetable?: unknown };
type SubjectSummary = { id: string; name: string; grade: string; code?: string; _count?: { assessments?: number } };

type RosterLearner = { id: string; firstName: string; lastName: string; idNumber?: string; email?: string };

function ClassesSection({ onViewSchedule }: { onViewSchedule: (cls: ClassInfo) => void }) {
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [rosterClass, setRosterClass] = useState<ClassInfo | null>(null);
    const [roster, setRoster] = useState<RosterLearner[]>([]);
    const [rosterLoading, setRosterLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/classes')
            .then(res => res.json())
            .then(data => setClasses(Array.isArray(data) ? data : []))
            .catch(err => console.error(err));
    }, []);

    const openRoster = (cls: ClassInfo) => {
        setRosterClass(cls);
        setRoster([]);
        setRosterLoading(true);
        fetch(`/api/classes/${cls.id}/learners`)
            .then(res => (res.ok ? res.json() : []))
            .then(data => setRoster(Array.isArray(data) ? data : []))
            .catch(() => setRoster([]))
            .finally(() => setRosterLoading(false));
    };

    return (
        <>
            <Grid container spacing={3}>
                {classes.map((cls) => (
                    <Grid size={{ xs: 12, md: 4 }} key={cls.id}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" fontWeight="bold">{cls.name}</Typography>
                                <Typography color="text.secondary">Grade {cls.grade}</Typography>
                                <Typography variant="body2" sx={{ mt: 1 }}>{cls._count?.learners || 0} Learners</Typography>
                            </CardContent>
                            <Box p={2} pt={0} display="flex" flexDirection="column" gap={1}>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    size="small"
                                    startIcon={<Groups />}
                                    onClick={() => openRoster(cls)}
                                >
                                    View Learners
                                </Button>
                                <Box display="flex" gap={1}>
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

            <Dialog open={!!rosterClass} onClose={() => setRosterClass(null)} maxWidth="xs" fullWidth>
                <DialogTitle>
                    {rosterClass?.name} learners
                    <Typography variant="body2" color="text.secondary">
                        Grade {rosterClass?.grade} · {roster.length} learner{roster.length === 1 ? '' : 's'}
                    </Typography>
                </DialogTitle>
                <DialogContent dividers>
                    {rosterLoading ? (
                        <Box display="flex" justifyContent="center" py={3}><CircularProgress /></Box>
                    ) : roster.length === 0 ? (
                        <Typography color="text.secondary">No learners enrolled in this class yet.</Typography>
                    ) : (
                        <List dense>
                            {roster.map((l, i) => (
                                <ListItem key={l.id} disableGutters>
                                    <ListItemText
                                        primary={`${i + 1}. ${l.firstName} ${l.lastName}`}
                                        secondary={l.idNumber || l.email || ''}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRosterClass(null)}>Close</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default function TeacherDashboard() {
    const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [timetableOpen, setTimetableOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/subjects')
            .then(res => res.json())
            .then(data => {
                setSubjects(data);
                setLoading(false);
            })
            .catch(err => setLoading(false));
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

            <Typography variant="h6" gutterBottom color="text.secondary">
                Assigned Subjects
            </Typography>

            <Grid container spacing={3} sx={{ mb: 6 }}>
                {subjects.map((subject) => (
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
                ))}
            </Grid>

            <Box mb={4}>
                <Typography variant="h5" fontWeight="bold">My Classes</Typography>
                <Typography color="text.secondary">Classes you manage as a form teacher.</Typography>
            </Box>

            <ClassesSection onViewSchedule={handleViewSchedule} />

            {loading && <CircularProgress sx={{ mt: 4 }} />}
            {!loading && subjects.length === 0 && (
                <Typography color="text.secondary" sx={{ mt: 2 }}>
                    No subjects assigned yet.
                </Typography>
            )}

            {/* Schedule Modal */}
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
