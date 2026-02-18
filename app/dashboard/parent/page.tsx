'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Card,
    CardActionArea,
    CardContent,
    Grid,
    Avatar,
    CircularProgress,
    Tabs,
    Tab,
    Divider,
    Paper
} from '@mui/material';
import { Person as PersonIcon, School, Assessment, EventRepeat } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import LearnerProgressView from '@/app/components/LearnerProgressView';

export default function ParentDashboard() {
    const [children, setChildren] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
    const [tabValue, setTabValue] = useState(0);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/parent/children')
            .then(res => res.json())
            .then(data => {
                setChildren(data);
                if (data.length > 0) {
                    setSelectedChildId(data[0].id);
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return (
        <Box display="flex" justifyContent="center" py={10}>
            <CircularProgress />
        </Box>
    );

    if (children.length === 0) {
        return (
            <Container maxWidth="xl" sx={{ mt: 4 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>Parent Portal</Typography>
                <Alert severity="info">No linked children found. Please contact administration.</Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ mt: 4 }}>
            <Box mb={4}>
                <Typography variant="h4" fontWeight="bold">Parent Portal</Typography>
                <Typography color="text.secondary">Supporting your children's educational journey.</Typography>
            </Box>

            <Grid container spacing={4}>
                {/* Child Selection Sidebar/Grid */}
                <Grid size={{ xs: 12, md: 3 }}>
                    <Typography variant="h6" gutterBottom fontWeight="bold">My Children</Typography>
                    <Box display="flex" flexDirection="column" gap={2}>
                        {children.map((child) => (
                            <Card
                                key={child.id}
                                sx={{
                                    border: selectedChildId === child.id ? '2px solid' : 'none',
                                    borderColor: 'primary.main',
                                    boxShadow: selectedChildId === child.id ? 4 : 1
                                }}
                            >
                                <CardActionArea onClick={() => setSelectedChildId(child.id)}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" gap={2}>
                                            <Avatar sx={{ bgcolor: selectedChildId === child.id ? 'primary.main' : 'grey.400' }}>
                                                <PersonIcon />
                                            </Avatar>
                                            <Box>
                                                <Typography variant="subtitle1" fontWeight="bold">{child.name}</Typography>
                                                <Typography variant="body2" color="text.secondary">Grade {child.grade} ({child.className})</Typography>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        ))}
                    </Box>
                </Grid>

                {/* Main Content Area */}
                <Grid size={{ xs: 12, md: 9 }}>
                    {selectedChildId && (
                        <Box>
                            <Paper sx={{ p: 1, mb: 3, borderRadius: 2 }}>
                                <Tabs
                                    value={tabValue}
                                    onChange={(_, v) => {
                                        setTabValue(v);
                                        requestAnimationFrame(() => (document.activeElement as HTMLElement | null)?.blur?.());
                                    }}
                                    variant="fullWidth"
                                    indicatorColor="primary"
                                    textColor="primary"
                                >
                                    <Tab label="Performance & Timetable" icon={<Assessment fontSize="small" />} iconPosition="start" />
                                </Tabs>
                            </Paper>

                            <Box animate={{ opacity: 1 }} component={motion.div} key={selectedChildId} initial={{ opacity: 0 }}>
                                <LearnerProgressView childId={selectedChildId} />
                            </Box>
                        </Box>
                    )}
                </Grid>
            </Grid>
        </Container>
    );
}

// Missing motion import handled via layout or component
import { motion } from 'framer-motion';
import { Alert } from '@mui/material';
