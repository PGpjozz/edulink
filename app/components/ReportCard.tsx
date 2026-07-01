'use client';

import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Divider,
    Button,
    Grid,
    Stack,
    useTheme,
    alpha,
} from '@mui/material';
import { Print, Verified, School, CalendarMonth } from '@mui/icons-material';

interface ReportCardProps {
    data: any;
}

export default function ReportCard({ data }: ReportCardProps) {
    const theme = useTheme();

    if (!data) return null;

    const scoreBg = (avg: number) =>
        avg >= 50 ? alpha(theme.palette.success.main, 0.12) : alpha(theme.palette.error.main, 0.12);
    const scoreColor = (avg: number) =>
        avg >= 50 ? theme.palette.success.dark : theme.palette.error.dark;

    return (
        <Paper
            id="report-card"
            sx={{
                p: { xs: 3, md: 8 },
                borderRadius: 4,
                boxShadow: theme.shadows[4],
                maxWidth: 1000,
                mx: 'auto',
                bgcolor: 'background.paper',
                position: 'relative',
                overflow: 'hidden',
                border: 1,
                borderColor: 'divider',
            }}
        >
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 300,
                    height: 300,
                    background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.06)} 0%, transparent 70%)`,
                    zIndex: 0,
                }}
            />

            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={6} sx={{ position: 'relative', zIndex: 1 }}>
                <Box>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <School color="primary" sx={{ fontSize: 32 }} />
                        <Typography variant="h6" fontWeight="800" letterSpacing={1} color="text.secondary">
                            EDULINK INTELLIGENCE
                        </Typography>
                    </Box>
                    <Typography variant="h3" fontWeight="900" color="text.primary" sx={{ mb: 1 }}>
                        Subject Report
                    </Typography>
                    <Typography variant="h5" color="primary" fontWeight="bold">
                        {data.learner.schoolName}
                    </Typography>
                </Box>
                <Box textAlign="right">
                    <Typography variant="h6" fontWeight="bold">{data.term ?? 'Current term'}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                        <CalendarMonth fontSize="small" /> Issued: {new Date().toLocaleDateString()}
                    </Typography>
                </Box>
            </Box>

            <Divider sx={{ mb: 6, opacity: 0.6 }} />

            <Grid container spacing={4} sx={{ mb: 8, position: 'relative', zIndex: 1 }}>
                <Grid size={{ xs: 12, md: 7 }}>
                    <Typography variant="overline" color="primary" sx={{ fontWeight: '900', letterSpacing: 2 }}>
                        LEARNER IDENTITY
                    </Typography>
                    <Typography variant="h4" fontWeight="800" sx={{ mt: 1 }}>
                        {data.learner.name}
                    </Typography>
                    <Typography variant="h6" color="text.secondary">
                        Grade {data.learner.grade} &bull; {data.learner.className}
                    </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                    <Box sx={{ bgcolor: 'action.hover', p: 3, borderRadius: 3, border: 1, borderColor: 'divider' }}>
                        <Stack spacing={1}>
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Attendance Rate</Typography>
                                <Typography variant="h6" fontWeight="bold">{data.stats.attendanceRate}%</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Academic Average</Typography>
                                <Typography variant="h6" fontWeight="bold" color="primary">
                                    {data.stats.overallAverage}%
                                </Typography>
                            </Box>
                        </Stack>
                    </Box>
                </Grid>
            </Grid>

            <TableContainer component={Box} sx={{ mb: 8, position: 'relative', zIndex: 1 }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: '900', color: 'text.secondary', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                                Subject Area
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: '900', color: 'text.secondary', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                                CAPS Level
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: '900', color: 'text.secondary', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                                Achievement (%)
                            </TableCell>
                            <TableCell sx={{ fontWeight: '900', color: 'text.secondary', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                                Teacher Observations
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.subjects.map((sub: any) => (
                            <TableRow key={sub.subjectName} sx={{ '&:last-child td': { border: 0 } }}>
                                <TableCell sx={{ fontWeight: '700', py: 3 }}>{sub.subjectName}</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700 }}>
                                    {sub.level != null ? `Level ${sub.level}` : '—'}
                                </TableCell>
                                <TableCell align="center">
                                    <Box
                                        sx={{
                                            display: 'inline-block',
                                            px: 2,
                                            py: 0.5,
                                            borderRadius: 2,
                                            bgcolor: scoreBg(sub.average),
                                            color: scoreColor(sub.average),
                                            fontWeight: '800',
                                        }}
                                    >
                                        {sub.average ? `${sub.average}%` : 'N/A'}
                                    </Box>
                                </TableCell>
                                <TableCell sx={{ fontStyle: 'italic', color: 'text.secondary', fontSize: '0.95rem' }}>
                                    &ldquo;{sub.comment || 'No comment provided.'}&rdquo;
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box mt={10} display="flex" justifyContent="space-between" sx={{ position: 'relative', zIndex: 1 }}>
                <Box borderTop={2} borderColor="divider" px={2} pt={2} width={220} textAlign="center">
                    <Typography variant="body2" fontWeight="bold">Class Teacher</Typography>
                </Box>

                <Box display="flex" flexDirection="column" alignItems="center" sx={{ opacity: 0.15 }}>
                    <Verified sx={{ fontSize: 80, color: 'primary.main' }} />
                    <Typography variant="caption" fontWeight="bold">OFFICIAL SEAL</Typography>
                </Box>

                <Box borderTop={2} borderColor="divider" px={2} pt={2} width={220} textAlign="center">
                    <Typography variant="body2" fontWeight="bold">Executive Principal</Typography>
                </Box>
            </Box>

            <Box mt={8} display="flex" justifyContent="center" className="no-print" sx={{ position: 'relative', zIndex: 2 }}>
                <Button
                    variant="contained"
                    size="large"
                    startIcon={<Print />}
                    onClick={() => window.print()}
                    sx={{ borderRadius: 3, px: 6, py: 1.5, fontWeight: 'bold' }}
                >
                    Generate PDF Report
                </Button>
            </Box>

            <style>{`
                @media print {
                    @page { size: A4; margin: 20mm; }
                    .no-print { display: none !important; }
                    body { background: white !important; -webkit-print-color-adjust: exact; }
                    body * { visibility: hidden; }
                    #report-card, #report-card * { visibility: visible; }
                    #report-card { 
                        position: absolute; 
                        left: 0; top: 0; 
                        width: 100%; 
                        box-shadow: none !important; 
                        border: none !important;
                        padding: 0 !important;
                    }
                }
            `}</style>
        </Paper>
    );
}
