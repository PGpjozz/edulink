'use client';

import { Suspense, useEffect, useState } from 'react';
import {
    Box, Container, Typography, Card, CardActionArea, CardContent, Grid, Avatar,
    CircularProgress, Paper, Alert, Button, Stack,
} from '@mui/material';
import { Person as PersonIcon, Notifications, Assignment, Payments } from '@mui/icons-material';
import Link from 'next/link';
import LearnerProgressView from '@/app/components/LearnerProgressView';
import AnnouncementsFeed from '@/app/components/AnnouncementsFeed';
import { useParentChild } from '@/lib/useParentChild';

function ParentDashboardInner() {
    const { children, selected, loading, setChildId } = useParentChild();
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        fetch('/api/notifications')
            .then((r) => r.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    setUnread(data.filter((n: { isRead: boolean }) => !n.isRead).length);
                }
            });
    }, []);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" py={10}>
                <CircularProgress />
            </Box>
        );
    }

    if (children.length === 0) {
        return (
            <Container maxWidth="xl" sx={{ mt: 4 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>Parent Portal</Typography>
                <Alert severity="info">No linked children found. Please contact administration.</Alert>
            </Container>
        );
    }

    const childQ = selected ? `?childId=${selected.id}` : '';

    return (
        <Container maxWidth="xl" sx={{ mt: 4 }}>
            <Box mb={4}>
                <Typography variant="h4" fontWeight="bold">Parent Portal</Typography>
                <Typography color="text.secondary">Supporting your children&apos;s educational journey.</Typography>
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 3 }}>
                {unread > 0 && (
                    <Button component={Link} href={`/dashboard/parent/notifications${childQ}`} variant="outlined" startIcon={<Notifications />} color="warning">
                        {unread} unread alert{unread > 1 ? 's' : ''}
                    </Button>
                )}
                <Button component={Link} href={`/dashboard/parent/homework${childQ}`} variant="outlined" startIcon={<Assignment />}>
                    Homework
                </Button>
                <Button component={Link} href={`/dashboard/parent/billing${childQ}`} variant="outlined" startIcon={<Payments />}>
                    Billing
                </Button>
            </Stack>

            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Announcements</Typography>
                <AnnouncementsFeed compact />
            </Paper>

            <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 3 }}>
                    <Typography variant="h6" gutterBottom fontWeight="bold">My Children</Typography>
                    <Box display="flex" flexDirection="column" gap={2}>
                        {children.map((child) => (
                            <Card
                                key={child.id}
                                sx={{
                                    border: selected?.id === child.id ? '2px solid' : 'none',
                                    borderColor: 'primary.main',
                                    boxShadow: selected?.id === child.id ? 4 : 1,
                                }}
                            >
                                <CardActionArea onClick={() => setChildId(child.id)}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" gap={2}>
                                            <Avatar sx={{ bgcolor: selected?.id === child.id ? 'primary.main' : 'grey.400' }}>
                                                <PersonIcon />
                                            </Avatar>
                                            <Box>
                                                <Typography variant="subtitle1" fontWeight="bold">{child.name}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Grade {child.grade} ({child.className})
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        ))}
                    </Box>
                </Grid>

                <Grid size={{ xs: 12, md: 9 }}>
                    {selected && <LearnerProgressView childId={selected.id} />}
                </Grid>
            </Grid>
        </Container>
    );
}

export default function ParentDashboard() {
    return (
        <Suspense fallback={<Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>}>
            <ParentDashboardInner />
        </Suspense>
    );
}
