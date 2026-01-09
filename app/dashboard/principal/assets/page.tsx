import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    IconButton,
    Tooltip,
    CircularProgress,
    Alert,
    Tab,
    Tabs,
    FormControlLabel,
    Switch
} from '@mui/material';
import {
    Add,
    Delete,
    Edit,
    AssignmentTurnedIn,
    AssignmentReturn,
    Inventory,
    Check,
    Close,
    Event
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

interface Asset {
    id: string;
    name: string;
    category: string;
    identifier: string | null;
    status: 'AVAILABLE' | 'ASSIGNED' | 'MAINTENANCE' | 'LOST';
    isBookable: boolean;
    assignedTo: {
        name: string;
        email: string;
    } | null;
}

interface Booking {
    id: string;
    assetId: string;
    asset: Asset;
    userId: string;
    user: { firstName: string, lastName: string, role: string, email: string };
    startDate: string;
    endDate: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED';
    createdAt: string;
}

export default function AssetManager() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState(0);

    const [openAdd, setOpenAdd] = useState(false);
    const [openAssign, setOpenAssign] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

    const [newAsset, setNewAsset] = useState({
        name: '',
        category: 'BOOKS',
        identifier: '',
        isBookable: true
    });

    const [assignUserId, setAssignUserId] = useState('');

    useEffect(() => {
        fetchData();
    }, [tab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (tab === 0) {
                const res = await fetch('/api/school/assets');
                if (!res.ok) throw new Error('Failed to fetch assets');
                const data = await res.json();
                setAssets(data);
            } else {
                const res = await fetch('/api/school/assets/bookings');
                if (!res.ok) throw new Error('Failed to fetch bookings');
                const data = await res.json();
                setBookings(data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            const res = await fetch('/api/school/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAsset)
            });
            if (!res.ok) throw new Error('Failed to create asset');
            setOpenAdd(false);
            setNewAsset({ name: '', category: 'BOOKS', identifier: '', isBookable: true });
            fetchData();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Error');
        }
    };

    const handleUpdateStatus = async (id: string, status: string, assignedToId: string | null = null) => {
        try {
            const res = await fetch('/api/school/assets', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status, assignedToId })
            });
            if (!res.ok) throw new Error('Failed to update asset');
            setOpenAssign(false);
            setAssignUserId('');
            fetchData();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Error');
        }
    };

    const handleUpdateBooking = async (id: string, status: string) => {
        try {
            const res = await fetch('/api/school/assets/bookings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status })
            });
            if (!res.ok) throw new Error('Failed to update booking');
            fetchData();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this asset?')) return;
        try {
            const res = await fetch(`/api/school/assets?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete asset');
            fetchData();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Error');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'AVAILABLE':
            case 'APPROVED': return 'success';
            case 'ASSIGNED':
            case 'PENDING': return 'primary';
            case 'MAINTENANCE': return 'warning';
            case 'LOST':
            case 'REJECTED': return 'error';
            default: return 'default';
        }
    };

    return (
        <Box p={4} component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Library & Asset Hub
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Comprehensive management of school resources and student bookings.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setOpenAdd(true)}
                    sx={{ borderRadius: 2 }}
                >
                    Add New Asset
                </Button>
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                    <Tab label="Inventory" icon={<Inventory />} iconPosition="start" />
                    <Tab label="Booking Requests" icon={<Event />} iconPosition="start" />
                </Tabs>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {loading ? (
                <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>
            ) : tab === 0 ? (
                <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 3 }}>
                    <Table>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Category</TableCell>
                                <TableCell>Bookable</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Tracking</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {assets.map((asset) => (
                                <TableRow key={asset.id} hover>
                                    <TableCell sx={{ fontWeight: 'bold' }}>{asset.name}</TableCell>
                                    <TableCell>
                                        <Chip label={asset.category} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell>
                                        {asset.isBookable ?
                                            <Chip label="Yes" color="success" size="small" variant="outlined" /> :
                                            <Chip label="No" size="small" variant="outlined" />
                                        }
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={asset.status}
                                            color={getStatusColor(asset.status) as any}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {asset.assignedTo ? (
                                            <Box>
                                                <Typography variant="body2">{asset.assignedTo.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{asset.assignedTo.email}</Typography>
                                            </Box>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell align="right">
                                        {asset.status === 'AVAILABLE' ? (
                                            <Tooltip title="Check Out">
                                                <IconButton onClick={() => { setSelectedAsset(asset); setOpenAssign(true); }}>
                                                    <AssignmentTurnedIn color="primary" />
                                                </IconButton>
                                            </Tooltip>
                                        ) : (
                                            <Tooltip title="Item Returned">
                                                <IconButton onClick={() => handleUpdateStatus(asset.id, 'AVAILABLE')}>
                                                    <AssignmentReturn color="success" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        <IconButton onClick={() => handleDelete(asset.id)}>
                                            <Delete color="error" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            ) : (
                <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 3 }}>
                    <Table>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell>Asset</TableCell>
                                <TableCell>Requested By</TableCell>
                                <TableCell>Dates</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {bookings.map((booking) => (
                                <TableRow key={booking.id} hover>
                                    <TableCell sx={{ fontWeight: 'bold' }}>{booking.asset.name}</TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{booking.user.firstName} {booking.user.lastName}</Typography>
                                        <Typography variant="caption" color="text.secondary">{booking.user.role}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        {format(new Date(booking.startDate), 'MMM dd')} - {format(new Date(booking.endDate), 'MMM dd')}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={booking.status}
                                            color={getStatusColor(booking.status) as any}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        {booking.status === 'PENDING' && (
                                            <>
                                                <IconButton color="success" onClick={() => handleUpdateBooking(booking.id, 'APPROVED')}>
                                                    <Check />
                                                </IconButton>
                                                <IconButton color="error" onClick={() => handleUpdateBooking(booking.id, 'REJECTED')}>
                                                    <Close />
                                                </IconButton>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {bookings.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                        No pending bookings requests.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Dialogs remain similar but updated with isBookable */}
            <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Add New School Asset</DialogTitle>
                <DialogContent dividers>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField
                            label="Asset Name"
                            fullWidth
                            value={newAsset.name}
                            onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                        />
                        <TextField
                            select
                            label="Category"
                            fullWidth
                            value={newAsset.category}
                            onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value })}
                        >
                            <MenuItem value="BOOKS">Books</MenuItem>
                            <MenuItem value="ELECTRONICS">Electronics</MenuItem>
                            <MenuItem value="SPORTS">Sports Equipment</MenuItem>
                            <MenuItem value="OTHER">Other</MenuItem>
                        </TextField>
                        <TextField
                            label="Identifier (ISBN/Serial)"
                            fullWidth
                            value={newAsset.identifier}
                            onChange={(e) => setNewAsset({ ...newAsset, identifier: e.target.value })}
                        />
                        <FormControlLabel
                            control={<Switch checked={newAsset.isBookable} onChange={(e) => setNewAsset({ ...newAsset, isBookable: e.target.checked })} />}
                            label="Allow digital bookings"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAdd(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreate}>Add Asset</Button>
                </DialogActions>
            </Dialog>

            {/* Assign Dialog remains mostly same */}
            <Dialog open={openAssign} onClose={() => setOpenAssign(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Manual Checkout</DialogTitle>
                <DialogContent dividers>
                    <Box mt={1}>
                        <Typography variant="body2" gutterBottom>Manual checkout for: <strong>{selectedAsset?.name}</strong></Typography>
                        <TextField
                            label="User ID"
                            fullWidth
                            sx={{ mt: 2 }}
                            value={assignUserId}
                            onChange={(e) => setAssignUserId(e.target.value)}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAssign(false)}>Cancel</Button>
                    <Button variant="contained" onClick={() => selectedAsset && handleUpdateStatus(selectedAsset.id, 'ASSIGNED', assignUserId)}>Assign</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
