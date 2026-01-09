'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    Button,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Divider,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert
} from '@mui/material';
import {
    Payment as PaymentIcon,
    History,
    CreditCard,
    CheckCircle
} from '@mui/icons-material';

export default function BillingPortal() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/parent/invoices');
            const data = await res.json();
            setInvoices(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const handlePay = async (invoiceId: string) => {
        setPaying(invoiceId);
        try {
            const res = await fetch('/api/parent/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invoiceId })
            });
            if (res.ok) {
                setShowSuccess(true);
                fetchInvoices();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setPaying(null);
        }
    };

    if (loading) return <CircularProgress />;

    const totalBalance = invoices
        .filter((inv: any) => inv.status !== 'PAID')
        .reduce((sum, inv: any) => sum + inv.amount, 0);

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" gutterBottom>Financial Overview</Typography>

            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: 'error.main', color: 'white' }}>
                        <CardContent>
                            <Typography variant="subtitle2">Outstanding Balance</Typography>
                            <Typography variant="h3" fontWeight="bold">R {totalBalance.toFixed(2)}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 2 }}>
                <TableContainer sx={{ maxHeight: 440 }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Student</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {invoices.map((inv: any) => (
                                <TableRow key={inv.id} hover>
                                    <TableCell>{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell>{inv.title}</TableCell>
                                    <TableCell>{inv.learner?.user?.firstName} {inv.learner?.user?.lastName}</TableCell>
                                    <TableCell>R {inv.amount.toFixed(2)}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={inv.status}
                                            color={inv.status === 'PAID' ? 'success' : 'warning'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            disabled={inv.status === 'PAID' || paying === inv.id}
                                            variant="contained"
                                            size="small"
                                            startIcon={<CreditCard />}
                                            onClick={() => handlePay(inv.id)}
                                        >
                                            {paying === inv.id ? 'Processing...' : 'Pay Now'}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {invoices.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                        No invoices found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Dialog open={showSuccess} onClose={() => setShowSuccess(false)}>
                <DialogTitle>Payment Successful</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" alignItems="center" py={2}>
                        <CheckCircle sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                        <Typography textAlign="center">
                            Your payment has been processed successfully. The school has been notified.
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowSuccess(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
