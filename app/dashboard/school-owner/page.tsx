'use client';

import { useEffect, useState } from 'react';
import {
    Container, Typography, Box, Grid, Card, CardContent, Button, Paper,
    TextField, FormControl, InputLabel, Select, MenuItem, Alert, Tabs, Tab,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import AnnouncementsFeed from '@/app/components/AnnouncementsFeed';
import Link from 'next/link';

export default function SchoolOwnerDashboard() {
    const router = useRouter();
    const [tab, setTab] = useState(0);
    const [school, setSchool] = useState<{ name?: string; contactEmail?: string } | null>(null);
    const [stats, setStats] = useState({ users: 0, classes: 0 });

    useEffect(() => {
        Promise.all([
            fetch('/api/school/overview').then((r) => r.ok ? r.json() : null),
            fetch('/api/users').then((r) => r.ok ? r.json() : []),
            fetch('/api/classes').then((r) => r.ok ? r.json() : []),
        ]).then(([overview, users, classes]) => {
            if (overview?.school) setSchool(overview.school);
            setStats({
                users: Array.isArray(users) ? users.length : 0,
                classes: Array.isArray(classes) ? classes.length : 0,
            });
        });
    }, []);

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                School Owner
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
                Manage your school account, staff invites, and subscription.
            </Typography>

            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card><CardContent>
                        <Typography color="text.secondary">School</Typography>
                        <Typography variant="h6" fontWeight="bold">{school?.name ?? '—'}</Typography>
                    </CardContent></Card>
                </Grid>
                <Grid size={{ xs: 6, md: 4 }}>
                    <Card><CardContent>
                        <Typography color="text.secondary">Staff & users</Typography>
                        <Typography variant="h4" fontWeight="bold">{stats.users}</Typography>
                    </CardContent></Card>
                </Grid>
                <Grid size={{ xs: 6, md: 4 }}>
                    <Card><CardContent>
                        <Typography color="text.secondary">Classes</Typography>
                        <Typography variant="h4" fontWeight="bold">{stats.classes}</Typography>
                    </CardContent></Card>
                </Grid>
            </Grid>

            <Paper sx={{ mb: 3 }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                    <Tab label="Quick actions" />
                    <Tab label="Announcements" />
                </Tabs>
                <Box p={3}>
                    {tab === 0 && (
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Button fullWidth variant="contained" component={Link} href="/dashboard/school-owner/invites">
                                    Invite staff
                                </Button>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Button fullWidth variant="outlined" component={Link} href="/dashboard/school-owner/permissions">
                                    Permissions
                                </Button>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Button fullWidth variant="outlined" onClick={() => router.push('/dashboard/principal')}>
                                    School operations
                                </Button>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Button fullWidth variant="outlined" onClick={() => router.push('/dashboard/principal/subscription')}>
                                    Subscription
                                </Button>
                            </Grid>
                        </Grid>
                    )}
                    {tab === 1 && (
                        <Box>
                            <Box display="flex" justifyContent="space-between" mb={2}>
                                <Typography variant="h6">School announcements</Typography>
                                <Button variant="contained" component={Link} href="/dashboard/school-owner/announcements">
                                    Post announcement
                                </Button>
                            </Box>
                            <AnnouncementsFeed />
                        </Box>
                    )}
                </Box>
            </Paper>
        </Container>
    );
}
