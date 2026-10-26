'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    AppBar,
    Box,
    Button,
    Container,
    Grid,
    Paper,
    Stack,
    TextField,
    Toolbar,
    Typography,
    Alert,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { getTheme } from '@/app/theme/theme';
import {
    Assignment,
    EventAvailable,
    Groups,
    MenuBook,
    Campaign,
    School,
} from '@mui/icons-material';
import { BRAND } from '@/lib/branding';
import BrandLogo from '@/app/components/BrandLogo';

const NAV = [
    { label: 'Services', href: '#services' },
    { label: 'Schools', href: '#schools' },
    { label: 'How it works', href: '#start' },
    { label: 'Contact', href: '#contact' },
];

const SERVICES = [
    {
        icon: <EventAvailable />,
        title: 'Daily attendance',
        desc: 'Teachers mark the register in class. Parents get an alert when a learner is absent or late.',
    },
    {
        icon: <Assignment />,
        title: 'Homework',
        desc: 'Set work for a class, collect written answers, and send feedback without another app.',
    },
    {
        icon: <MenuBook />,
        title: 'Gradebook',
        desc: 'Assessments, marks, and term progress sit with the subject, and parents can see the results.',
    },
    {
        icon: <Campaign />,
        title: 'Announcements and messages',
        desc: 'Reach the whole school, a grade, or one family, and keep staff and parent messages in one place.',
    },
    {
        icon: <Groups />,
        title: 'People and classes',
        desc: 'Principals add staff, classes, and learners. Each learner sits in a class from the day they join.',
    },
    {
        icon: <School />,
        title: 'Your school’s look',
        desc: 'The portal carries your school name, logo, and colours once you are set up.',
    },
];

const AUDIENCES = [
    {
        title: 'Principals',
        desc: 'See classes, staff, and learners in one overview, and send news without chasing paper registers.',
    },
    {
        title: 'Teachers',
        desc: 'Open today’s register, set homework, and enter marks for the classes you teach.',
    },
    {
        title: 'Parents',
        desc: 'Sign in on a phone, see your child, their marks, homework, and school alerts.',
    },
];

// Public page stays on this palette. The signed-in school theme (including
// dark mode) would put light text on these light backgrounds.
const siteTheme = createTheme(getTheme('light', '#9a3412'), {
    palette: {
        primary: {
            main: '#9a3412',
            dark: '#7c2d12',
            light: '#c2410c',
            contrastText: '#ffffff',
        },
        text: {
            primary: '#0f172a',
            secondary: '#334155',
        },
    },
});

const STEPS = [
    {
        n: '01',
        title: 'We set the school up',
        desc: 'Classes, teachers, and the first group of learners are loaded with you. You do not start from a blank screen.',
    },
    {
        n: '02',
        title: 'Teachers use it every day',
        desc: 'One class marks attendance and homework for two weeks, so the staff can feel the routine.',
    },
    {
        n: '03',
        title: 'Parents join',
        desc: 'Each parent signs in and sees their own child. That is the moment the school knows it is working.',
    },
];

