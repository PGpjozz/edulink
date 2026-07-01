'use client';

import Link from 'next/link';
import { Box, Button, Container, Typography, Grid, Paper } from '@mui/material';
import { School, Groups, Assignment, Message } from '@mui/icons-material';
import { BRAND } from '@/lib/branding';
import BrandLogo from '@/app/components/BrandLogo';

export default function Home() {
    return (
        <Box minHeight="100vh" bgcolor="background.default">
            <Box
                sx={{
                    background: 'linear-gradient(145deg, #f59e0b 0%, #d97706 35%, #1e3a5f 100%)',
                    color: 'white',
                    py: { xs: 8, md: 12 },
                    px: 2,
                }}
            >
                <Container maxWidth="lg">
                    <Box mb={3}>
                        <BrandLogo variant="full" height={72} onDark />
                    </Box>
                    <Typography variant="h2" fontWeight="bold" sx={{ mt: 1, mb: 1, maxWidth: 720 }}>
                        {BRAND.tagline}
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.92, mb: 3, maxWidth: 640, fontWeight: 400, lineHeight: 1.6 }}>
                        {BRAND.mission}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.85, mb: 4, maxWidth: 600, fontStyle: 'italic' }}>
                        {BRAND.vision}
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
