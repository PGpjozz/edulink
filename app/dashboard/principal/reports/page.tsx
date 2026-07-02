'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Box, Container, Typography, Grid, Button, Paper, Alert, CircularProgress,
    Stack, TextField, MenuItem, Chip, Divider,
} from '@mui/material';
import { Autorenew, Download, Assessment as AssessmentIcon, Visibility } from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useRouter } from 'next/navigation';

type ClassItem = { id: string; name: string; grade: string };
type ReportRow = {
    id: string;
    learnerName: string;
    term: number;
    year: number;
    termLabel: string;
    grade: string;
    className: string;
    status: 'DRAFT' | 'PUBLISHED';
    overallAverage: number | null;
    attendanceRate: number | null;
    subjectCount: number;
    publishedAt: string | null;
};

const now = new Date();
const CURRENT_TERM = now.getMonth() <= 2 ? 1 : now.getMonth() <= 5 ? 2 : now.getMonth() <= 8 ? 3 : 4;

export default function PrincipalReports() {
    const router = useRouter();
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [term, setTerm] = useState(CURRENT_TERM);
    const [year, setYear] = useState(now.getFullYear());
    const [classId, setClassId] = useState('');
    const [reports, setReports] = useState<ReportRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [message, setMessage] = useState('');

    const fetchReports = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/school/reports?term=${term}&year=${year}`);
            const data = await res.json();
            setReports(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    }, [term, year]);

    useEffect(() => {
        fetch('/api/classes').then((r) => r.json()).then((d) => setClasses(Array.isArray(d) ? d : [])).catch(() => {});
    }, []);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const handleGenerate = async () => {
        setGenerating(true);
        setMessage('');
        try {
            const res = await fetch('/api/school/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ term, year, classId: classId || undefined }),
            });
            const result = await res.json();
            if (res.ok) {
                setMessage(`Generated: ${result.created} created, ${result.updated} updated, ${result.skipped} already published.`);
                fetchReports();
            } else {
                setMessage(result.error || 'Generation failed');
            }
        } finally {
            setGenerating(false);
        }
    };

    const columns: GridColDef[] = [
        { field: 'learnerName', headerName: 'Learner', flex: 1.4, minWidth: 160 },
        { field: 'className', headerName: 'Class', flex: 0.8, minWidth: 90 },
        {
            field: 'overallAverage', headerName: 'Average', width: 100,
            renderCell: (p) => (p.value != null ? `${p.value}%` : '—'),
        },
        {
            field: 'attendanceRate', headerName: 'Attendance', width: 110,
            renderCell: (p) => (p.value != null ? `${p.value}%` : '—'),
        },
        { field: 'subjectCount', headerName: 'Subjects', width: 90 },
        {
            field: 'status', headerName: 'Status', width: 120,
            renderCell: (p) => (
                <Chip size="small" label={p.value === 'PUBLISHED' ? 'Published' : 'Draft'}
                    color={p.value === 'PUBLISHED' ? 'success' : 'default'} variant="outlined" />
            ),
        },
        {
            field: 'actions', headerName: '', width: 120, sortable: false, filterable: false,
            renderCell: (p) => (
                <Button size="small" startIcon={<Visibility fontSize="small" />}
                    onClick={() => router.push(`/dashboard/principal/reports/${p.row.id}`)}>
                    Review
                </Button>
            ),
        },
    ];

    const exportUrl = `/api/school/reports/export?term=${term}&year=${year}`;

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">Report Cards</Typography>
                    <Typography color="text.secondary">Generate, review, and publish term academic reports.</Typography>
                </Box>
                <Button variant="outlined" startIcon={<Download />} component="a" href={exportUrl}>
                    Export CSV
                </Button>
            </Box>

            <Paper sx={{ p: 3, my: 3, borderRadius: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>Generate reports</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Snapshots each learner&apos;s weighted results for the selected term. Published reports are never overwritten.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                    <TextField select label="Term" value={term} onChange={(e) => setTerm(Number(e.target.value))} sx={{ minWidth: 120 }}>
                        {[1, 2, 3, 4].map((t) => <MenuItem key={t} value={t}>Term {t}</MenuItem>)}
                    </TextField>
                    <TextField label="Year" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} sx={{ maxWidth: 120 }} />
                    <TextField select label="Class (optional)" value={classId} onChange={(e) => setClassId(e.target.value)} sx={{ minWidth: 200 }}>
                        <MenuItem value="">All classes</MenuItem>
                        {classes.map((c) => <MenuItem key={c.id} value={c.id}>{c.name} (Grade {c.grade})</MenuItem>)}
                    </TextField>
                    <Button variant="contained" startIcon={<Autorenew />} disabled={generating} onClick={handleGenerate}>
                        {generating ? 'Generating…' : 'Generate'}
                    </Button>
                </Stack>
                {message && <Alert severity="info" sx={{ mt: 2 }}>{message}</Alert>}
            </Paper>

            <Divider sx={{ mb: 2 }} />

            <Paper sx={{ p: 2, borderRadius: 3 }}>
                {loading ? (
                    <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
                ) : reports.length === 0 ? (
                    <Box textAlign="center" py={8} color="text.secondary">
                        <AssessmentIcon sx={{ fontSize: 56, opacity: 0.2, mb: 1 }} />
                        <Typography>No reports for Term {term}, {year} yet. Generate them above.</Typography>
                    </Box>
                ) : (
                    <div style={{ width: '100%' }}>
                        <DataGrid
                            autoHeight
                            rows={reports}
                            columns={columns}
                            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                            pageSizeOptions={[25, 50, 100]}
                            disableRowSelectionOnClick
                        />
                    </div>
                )}
            </Paper>
        </Container>
    );
}
