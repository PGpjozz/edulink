'use client';

import { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    FormControlLabel,
    Grid,
    MenuItem,
    Paper,
    TextField,
    Typography,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { TIER_PLANS, getTierDefaultFee, type BillingTier } from '@/lib/provider-pricing';
import { BRAND_DEFAULTS } from '@/lib/branding';

const defaultForm = {
    schoolName: '',
    tier: 'SMALL' as BillingTier,
    monthlyFee: String(getTierDefaultFee('SMALL')),
    contactEmail: '',
    subdomain: '',
    principalFirstName: '',
    principalLastName: '',
    principalEmail: '',
    principalPassword: '',
    createOwner: false,
    ownerFirstName: '',
    ownerLastName: '',
    ownerEmail: '',
    ownerPassword: '',
};

export default function OnboardSchoolForm({ onSuccess }: { onSuccess?: () => void }) {
    const [formData, setFormData] = useState(defaultForm);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '' as 'success' | 'error' | '', text: '' });

    useEffect(() => {
        setFormData((prev) => ({
            ...prev,
            monthlyFee: String(getTierDefaultFee(prev.tier)),
        }));
    }, [formData.tier]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const payload: Record<string, unknown> = { ...formData };
            if (!formData.createOwner) {
                delete payload.ownerFirstName;
                delete payload.ownerLastName;
                delete payload.ownerEmail;
                delete payload.ownerPassword;
            }
            delete payload.createOwner;
            if (!formData.subdomain.trim()) delete payload.subdomain;

            const res = await fetch('/api/provider/onboard-school', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (!res.ok) {
                setMessage({ type: 'error', text: data.error || 'Failed to onboard school' });
                return;
            }

            const notes = [
                `Principal welcome email: ${data.principal?.welcomeEmailSent ? 'sent' : 'not sent'}`,
                data.owner ? `Owner welcome email: ${data.owner.welcomeEmailSent ? 'sent' : 'not sent'}` : null,
                data.applyUrl ? `Apply URL: ${data.applyUrl}` : null,
            ]
                .filter(Boolean)
                .join(' · ');

            setMessage({
                type: 'success',
                text: `School "${formData.schoolName}" onboarded. Principal: ${formData.principalEmail}. ${notes}`,
            });
            setFormData(defaultForm);
            onSuccess?.();
        } catch {
            setMessage({ type: 'error', text: 'An error occurred' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper sx={{ p: 4, borderRadius: 3 }}>
            {message.text && (
                <Alert severity={message.type || 'info'} sx={{ mb: 3 }}>
                    {message.text}
                </Alert>
            )}

            <form onSubmit={handleSubmit}>
                <Typography variant="h6" fontWeight="bold" mb={2}>
                    School details
                </Typography>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            fullWidth
                            label="School name"
                            required
                            value={formData.schoolName}
                            onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            select
                            fullWidth
                            label="Plan tier"
                            value={formData.tier}
                            onChange={(e) =>
                                setFormData({ ...formData, tier: e.target.value as BillingTier })
                            }
                        >
                            {(Object.keys(TIER_PLANS) as BillingTier[]).map((tier) => (
                                <MenuItem key={tier} value={tier}>
                                    {TIER_PLANS[tier].label} — {TIER_PLANS[tier].description}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            fullWidth
                            label="Monthly fee (ZAR)"
                            type="number"
                            required
                            value={formData.monthlyFee}
                            onChange={(e) => setFormData({ ...formData, monthlyFee: e.target.value })}
                            helperText={`Default for tier: R${getTierDefaultFee(formData.tier)}`}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            fullWidth
                            label="Subdomain"
                            value={formData.subdomain}
                            onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                            placeholder="westview"
                            helperText={`.${BRAND_DEFAULTS.tenantRootDomain}`}
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            fullWidth
                            label="School contact email"
                            type="email"
                            required
                            value={formData.contactEmail}
                            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                        />
                    </Grid>
                </Grid>

                <Typography variant="h6" fontWeight="bold" mt={4} mb={2}>
                    Principal account
                </Typography>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth
                            label="First name"
                            required
                            value={formData.principalFirstName}
                            onChange={(e) => setFormData({ ...formData, principalFirstName: e.target.value })}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth
                            label="Last name"
                            required
                            value={formData.principalLastName}
                            onChange={(e) => setFormData({ ...formData, principalLastName: e.target.value })}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth
                            label="Principal email"
                            type="email"
                            required
                            value={formData.principalEmail}
                            onChange={(e) => setFormData({ ...formData, principalEmail: e.target.value })}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth
                            label="Temporary password"
                            required
                            value={formData.principalPassword}
                            onChange={(e) => setFormData({ ...formData, principalPassword: e.target.value })}
                        />
                    </Grid>
                </Grid>

                <Typography variant="h6" fontWeight="bold" mt={4} mb={1}>
                    School owner (optional)
                </Typography>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={formData.createOwner}
                            onChange={(e) => setFormData({ ...formData, createOwner: e.target.checked })}
                        />
                    }
                    label="Create school owner account now"
                />
                {formData.createOwner && (
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                label="Owner first name"
                                value={formData.ownerFirstName}
                                onChange={(e) => setFormData({ ...formData, ownerFirstName: e.target.value })}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                label="Owner last name"
                                value={formData.ownerLastName}
                                onChange={(e) => setFormData({ ...formData, ownerLastName: e.target.value })}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                label="Owner email"
                                type="email"
                                required
                                value={formData.ownerEmail}
                                onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                label="Owner password"
                                required
                                value={formData.ownerPassword}
                                onChange={(e) => setFormData({ ...formData, ownerPassword: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                )}

                <Box mt={4} display="flex" justifyContent="center">
                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Add />}
                        disabled={loading}
                    >
                        {loading ? 'Onboarding…' : 'Onboard school'}
                    </Button>
                </Box>
            </form>
        </Paper>
    );
}
