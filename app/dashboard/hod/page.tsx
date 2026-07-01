'use client';

import { useEffect, useState } from 'react';
import { Container, Grid, Button } from '@mui/material';
import { School, Groups, MenuBook } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import PageHeader from '@/app/components/ui/PageHeader';
import PageTransition from '@/app/components/ui/PageTransition';
import StatCard from '@/app/components/ui/StatCard';
import ContentPanel from '@/app/components/ui/ContentPanel';
import EmptyState from '@/app/components/ui/EmptyState';
import LoadingSkeleton from '@/app/components/ui/LoadingSkeleton';

type Department = {
    id: string;
    name: string;
    code?: string;
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
            <Container maxWidth="xl">
                <LoadingSkeleton variant="page" />
            </Container>
        );
    }

    const myDept = departments[0];

    return (
        <PageTransition>
            <Container maxWidth="xl">
                <PageHeader
                    title="Department overview"
                    subtitle="Monitor subjects, staff, and learner performance in your department."
                    breadcrumbs={[
                        { label: 'My Classroom', href: '/dashboard/teacher' },
                        { label: 'Department' },
                    ]}
                    actions={
                        session?.user?.hasTeacherProfile ? (
                            <Button variant="outlined" onClick={() => router.push('/dashboard/teacher')}>
                                My Classroom
                            </Button>
                        ) : undefined
                    }
                />

                {!myDept ? (
                    <EmptyState
                        icon={<School sx={{ fontSize: 56 }} />}
                        title="No department assigned"
                        description="Ask your principal to assign you as HOD in Departments."
                        actionLabel={session?.user?.hasTeacherProfile ? 'Go to My Classroom' : undefined}
                        onAction={session?.user?.hasTeacherProfile ? () => router.push('/dashboard/teacher') : undefined}
                    />
                ) : (
                    <>
                        <Grid container spacing={2} sx={{ mb: 4 }}>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <StatCard label="Department" value={myDept.name} icon={<School />} variant="primary" />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <StatCard label="Subjects" value={myDept._count?.subjects ?? subjects.length} icon={<MenuBook />} />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <StatCard label="Teachers" value={myDept._count?.teachers ?? 0} icon={<Groups />} />
                            </Grid>
                        </Grid>

                        <ContentPanel title="Department subjects" subtitle={`All subjects in ${myDept.name}`}>
                            {subjects.length === 0 ? (
                                <EmptyState title="No subjects yet" description="Subjects in your department will appear here." />
                            ) : (
                                <Grid container spacing={2}>
                                    {subjects.map((s) => (
                                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={s.id}>
                                            <StatCard
                                                label={`Grade ${s.grade}`}
                                                value={s.name}
                                                subtitle={s.code || undefined}
                                                variant="default"
                                            />
                                        </Grid>
                                    ))}
                                </Grid>
                            )}
                        </ContentPanel>
                    </>
                )}
            </Container>
        </PageTransition>
    );
}
