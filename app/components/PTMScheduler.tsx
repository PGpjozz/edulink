'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Button,
    Card,
    CardContent,
    Divider,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    List,
    ListItem,
    ListItemText,
    ListItemIcon
} from '@mui/material';
import {
    Event,
    Schedule,
    Person,
    CheckCircle,
    RadioButtonUnchecked,
    Block
} from '@mui/icons-material';

interface PTMSchedulerProps {
    role: string;
}

export default function PTMScheduler({ role }: PTMSchedulerProps) {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [bookingSession, setBookingSession] = useState<any>(null);
    const [selectedSlot, setSelectedSlot] = useState<any>(null);
    const [isBooking, setIsBooking] = useState(false);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/school/ptm');
            const data = await res.json();
            setSessions(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    const generateSlots = (session: any) => {
        const slots: any[] = [];
        let current = new Date(session.startTime);
        const end = new Date(session.endTime);
        const duration = session.slotDuration * 60000;

        while (current < end) {
            const slotEnd = new Date(current.getTime() + duration);
            const isBooked = session.bookings.some((b: any) =>
                new Date(b.startTime).getTime() === current.getTime()
            );
            slots.push({
                start: new Date(current),
                end: slotEnd,
                isBooked
            });
            current = slotEnd;
        }
        return slots;
    };

    const handleBook = async () => {
        if (!bookingSession || !selectedSlot) return;
        setIsBooking(true);
        try {
            // In a real app, we'd select which child the meeting is for.
            // For MVP, we'll assume the parent is booking for their student.
            const res = await fetch('/api/school/ptm', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: bookingSession.id,
                    startTime: selectedSlot.start,
                    endTime: selectedSlot.end,
                    learnerId: '' // We should pass a real learner ID
                })
            });
            if (res.ok) {
                setBookingSession(null);
                setSelectedSlot(null);
                fetchSessions();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsBooking(false);
        }
    };

    if (loading) return <CircularProgress />;

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" gutterBottom>Parent-Teacher Meetings</Typography>
            <Typography color="text.secondary" mb={4}>Book your 1:1 meeting slots with subject teachers.</Typography>

            <Grid container spacing={3}>
                {sessions.map((session: any) => (
                    <Grid size={{ xs: 12, md: 6 }} key={session.id}>
                        <Card sx={{ height: '100%', borderRadius: 3 }}>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                                    <Box>
                                        <Typography variant="h6" fontWeight="bold">
                                            {session.teacher.firstName} {session.teacher.lastName}
                                        </Typography>
                                        <Typography color="text.secondary">
                                            {new Date(session.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                        </Typography>
                                    </Box>
                                    <Chip
                                        icon={<Event />}
                                        label={`${session.slotDuration} min slots`}
                                        size="small"
                                        variant="outlined"
                                        sx={{ flexShrink: 0 }}
                                    />
                                </Box>
                                <Divider sx={{ my: 2 }} />
                                <Box display="flex" alignItems="center" gap={1} color="text.secondary" mb={2}>
                                    <Schedule fontSize="small" />
                                    <Typography variant="body2">
                                        {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                        {new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Typography>
                                </Box>

                                {role === 'PARENT' && (
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        onClick={() => setBookingSession(session)}
                                    >
                                        View Available Slots
                                    </Button>
                                )}

                                {role === 'TEACHER' && (
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Bookings ({session.bookings.length})</Typography>
                                        <List sx={{ p: 0 }}>
                                            {session.bookings.map((booking: any) => (
                                                <ListItem key={booking.id} divider sx={{ px: 0 }}>
                                                    <ListItemText
                                                        primary={`${booking.parent.firstName} ${booking.parent.lastName}`}
                                                        secondary={`${new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Booking Dialog */}
            <Dialog open={!!bookingSession} onClose={() => setBookingSession(null)} fullWidth maxWidth="sm">
                <DialogTitle>Select a Meeting Slot</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={1}>
                        {bookingSession && generateSlots(bookingSession).map((slot: any, index: number) => (
                            <Grid size={{ xs: 4 }} key={index}>
                                <Button
                                    fullWidth
                                    variant={selectedSlot?.start?.getTime() === slot.start.getTime() ? "contained" : "outlined"}
                                    disabled={slot.isBooked}
                                    onClick={() => setSelectedSlot(slot)}
                                    color={slot.isBooked ? "inherit" : "primary"}
                                    size="small"
                                    sx={{ py: 1 }}
                                >
                                    {slot.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Button>
                            </Grid>
                        ))}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBookingSession(null)}>Cancel</Button>
                    <Button
                        variant="contained"
                        disabled={!selectedSlot || isBooking}
                        onClick={handleBook}
                    >
                        {isBooking ? 'Checking...' : 'Confirm Booking'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
