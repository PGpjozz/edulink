'use client';

import { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Box,
    Grid,
    Card,
    CardContent,
    Paper,
    Avatar,
    LinearProgress,
    Chip
} from '@mui/material';
import {
    EmojiEvents,
    Star,
    TrendingUp,
    Whatshot
} from '@mui/icons-material';
import { motion } from 'framer-motion';

export default function LearnerLeaderboard() {
    const [leaderboard, setLeaderboard] = useState([]);
    const [myRank, setMyRank] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await fetch('/api/learner/leaderboard');
                const data = await res.json();
                setLeaderboard(data.leaderboard);
                setMyRank(data.myRank);
            } catch (err) {
                console.error('Failed to fetch leaderboard:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <EmojiEvents sx={{ color: '#ffd700', fontSize: 40 }} />;
        if (rank === 2) return <EmojiEvents sx={{ color: '#c0c0c0', fontSize: 36 }} />;
        if (rank === 3) return <EmojiEvents sx={{ color: '#cd7f32', fontSize: 32 }} />;
        return <Star color="action" />;
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }} component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Box mb={4} textAlign="center">
                <Typography variant="h3" fontWeight="900" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    🏆 House Points Leaderboard
                </Typography>
                <Typography color="text.secondary" variant="h6">Compete for glory and earn badges!</Typography>
            </Box>

            {myRank && (
                <Card sx={{ mb: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderRadius: 4 }}>
                    <CardContent>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={6}>
                                <Box display="flex" alignItems="center" gap={2}>
                                    <Avatar sx={{ width: 60, height: 60, bgcolor: 'white', color: 'primary.main' }}>
                                        {myRank.name.charAt(0)}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="h6" fontWeight="bold">Your Rank: #{myRank.rank}</Typography>
                                        <Typography variant="body2" sx={{ opacity: 0.9 }}>{myRank.name}</Typography>
                                    </Box>
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Box textAlign={{ xs: 'left', md: 'right' }}>
                                    <Typography variant="h4" fontWeight="bold">{myRank.points} Points</Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={(myRank.points / (leaderboard[0]?.points || 1)) * 100}
                                        sx={{ mt: 1, height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.3)' }}
                                    />
                                </Box>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            )}

            <Paper sx={{ borderRadius: 4, overflow: 'hidden' }}>
                {leaderboard.map((student, index) => (
                    <Box
                        key={student.id}
                        sx={{
                            p: 3,
                            borderBottom: index < leaderboard.length - 1 ? '1px solid' : 'none',
                            borderColor: 'divider',
                            bgcolor: index < 3 ? 'action.hover' : 'transparent',
                            transition: 'all 0.3s',
                            '&:hover': { bgcolor: 'action.selected' }
                        }}
                        component={motion.div}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={2} md={1}>
                                <Box display="flex" justifyContent="center">
                                    {getRankIcon(index + 1)}
                                </Box>
                            </Grid>
                            <Grid item xs={1}>
                                <Typography variant="h5" fontWeight="bold" color="text.secondary">
                                    {index + 1}
                                </Typography>
                            </Grid>
                            <Grid item xs={5} md={6}>
                                <Box display="flex" alignItems="center" gap={2}>
                                    <Avatar sx={{ bgcolor: 'primary.main' }}>{student.name.charAt(0)}</Avatar>
                                    <Box>
                                        <Typography variant="h6" fontWeight="bold">{student.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Grade {student.grade}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>
                            <Grid item xs={4} md={3}>
                                <Box textAlign="right">
                                    <Chip
                                        icon={<Whatshot />}
                                        label={`${student.points} pts`}
                                        color="primary"
                                        sx={{ fontWeight: 'bold', fontSize: '1rem' }}
                                    />
                                </Box>
                            </Grid>
                        </Grid>
                    </Box>
                ))}
            </Paper>
        </Container>
    );
}
