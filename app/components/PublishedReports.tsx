'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Paper, Stack, Chip, Button, CircularProgress, Grid,
} from '@mui/material';
import { Assessment, ArrowBack, Print } from '@mui/icons-material';
import ReportCard from '@/app/components/ReportCard';

type ReportSummary = {
    id: string;
    term: number;
    year: number;
    termLabel: string;
    grade: string;
    className: string;
    overallAverage: number | null;
    attendanceRate: number | null;
    publishedAt: string | null;
};

export default function PublishedReports({ childId }: { childId?: string | null }) {
    const [reports, setReports] = useState<ReportSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<{ id: string; data: unknown } | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const query = childId ? `?childId=${childId}` : '';

    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/learner/reports${query}`);
            const data = await res.json();
            setReports(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    }, [query]);

    useEffect(() => {
        setSelected(null);
        fetchList();
    }, [fetchList]);

    const openReport = async (id: string) => {
        setDetailLoading(true);
        try {
            const sep = childId ? `?childId=${childId}` : '';
            const res = await fetch(`/api/learner/reports/${id}${sep}`);
            if (res.ok) setSelected({ id, data: await res.json() });
        } finally {
            setDetailLoading(false);
        }
    };

    if (loading) {
        return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;
    }

    if (selected) {
        return (
            <Box>
                <Stack direction="row" spacing={2} className="no-print" sx={{ mb: 3 }}>
                    <Button startIcon={<ArrowBack />} onClick={() => setSelected(null)}>Back to reports</Button>
                    <Button
                        startIcon={<Print />}
                        variant="outlined"
                        component="a"
                        href={`/api/school/reports/${selected.id}/print`}
                        target="_blank"
                    >
                        Print version
                    </Button>
                </Stack>
                {detailLoading ? (
                    <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
                ) : (
                    <ReportCard data={selected.data} />
                )}
            </Box>
        );
    }

    if (reports.length === 0) {
        return (
            <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, bgcolor: 'action.hover' }}>
                <Assessment sx={{ fontSize: 56, color: 'text.disabled', opacity: 0.3, mb: 1 }} />
                <Typography color="text.secondary">No published report cards yet.</Typography>
                <Typography variant="body2" color="text.secondary">Reports appear here once the school publishes them.</Typography>
            </Paper>
        );
    }

    return (
        <Grid container spacing={2}>
            {reports.map((r) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={r.id}>
                    <Paper sx={{ p: 3, borderRadius: 3, border: 1, borderColor: 'divider', height: '100%' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="h6" fontWeight="bold">{r.termLabel}</Typography>
                            <Chip size="small" color="success" variant="outlined" label="Published" />
                        </Box>
                        <Typography variant="body2" color="text.secondary">Grade {r.grade} · {r.className}</Typography>
                        <Stack direction="row" spacing={2} sx={{ my: 2 }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Average</Typography>
                                <Typography variant="h6" fontWeight="bold">{r.overallAverage != null ? `${r.overallAverage}%` : '—'}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Attendance</Typography>
                                <Typography variant="h6" fontWeight="bold">{r.attendanceRate != null ? `${r.attendanceRate}%` : '—'}</Typography>
                            </Box>
                        </Stack>
                        <Button fullWidth variant="contained" onClick={() => openReport(r.id)}>View report</Button>
                    </Paper>
                </Grid>
            ))}
        </Grid>
    );
}