export default function Home() {
    const [name, setName] = useState('');
    const [school, setSchool] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [sentHint, setSentHint] = useState('');

    const submitContact = (event: React.FormEvent) => {
        event.preventDefault();
        const subject = `BrightCampus enquiry${school.trim() ? ` — ${school.trim()}` : ''}`;
        const body = [
            `Name: ${name.trim()}`,
            `School: ${school.trim() || 'Not given'}`,
            `Email: ${email.trim()}`,
            '',
            message.trim(),
        ].join('\n');
        const href = `mailto:${BRAND.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        setSentHint(`Your email app should open a message to ${BRAND.contactEmail}. If it does not, send the same note there directly.`);
        window.location.href = href;
    };

    return (
        <ThemeProvider theme={siteTheme}>
        <Box minHeight="100vh" bgcolor="background.default" color="text.primary">
            <AppBar
                position="sticky"
                elevation={0}
                sx={{
                    bgcolor: 'rgba(255,255,255,0.92)',
                    color: '#0f172a',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    backdropFilter: 'blur(10px)',
                }}
            >
                <Container maxWidth="lg">
                    <Toolbar disableGutters sx={{ gap: 1, minHeight: 72, flexWrap: 'wrap', py: 1 }}>
                        <Box component={Link} href="/" sx={{ display: 'flex', mr: 'auto' }}>
                            <BrandLogo height={44} />
                        </Box>
                        <Button component={Link} href="/auth/signin" variant="contained">
                            Sign in
                        </Button>
                        <Stack
                            direction="row"
                            spacing={0.5}
                            flexWrap="wrap"
                            useFlexGap
                            sx={{ width: { xs: '100%', md: 'auto' } }}
                        >
                            {NAV.map((item) => (
                                <Button key={item.href} component="a" href={item.href} color="inherit" size="small">
                                    {item.label}
                                </Button>
                            ))}
                        </Stack>
                    </Toolbar>
                </Container>
            </AppBar>

            <Box
                sx={{
                    background: 'linear-gradient(145deg, #fff7ed 0%, #ffffff 42%, #e8eef6 100%)',
                    py: { xs: 8, md: 12 },
                }}
            >
                <Container maxWidth="lg">
                    <Typography variant="overline" color="primary.dark" fontWeight={700} letterSpacing={1.2}>
                        School software for independent schools
                    </Typography>
                    <Typography variant="h2" sx={{ mt: 1, mb: 2, maxWidth: 760, fontSize: { xs: '2.4rem', md: '3.4rem' } }}>
                        {BRAND.tagline}
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 640, fontWeight: 400, mb: 4 }}>
                        Attendance, homework, marks, and parent updates in one place. BrightCampus is built for the school day, from the register in the morning to the alert a parent reads that afternoon.
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <Button component="a" href="#contact" variant="contained" size="large">
                            Talk to us
                        </Button>
                        <Button component="a" href="#services" variant="outlined" size="large">
                            See the services
                        </Button>
                    </Stack>
                </Container>
            </Box>

            <Box id="services" sx={{ py: { xs: 7, md: 10 }, scrollMarginTop: 80 }}>
                <Container maxWidth="lg">
                    <Typography variant="h3" gutterBottom>Services</Typography>
                    <Typography color="text.secondary" sx={{ maxWidth: 640, mb: 4 }}>
                        Everything a school uses between the first bell and the parent at home.
                    </Typography>
                    <Grid container spacing={2.5}>
                        {SERVICES.map((item) => (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.title}>
                                <Paper sx={{ p: 3, height: '100%', borderRadius: 3 }}>
                                    <Box color="primary.main" mb={1.5}>{item.icon}</Box>
                                    <Typography variant="h6" fontWeight={700} gutterBottom>{item.title}</Typography>
                                    <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            <Box
                id="schools"
                sx={{
                    py: { xs: 7, md: 10 },
                    bgcolor: '#0f2744',
                    color: '#f8fafc',
                    scrollMarginTop: 80,
                    '& .MuiTypography-root': { color: 'inherit' },
                }}
            >
                <Container maxWidth="lg">
                    <Typography variant="h3" gutterBottom>Built for the people in the school</Typography>
                    <Typography sx={{ opacity: 0.92, maxWidth: 640, mb: 4 }}>
                        {BRAND.mission}
                    </Typography>
                    <Grid container spacing={2.5}>
                        {AUDIENCES.map((item) => (
                            <Grid size={{ xs: 12, md: 4 }} key={item.title}>
                                <Paper sx={{ p: 3, height: '100%', borderRadius: 3, bgcolor: 'rgba(255,255,255,0.08)', color: 'inherit', border: '1px solid rgba(255,255,255,0.12)' }}>
                                    <Typography variant="h6" fontWeight={700} gutterBottom>{item.title}</Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.92 }}>{item.desc}</Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            <Box id="start" sx={{ py: { xs: 7, md: 10 }, scrollMarginTop: 80 }}>
                <Container maxWidth="lg">
                    <Typography variant="h3" gutterBottom>How a school starts</Typography>
                    <Typography color="text.secondary" sx={{ maxWidth: 640, mb: 4 }}>
                        A first school begins with one grade, not the whole campus on day one.
                    </Typography>
                    <Grid container spacing={2.5}>
                        {STEPS.map((step) => (
                            <Grid size={{ xs: 12, md: 4 }} key={step.n}>
                                <Paper variant="outlined" sx={{ p: 3, height: '100%', borderRadius: 3 }}>
                                    <Typography variant="h4" color="primary.dark" gutterBottom>{step.n}</Typography>
                                    <Typography variant="h6" fontWeight={700} gutterBottom>{step.title}</Typography>
                                    <Typography variant="body2" color="text.secondary">{step.desc}</Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            <Box id="contact" sx={{ py: { xs: 7, md: 10 }, bgcolor: 'grey.50', scrollMarginTop: 80 }}>
                <Container maxWidth="lg">
                    <Grid container spacing={4}>
                        <Grid size={{ xs: 12, md: 5 }}>
                            <Typography variant="h3" gutterBottom>Contact</Typography>
                            <Typography color="text.secondary" sx={{ mb: 3 }}>
                                Tell us about your school. We reply by email and can walk a principal through a live class.
                            </Typography>
                            <Typography fontWeight={700}>Email</Typography>
                            <Typography
                                component="a"
                                href={`mailto:${BRAND.contactEmail}`}
                                color="primary.dark"
                                sx={{ display: 'inline-block', mb: 2 }}
                            >
                                {BRAND.contactEmail}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {BRAND.vision}
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, md: 7 }}>
                            <Paper sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 3 }}>
                                <Box component="form" onSubmit={submitContact}>
                                    <Stack spacing={2}>
                                        {sentHint && <Alert severity="success">{sentHint}</Alert>}
                                        <TextField label="Your name" required value={name} onChange={(e) => setName(e.target.value)} fullWidth />
                                        <TextField label="School" value={school} onChange={(e) => setSchool(e.target.value)} fullWidth />
                                        <TextField label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
                                        <TextField
                                            label="How can we help?"
                                            required
                                            multiline
                                            minRows={4}
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            fullWidth
                                        />
                                        <Button type="submit" variant="contained" size="large">
                                            Send message
                                        </Button>
                                    </Stack>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            <Box component="footer" sx={{ py: 4, borderTop: '1px solid', borderColor: 'divider' }}>
                <Container maxWidth="lg">
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        alignItems={{ sm: 'center' }}
                        justifyContent="space-between"
                    >
                        <BrandLogo height={36} />
                        <Stack direction="row" spacing={2} flexWrap="wrap">
                            {NAV.map((item) => (
                                <Button key={item.href} component="a" href={item.href} color="inherit" size="small">
                                    {item.label}
                                </Button>
                            ))}
                            <Button component={Link} href="/privacy" color="inherit" size="small">Privacy</Button>
                            <Button component={Link} href="/auth/signin" color="inherit" size="small">Sign in</Button>
                            <Button component={Link} href="/auth/provider-signin" color="inherit" size="small">Provider</Button>
                        </Stack>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
                        © {new Date().getFullYear()} {BRAND.name}. {BRAND.tagline}
                    </Typography>
                </Container>
            </Box>
        </Box>
        </ThemeProvider>
    );
}
