'use client';

import Link from 'next/link';
import { Box, Button, Container, Typography, Grid, Paper } from '@mui/material';
import { School, Groups, Assignment, Message } from '@mui/icons-material';

export default function Home() {
    return (
        <Box minHeight="100vh" bgcolor="background.default">
            <Box
                sx={{
                    background: 'linear-gradient(145deg, #4338ca 0%, #312e81 100%)',
                    color: 'white',
                    py: { xs: 8, md: 12 },
                    px: 2,
                }}
            >
                <Container maxWidth="lg">
                    <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 2 }}>
                        SCHOOL MANAGEMENT PLATFORM
                    </Typography>
                    <Typography variant="h2" fontWeight="bold" sx={{ mt: 1, mb: 2, maxWidth: 640 }}>
                        EduLink — your school, connected
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9, mb: 4, maxWidth: 520, fontWeight: 400 }}>
                        Attendance, grades, messages, billing, and announcements — all in one calm, easy-to-use portal.
                    </Typography>
                    <Box display="flex" gap={2} flexWrap="wrap">
                        <Button component={Link} href="/auth/signin" variant="contained" size="large" sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'grey.100' } }}>
                            Sign in
                        </Button>
                        <Button component={Link} href="/auth/provider-signin" variant="outlined" size="large" sx={{ borderColor: 'white', color: 'white' }}>
                            Provider portal
                        </Button>
                    </Box>
                </Container>
            </Box>

            <Container maxWidth="lg" sx={{ py: 8 }}>
                <Grid container spacing={3}>
                    {[
                        { icon: <Groups />, title: 'Parents stay informed', desc: 'Real-time alerts for attendance, behavior, and school news.' },
                        { icon: <Assignment />, title: 'Teachers save time', desc: 'Gradebook, homework, and class tools in one dashboard.' },
                        { icon: <Message />, title: 'Direct communication', desc: 'Message parents and staff without leaving the platform.' },
                        { icon: <School />, title: 'School branding', desc: 'Your logo and colors across the entire experience.' },
                    ].map((item) => (
                        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={item.title}>
                            <Paper sx={{ p: 3, height: '100%', borderRadius: 3 }}>
                                <Box color="primary.main" mb={1.5}>{item.icon}</Box>
                                <Typography variant="h6" fontWeight="bold" gutterBottom>{item.title}</Typography>
                                <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </Box>
    );
}
