'use client';

import { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Box,
    Paper,
    Chip,
    CircularProgress,
    Stack,
    IconButton,
    Tooltip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination
} from '@mui/material';
import {
    History,
    FilterList,
    GetApp,
    Info,
    Refresh
} from '@mui/icons-material';
import { motion } from 'framer-motion';

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/audit-logs?limit=${rowsPerPage}&offset=${page * rowsPerPage}`);
            const data = await res.json();
            setLogs(data.logs);
            setTotal(data.total);
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, rowsPerPage]);

    const getActionColor = (action: string) => {
        if (action.includes('Delete') || action.includes('Remove')) return 'error';
        if (action.includes('Update') || action.includes('Modify') || action.includes('Branding')) return 'warning';
        if (action.includes('Create') || action.includes('Add')) return 'success';
        return 'primary';
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }} component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <History color="primary" fontSize="large" />
                        Enterprise Audit Logs
                    </Typography>
                    <Typography color="text.secondary">Monitor all sensitive actions and security events within your school.</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Tooltip title="Refresh">
                        <IconButton onClick={fetchLogs} size="large">
                            <Refresh />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Export CSV">
                        <IconButton size="large">
                            <GetApp />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>

            <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.05)' }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Timestamp</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>User</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Action</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Entity</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Details</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                                    <CircularProgress />
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log: any) => (
                                <TableRow key={log.id} hover>
                                    <TableCell>
                                        <Typography variant="body2">{new Date(log.createdAt).toLocaleString()}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight="bold">
                                                {log.user?.firstName} {log.user?.lastName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {log.user?.role}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={log.action}
                                            size="small"
                                            color={getActionColor(log.action) as any}
                                            variant="outlined"
                                            sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'action.selected', px: 1, borderRadius: 1 }}>
                                            {log.entity}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Tooltip title={JSON.stringify(log.details, null, 2)}>
                                            <IconButton size="small">
                                                <Info fontSize="small" color="action" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                        {!loading && logs.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                                    <Typography color="text.secondary">No audit logs found.</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[10, 25, 50]}
                    component="div"
                    count={total}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                />
            </TableContainer>
        </Container>
    );
}
