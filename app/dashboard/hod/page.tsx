'use client';

import { useEffect, useState } from 'react';
import {
    Box, Container, Typography, Grid, Card, CardContent, Chip, CircularProgress, Alert, Button,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type Department = {
    id: string;
    name: string;
    code?: string;
    hod?: { firstName: string; lastName: string };
    _count?: { subjects: number; teachers: number };
};

type Subject = { id: string; name: string; grade: string; code?: string };

export default function HodDashboard() {
    const router = useRouter();
    const { data: session } = useSession();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('/api/departments').then((r) => r.json()),
            fetch('/api/subjects').then((r) => r.json()),
        ])
            .then(([d, s]) => {
                setDepartments(Array.isArray(d) ? d : []);
                setSubjects(Array.isArray(s) ? s : []);
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" py={10}>
                <CircularProgress />
            </Box>
        );
    }

    const myDept = departments[0];

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Department overview
                    </Typography>
                    <Typography color="text.secondary">
                        Monitor your department&apos;s subjects, staff, and learner performance.
                    </Typography>
                </Box>
                {session?.user?.hasTeacherProfile && (
                    <Button variant="contained" onClick={() => router.push('/dashboard/teacher')}>
                        Go to my classroom
                    </Button>
                )}
            </Box>

            {!myDept && (
                <Alert severity="info" sx={{ mb: 3 }}>
                    No department is assigned to you yet. Ask your principal to assign you as HOD in Departments.
                    {session?.user?.hasTeacherProfile && (
                        <> You can still access your classes from <strong>My Classroom</strong> in the sidebar.</>
                    )}
                </Alert>
            )}

            {myDept && (
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Card>
                            <CardContent>
                                <Typography color="text.secondary">Department</Typography>
                                <Typography variant="h5" fontWeight="bold">{myDept.name}</Typography>
                                {myDept.code && <Chip label={myDept.code} size="small" sx={{ mt: 1 }} />}
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 6, md: 4 }}>
                        <Card>
                            <CardContent>
                                <Typography color="text.secondary">Subjects</Typography>
                                <Typography variant="h4" fontWeight="bold">{myDept._count?.subjects ?? subjects.length}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 6, md: 4 }}>
                        <Card>
                            <CardContent>
                                <Typography color="text.secondary">Teachers</Typography>
                                <Typography variant="h4" fontWeight="bold">{myDept._count?.teachers ?? 0}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            <Typography variant="h6" fontWeight="bold" gutterBottom>
                Department subjects
            </Typography>
            <Grid container spacing={2}>
                {subjects.map((s) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={s.id}>
                        <Card variant="outlined">
                            <CardContent>
                                <Typography fontWeight="bold">{s.name}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Grade {s.grade} · {s.code || '—'}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
                {subjects.length === 0 && (
                    <Grid size={{ xs: 12 }}>
                        <Typography color="text.secondary">No subjects in your department scope yet.</Typography>
                    </Grid>
                )}
            </Grid>
        </Container>
    );
}
