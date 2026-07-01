'use client';

import { Suspense, useEffect, useState } from 'react';
import {
    Box, Container, Typography, Card, CardActionArea, CardContent, Grid, Avatar,
    Alert, Button, ToggleButton, ToggleButtonGroup, Chip,
} from '@mui/material';
import { Person as PersonIcon, Notifications, Assignment, Payments, Message } from '@mui/icons-material';
import Link from 'next/link';
import LearnerProgressView from '@/app/components/LearnerProgressView';
import AnnouncementsFeed from '@/app/components/AnnouncementsFeed';
import { useParentChild } from '@/lib/useParentChild';
import PageHeader from '@/app/components/ui/PageHeader';
import PageTransition from '@/app/components/ui/PageTransition';
import LoadingSkeleton from '@/app/components/ui/LoadingSkeleton';
import EmptyState from '@/app/components/ui/EmptyState';
import ContentPanel from '@/app/components/ui/ContentPanel';

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
        return <LoadingSkeleton variant="page" />;
    }

    if (children.length === 0) {
        return (
            <EmptyState
                icon={<PersonIcon sx={{ fontSize: 56 }} />}
                title="No children linked"
                description="Please contact your school administration to link your account to your children."
            />
        );
    }

    const childQ = selected ? `?childId=${selected.id}` : '';

    return (
        <PageTransition>
            <PageHeader
                title="Parent portal"
                subtitle="Stay connected with your children's school life."
                actions={
                    <Button component={Link} href={`/dashboard/messages${childQ}`} variant="outlined" startIcon={<Message />}>
                        Messages
                    </Button>
                }
            />

            {unread > 0 && (
                <Alert
                    severity="warning"
                    sx={{ mb: 3, borderRadius: 3 }}
                    action={
                        <Button component={Link} href={`/dashboard/parent/notifications${childQ}`} color="inherit" size="small">
                            View alerts
                        </Button>
                    }
                >
                    You have <strong>{unread}</strong> unread alert{unread > 1 ? 's' : ''}.
                </Alert>
            )}

            <ContentPanel title="Select child" subtitle="Choose a child to view their progress" sx={{ mb: 3 }}>
                <ToggleButtonGroup
                    value={selected?.id ?? ''}
                    exclusive
                    onChange={(_, val) => val && setChildId(val)}
                    sx={{ flexWrap: 'wrap', gap: 1 }}
                >
                    {children.map((child) => (
                        <ToggleButton
                            key={child.id}
                            value={child.id}
                            sx={{
                                borderRadius: '12px !important',
                                px: 2,
                                py: 1.5,
                                textTransform: 'none',
                                border: '1px solid !important',
                            }}
                        >
                            <Avatar sx={{ width: 32, height: 32, mr: 1.5, bgcolor: 'primary.main' }}>
                                {child.name[0]}
                            </Avatar>
                            <Box textAlign="left">
                                <Typography variant="body2" fontWeight="bold">{child.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Grade {child.grade} · {child.className}
                                </Typography>
                            </Box>
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </ContentPanel>

            <Grid container spacing={1} sx={{ mb: 3 }}>
                <Grid size="auto">
                    <Chip component={Link} href={`/dashboard/parent/homework${childQ}`} icon={<Assignment />} label="Homework" clickable variant="outlined" />
                </Grid>
                <Grid size="auto">
                    <Chip component={Link} href={`/dashboard/parent/billing${childQ}`} icon={<Payments />} label="Billing" clickable variant="outlined" />
                </Grid>
                <Grid size="auto">
                    <Chip component={Link} href={`/dashboard/parent/notifications${childQ}`} icon={<Notifications />} label="Alerts" clickable variant="outlined" />
                </Grid>
            </Grid>

            <ContentPanel title="Announcements" sx={{ mb: 3 }}>
                <AnnouncementsFeed compact />
            </ContentPanel>

            {selected && (
                <ContentPanel title={`${selected.name}'s progress`} noPadding>
                    <Box p={{ xs: 2, md: 3 }}>
                        <LearnerProgressView childId={selected.id} />
                    </Box>
                </ContentPanel>
            )}
        </PageTransition>
    );
}

export default function ParentDashboard() {
    return (
        <Container maxWidth="xl">
            <Suspense fallback={<LoadingSkeleton variant="page" />}>
                <ParentDashboardInner />
            </Suspense>
        </Container>
    );
}
