'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    Grid,
    LinearProgress,
    Divider,
    Alert,
    Tabs,
    Tab,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button
} from '@mui/material';
import { motion } from 'framer-motion';
import AnalyticsChart from './AnalyticsChart';
import TimetableView from './TimetableView';
import SubjectHub from './SubjectHub';
import BehaviorTracker from './BehaviorTracker';
import AIInsightsSection from './AIInsightsSection';
import { MenuBook, EmojiEvents, HistoryEdu, AutoAwesome } from '@mui/icons-material';

interface AssessmentView {
    id: string;
    title: string;
    userScore: number | null;
    totalMarks: number;
    percentage: number | null;
}

interface SubjectView {
    id: string;
    name: string;
    code?: string;
    average: number | null;
    assessments: AssessmentView[];
}

interface LearnerProgressViewProps {
    childId?: string; // Optional: If present, fetches data for this child (if parent)
}

export default function LearnerProgressView({ childId }: LearnerProgressViewProps) {
    const [data, setData] = useState<{ learner: any, subjects: SubjectView[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tabValue, setTabValue] = useState(0);
    const [hubOpen, setHubOpen] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<SubjectView | null>(null);

    useEffect(() => {
        const url = childId
            ? `/api/learner/dashboard?childId=${childId}`
            : '/api/learner/dashboard';

        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch data');
                return res.json();
            })
            .then(setData)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [childId]);

    if (loading) return <LinearProgress />;
    if (error) return <Alert severity="error">{error}</Alert>;
    if (!data) return <Typography sx={{ m: 4 }}>No data available.</Typography>;
    if (!data.learner) return <Typography sx={{ m: 4 }}>No data available.</Typography>;

    // Prepare chart data
    const chartData = data?.subjects.map(sub => ({
        name: sub.code || sub.name.substring(0, 3), // Use code or short name
        score: sub.average || 0,
        fullSubjectName: sub.name
    })) || [];

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    const handleOpenHub = (subject: SubjectView) => {
        setSelectedSubject(subject);
        setHubOpen(true);
    };

    const handleTabsWheelCapture = (e: any) => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.stopPropagation();
        }
    };

    return (
        <Box>
            <Box
                mb={4}
                display="flex"
                flexDirection={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'flex-end' }}
                gap={2}
            >
                <Box>
                    <Typography variant="h4" fontWeight="bold">
                        {childId ? `${data.learner.name}'s Progress` : 'My Progress'}
                    </Typography>
                    <Typography variant="h6" color="primary">
                        {data.learner.className} • Grade {data.learner.grade}
                    </Typography>
                </Box>

                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: { md: 'flex-end' }, gap: 1 }}>
                    <Tabs
                        value={tabValue}
                        onChange={(_, v) => {
                            setTabValue(v);
                            requestAnimationFrame(() => (document.activeElement as HTMLElement | null)?.blur?.());
                        }}
                        onWheelCapture={handleTabsWheelCapture}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{ borderBottom: 1, borderColor: 'divider', width: '100%' }}
                    >
                        <Tab label="Performance" icon={<EmojiEvents />} iconPosition="start" />
                        <Tab label="Weekly Schedule" icon={<MenuBook />} iconPosition="start" />
                        <Tab label="Behavior Log" icon={<HistoryEdu />} iconPosition="start" />
                        <Tab label="AI Advisor" icon={<AutoAwesome />} iconPosition="start" />
                    </Tabs>

                    <Button
                        variant="outlined"
                        size="small"
                        fullWidth={false}
                        onClick={() => window.location.href = childId ? `/dashboard/learner/report?childId=${childId}` : '/dashboard/learner/report'}
                        sx={{ mt: { xs: 1, md: 0 } }}
                    >
                        View Term Report
                    </Button>
                </Box>
            </Box>

            {tabValue === 0 && (
                <>
                    {data.subjects.length > 0 && (
                        <Box mb={4} component={motion.div} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <AnalyticsChart
                                title="Subject Performance Overview"
                                data={chartData}
                                xKey="name"
                                yKey="score"
                                color="#1976d2" // Primary Blue
                            />
                        </Box>
                    )}

                    <Grid container spacing={3} component={motion.div} variants={container} initial="hidden" animate="show">
                        {data.subjects.map((subject) => (
                            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={subject.id} component={motion.div}>
                                <Card sx={{ height: '100%', transition: '0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } }}>
                                    <CardContent>
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                            <Typography variant="h6" fontWeight="bold">
                                                {subject.name}
                                            </Typography>
                                            {subject.average !== null && (
                                                <Box
                                                    sx={{
                                                        bgcolor: subject.average >= 50 ? 'success.light' : 'error.light',
                                                        color: 'white',
                                                        borderRadius: '50%',
                                                        width: 40,
                                                        height: 40,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    {subject.average}%
                                                </Box>
                                            )}
                                        </Box>

                                        <Divider sx={{ my: 2 }} />

                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                            Recent Results
                                        </Typography>

                                        {subject.assessments.slice(0, 3).map((assessment) => (
                                            <Box key={assessment.id} mb={1} display="flex" justifyContent="space-between">
                                                <Typography variant="body2">{assessment.title}</Typography>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {assessment.userScore !== null
                                                        ? `${assessment.userScore}/${assessment.totalMarks}`
                                                        : 'Pending'}
                                                </Typography>
                                            </Box>
                                        ))}
                                        {subject.assessments.length === 0 && (
                                            <Typography variant="body2" color="text.secondary">No assessments yet.</Typography>
                                        )}

                                        <Box mt={3}>
                                            <Button
                                                variant="outlined"
                                                fullWidth
                                                size="small"
                                                startIcon={<MenuBook />}
                                                onClick={() => handleOpenHub(subject)}
                                            >
                                                View Resources
                                            </Button>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </>
            )}

            {tabValue === 1 && (
                <Box component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Typography variant="h5" fontWeight="bold" gutterBottom>Weekly Schedule</Typography>
                    <TimetableView timetable={data.learner.timetable} />
                </Box>
            )}

            {tabValue === 2 && (
                <Box component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <BehaviorTracker learnerId={childId || (data.learner.id as string)} />
                </Box>
            )}

            {tabValue === 3 && (
                <Box component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <AIInsightsSection childId={childId || (data.learner.id as string)} />
                </Box>
            )}

            <Dialog
                open={hubOpen}
                onClose={() => setHubOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 'bold' }}>
                    {selectedSubject?.name} - Study Materials & Tasks
                </DialogTitle>
                <DialogContent dividers>
                    {selectedSubject && (
                        <SubjectHub subjectId={selectedSubject.id} role="LEARNER" />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setHubOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
