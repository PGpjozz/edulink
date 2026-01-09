'use client';

import { useState } from 'react';
import {
    Container,
    Typography,
    Box,
    Paper,
    TextField,
    Button,
    Grid,
    MenuItem,
    Alert,
    CircularProgress
} from '@mui/material';
import { Add, School as SchoolIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';

export default function ProviderDashboard() {
    const [formData, setFormData] = useState({
        schoolName: '',
        tier: 'SMALL',
        monthlyFee: '1000',
        contactEmail: '',
        principalFirstName: '',
        principalLastName: '',
        principalEmail: '',
        principalPassword: 'principal123'
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await fetch('/api/provider/onboard-school', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: `✅ School "${formData.schoolName}" onboarded successfully! Principal can now log in with ${formData.principalEmail}` });
                // Reset form
                setFormData({
                    schoolName: '',
                    tier: 'SMALL',
                    monthlyFee: '1000',
                    contactEmail: '',
                    principalFirstName: '',
                    principalLastName: '',
                    principalEmail: '',
                    principalPassword: 'principal123'
                });
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to onboard school' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An error occurred' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }} component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Box mb={4} textAlign="center">
                <SchoolIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h3" fontWeight="bold">EduLink Provider Portal</Typography>
                <Typography color="text.secondary" variant="h6">Onboard New Schools</Typography>
            </Box>

            {message.text && (
                <Alert severity={message.type as any} sx={{ mb: 3 }}>
                    {message.text}
                </Alert>
            )}

            <Paper sx={{ p: 4, borderRadius: 3 }}>
                <form onSubmit={handleSubmit}>
                    <Typography variant="h6" fontWeight="bold" mb={3}>School Details</Typography>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="School Name"
                                required
                                value={formData.schoolName}
                                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                select
                                fullWidth
                                label="Tier"
                                value={formData.tier}
                                onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                            >
                                <MenuItem value="SMALL">Small (1-200 students)</MenuItem>
                                <MenuItem value="MEDIUM">Medium (201-500 students)</MenuItem>
                                <MenuItem value="LARGE">Large (500+ students)</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Monthly Fee (ZAR)"
                                type="number"
                                required
                                value={formData.monthlyFee}
                                onChange={(e) => setFormData({ ...formData, monthlyFee: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="School Contact Email"
                                type="email"
                                required
                                value={formData.contactEmail}
                                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                            />
                        </Grid>
                    </Grid>

                    <Typography variant="h6" fontWeight="bold" mt={4} mb={3}>Principal Account</Typography>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="First Name"
                                required
                                value={formData.principalFirstName}
                                onChange={(e) => setFormData({ ...formData, principalFirstName: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Last Name"
                                required
                                value={formData.principalLastName}
                                onChange={(e) => setFormData({ ...formData, principalLastName: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Principal Email"
                                type="email"
                                required
                                value={formData.principalEmail}
                                onChange={(e) => setFormData({ ...formData, principalEmail: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Temporary Password"
                                required
                                value={formData.principalPassword}
                                onChange={(e) => setFormData({ ...formData, principalPassword: e.target.value })}
                                helperText="Principal should change this on first login"
                            />
                        </Grid>
                    </Grid>

                    <Box mt={4} display="flex" justifyContent="center">
                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            startIcon={loading ? <CircularProgress size={20} /> : <Add />}
                            disabled={loading}
                            sx={{ px: 6, py: 1.5 }}
                        >
                            {loading ? 'Onboarding...' : 'Onboard School'}
                        </Button>
                    </Box>
                </form>
            </Paper>
        </Container>
    );
}
