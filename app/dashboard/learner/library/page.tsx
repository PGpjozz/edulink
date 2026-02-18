'use client';

import { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Box,
    Grid,
    Card,
    CardContent,
    CardActions,
    Button,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Chip,
    CircularProgress,
    Tab,
    Tabs,
    Paper,
    List,
    ListItem,
    ListItemText,
    Avatar,
    Divider
} from '@mui/material';
import { LibraryBooks, SportsBasketball, LaptopMac, History, CheckCircle, Pending } from '@mui/icons-material';
import { format } from 'date-fns';

export default function LibraryPage() {
    const [assets, setAssets] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState(0);

    // Booking Dialog State
    const [open, setOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<any>(null);
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchAssets();
        fetchBookings();
    }, []);

    const fetchAssets = () => {
        fetch('/api/school/assets?bookableOnly=true')
            .then(res => res.json())
            .then(setAssets)
            .finally(() => setLoading(false));
    };

    const fetchBookings = () => {
        fetch('/api/school/assets/bookings?myBookings=true')
            .then(res => res.json())
            .then(setBookings);
    };

    const handleBook = async () => {
        setSubmitting(true);
        try {
            const res = await fetch('/api/school/assets/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assetId: selectedAsset.id,
                    startDate,
                    endDate
                })
            });
            if (res.ok) {
                setOpen(false);
                fetchBookings();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category.toUpperCase()) {
            case 'BOOKS': return <LibraryBooks />;
            case 'ELECTRONICS': return <LaptopMac />;
            case 'SPORT': return <SportsBasketball />;
            default: return <LibraryBooks />;
        }
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 4 }}>
            <Box mb={4}>
                <Typography variant="h4" fontWeight="bold">Digital Library & Assets</Typography>
                <Typography color="text.secondary">Borrow books, equipment, and resources from your school.</Typography>
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                    <Tab label="Browse Resources" />
                    <Tab label="My Bookings" />
                </Tabs>
            </Box>

            {loading ? (
                <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
            ) : tab === 0 ? (
                <Grid container spacing={3}>
                    {assets.map((asset) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={asset.id}>
                            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                                        <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                                            {getCategoryIcon(asset.category)}
                                        </Avatar>
                                        <Chip label={asset.category} size="small" variant="outlined" />
                                    </Box>
                                    <Typography variant="h6" fontWeight="bold">{asset.name}</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        ID: {asset.identifier || 'N/A'}
                                    </Typography>
                                </CardContent>
                                <CardActions>
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        onClick={() => {
                                            setSelectedAsset(asset);
                                            setOpen(true);
                                        }}
                                    >
                                        Request Booking
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <Paper sx={{ borderRadius: 2 }}>
                    <List>
                        {bookings.map((booking, index) => (
                            <Box key={booking.id}>
                                <ListItem>
                                    <ListItemText
                                        primary={booking.asset.name}
                                        secondary={`Period: ${format(new Date(booking.startDate), 'MMM dd')} - ${format(new Date(booking.endDate), 'MMM dd, yyyy')}`}
                                    />
                                    <Chip
                                        label={booking.status}
                                        color={booking.status === 'APPROVED' ? 'success' : booking.status === 'PENDING' ? 'warning' : 'error'}
                                        size="small"
                                        icon={booking.status === 'APPROVED' ? <CheckCircle /> : <Pending />}
                                    />
                                </ListItem>
                                {index < bookings.length - 1 && <Divider />}
                            </Box>
                        ))}
                        {bookings.length === 0 && (
                            <Box p={4} textAlign="center">
                                <History sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                                <Typography color="text.secondary">No booking history found.</Typography>
                            </Box>
                        )}
                    </List>
                </Paper>
            )}

            {/* Booking Dialog */}
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>Book Resource</DialogTitle>
                <DialogContent>
                    <Box mt={1} display="flex" flexDirection="column" gap={3}>
                        <Typography variant="body2" color="text.secondary">
                            You are requesting to borrow: <strong>{selectedAsset?.name}</strong>
                        </Typography>
                        <TextField
                            label="Start Date"
                            type="date"
                            fullWidth
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            label="End Date"
                            type="date"
                            fullWidth
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleBook}
                        disabled={submitting}
                    >
                        {submitting ? 'Processing...' : 'Confirm Request'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
