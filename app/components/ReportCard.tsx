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
    Stack
} from '@mui/material';
import { Print, Verified, School, CalendarMonth } from '@mui/icons-material';

type ReportSubject = {
    subjectName: string;
    subjectCode?: string;
    average: number | null;
    comment?: string;
};

type ReportCardData = {
    learner: {
        name: string;
        grade: string;
        className: string;
        schoolName: string;
    };
    term?: string;
    issuedAt?: string;
    subjects: ReportSubject[];
    stats: {
        attendanceRate: number | null;
        overallAverage: number;
    };
};

interface ReportCardProps {
    data: ReportCardData;
}

const REPORT_TEXT = '#0f172a';
const REPORT_MUTED = '#475569';
const REPORT_LABEL = '#64748b';

function formatIssueDate(value?: string) {
    if (!value) return new Date().toLocaleDateString('en-ZA');
    return new Date(value).toLocaleDateString('en-ZA', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function achievementStyle(average: number | null) {
    if (average === null) {
        return { bgcolor: 'rgba(100, 116, 139, 0.12)', color: REPORT_MUTED };
    }
    if (average >= 50) {
        return { bgcolor: 'rgba(34, 197, 94, 0.12)', color: '#15803d' };
    }
    return { bgcolor: 'rgba(239, 68, 68, 0.12)', color: '#b91c1c' };
}

export default function ReportCard({ data }: ReportCardProps) {
    if (!data) return null;

    const termLabel = data.term ?? 'Current Term';

    return (
        <Paper
            id="report-card"
            sx={{
                p: { xs: 3, md: 8 },
                borderRadius: 4,
                boxShadow: '0 12px 48px rgba(0,0,0,0.1)',
                maxWidth: 1000,
                mx: 'auto',
                bgcolor: '#ffffff',
                color: REPORT_TEXT,
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid rgba(0,0,0,0.05)',
                '& .MuiTypography-root': { color: 'inherit' },
            }}
        >
            <Box sx={{ position: 'absolute', top: 0, right: 0, width: 300, height: 300, background: 'radial-gradient(circle, rgba(37, 99, 235, 0.03) 0%, transparent 70%)', zIndex: 0 }} />

            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={6} sx={{ position: 'relative', zIndex: 1 }}>
                <Box>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <School sx={{ fontSize: 32, color: '#2563eb' }} />
                        <Typography variant="h6" fontWeight="800" letterSpacing={1} sx={{ color: REPORT_LABEL }}>
                            EDULINK INTELLIGENCE
                        </Typography>
                    </Box>
                    <Typography variant="h3" fontWeight="900" sx={{ color: REPORT_TEXT, mb: 1 }}>
                        Academic Report
                    </Typography>
                    <Typography variant="h5" sx={{ color: '#2563eb', fontWeight: 'bold' }}>
                        {data.learner.schoolName}
                    </Typography>
                </Box>
                <Box textAlign="right">
                    <Typography variant="h6" fontWeight="bold" sx={{ color: REPORT_TEXT }}>
                        {termLabel}
                    </Typography>
                    <Typography variant="body2" sx={{ color: REPORT_MUTED, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                        <CalendarMonth fontSize="small" /> Issued: {formatIssueDate(data.issuedAt)}
                    </Typography>
                </Box>
            </Box>

            <Divider sx={{ mb: 6, opacity: 0.6 }} />

            <Grid container spacing={4} sx={{ mb: 8, position: 'relative', zIndex: 1 }}>
                <Grid size={{ xs: 12, md: 7 }}>
                    <Typography variant="overline" sx={{ color: '#2563eb', fontWeight: '900', letterSpacing: 2 }}>
                        LEARNER IDENTITY
                    </Typography>
                    <Typography variant="h4" fontWeight="800" sx={{ mt: 1, color: REPORT_TEXT }}>
                        {data.learner.name}
                    </Typography>
                    <Typography variant="h6" sx={{ color: REPORT_MUTED }}>
                        Grade {data.learner.grade} • {data.learner.className}
                    </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                    <Box sx={{ bgcolor: '#f8fafc', p: 3, borderRadius: 3, border: '1px solid #e2e8f0' }}>
                        <Stack spacing={1}>
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" sx={{ color: REPORT_MUTED }}>Attendance Rate</Typography>
                                <Typography variant="h6" fontWeight="bold" sx={{ color: REPORT_TEXT }}>
                                    {data.stats.attendanceRate !== null ? `${data.stats.attendanceRate}%` : 'N/A'}
                                </Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" sx={{ color: REPORT_MUTED }}>Academic Average</Typography>
                                <Typography variant="h6" fontWeight="bold" sx={{ color: '#2563eb' }}>
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
                            <TableCell sx={{ fontWeight: '900', color: REPORT_LABEL, fontSize: '0.8rem', textTransform: 'uppercase' }}>Subject Area</TableCell>
                            <TableCell align="center" sx={{ fontWeight: '900', color: REPORT_LABEL, fontSize: '0.8rem', textTransform: 'uppercase' }}>Achievement (%)</TableCell>
                            <TableCell sx={{ fontWeight: '900', color: REPORT_LABEL, fontSize: '0.8rem', textTransform: 'uppercase' }}>Teacher Observations</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.subjects.map((sub) => (
                            <TableRow key={`${sub.subjectName}-${sub.subjectCode}`} sx={{ '&:last-child td': { border: 0 } }}>
                                <TableCell sx={{ fontWeight: '700', py: 3, color: REPORT_TEXT }}>
                                    {sub.subjectName}
                                    {sub.subjectCode ? (
                                        <Typography variant="caption" display="block" sx={{ color: REPORT_MUTED }}>
                                            {sub.subjectCode}
                                        </Typography>
                                    ) : null}
                                </TableCell>
                                <TableCell align="center">
                                    <Box
                                        sx={{
                                            display: 'inline-block',
                                            px: 2,
                                            py: 0.5,
                                            borderRadius: 2,
                                            fontWeight: '800',
                                            ...achievementStyle(sub.average),
                                        }}
                                    >
                                        {sub.average !== null ? `${sub.average}%` : 'N/A'}
                                    </Box>
                                </TableCell>
                                <TableCell sx={{ fontStyle: 'italic', color: REPORT_MUTED, fontSize: '0.95rem', maxWidth: 360 }}>
                                    {sub.comment || 'No comment provided.'}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box mt={10} display="flex" justifyContent="space-between" sx={{ position: 'relative', zIndex: 1 }}>
                <Box borderTop={2} borderColor="#e2e8f0" px={2} pt={2} width={220} textAlign="center">
                    <Typography variant="body2" fontWeight="bold" sx={{ color: REPORT_TEXT }}>Class Teacher</Typography>
                </Box>

                <Box display="flex" flexDirection="column" alignItems="center" sx={{ opacity: 0.15 }}>
                    <Verified sx={{ fontSize: 80, color: '#2563eb' }} />
                    <Typography variant="caption" fontWeight="bold" sx={{ color: REPORT_TEXT }}>OFFICIAL SEAL</Typography>
                </Box>

                <Box borderTop={2} borderColor="#e2e8f0" px={2} pt={2} width={220} textAlign="center">
                    <Typography variant="body2" fontWeight="bold" sx={{ color: REPORT_TEXT }}>Executive Principal</Typography>
                </Box>
            </Box>

            <Box mt={8} display="flex" justifyContent="center" className="no-print" sx={{ position: 'relative', zIndex: 2 }}>
                <Button
                    variant="contained"
                    size="large"
                    startIcon={<Print />}
                    onClick={() => window.print()}
                    sx={{ borderRadius: 3, px: 6, py: 1.5, fontWeight: 'bold', boxShadow: '0 10px 20px rgba(37, 99, 235, 0.2)' }}
                >
                    Print / Save as PDF
                </Button>
            </Box>

            <style>{`
                @media print {
                    @page { size: A4; margin: 20mm; }
                    .no-print { display: none !important; }
                    body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    body * { visibility: hidden; }
                    #report-card, #report-card * { visibility: visible; }
                    #report-card {
                        position: absolute;
                        left: 0; top: 0;
                        width: 100%;
                        box-shadow: none !important;
                        border: none !important;
                        padding: 0 !important;
                        color: #0f172a !important;
                    }
                }
            `}</style>
        </Paper>
    );
}
