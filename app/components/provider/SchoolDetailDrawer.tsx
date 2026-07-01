'use client';

import { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    Drawer,
    Grid,
    MenuItem,
    TextField,
    Typography,
} from '@mui/material';
import {
    PLAN_FEATURE_LABELS,
    TIER_PLANS,
    getTierDefaultFee,
    type BillingTier,
    type PlanFeature,
} from '@/lib/provider-pricing';
import { BRAND_DEFAULTS } from '@/lib/branding';

type SchoolDetail = {
    id: string;
    name: string;
    tier: BillingTier;
    monthlyFee: number;
    contactEmail: string | null;
    subdomain: string | null;
    isActive: boolean;
    gradesOffered: string[];
    learnerCount: number;
    staffCount: number;
    effectiveMonthlyFee: number;
    applyUrl: string | null;
    health: { score: number; label: string; reasons: string[] };
    owner: { email: string; firstName: string; lastName: string } | null;
    principal: { email: string; firstName: string; lastName: string } | null;
    billings: { id: string; status: string; totalAmount: number; createdAt: string }[];
    tierPlan: { features: PlanFeature[] };
};

export default function SchoolDetailDrawer({
    schoolId,
    open,
    onClose,
    onUpdated,
}: {
    schoolId: string | null;
    open: boolean;
    onClose: () => void;
    onUpdated: () => void;
}) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [detail, setDetail] = useState<SchoolDetail | null>(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [form, setForm] = useState({
        name: '',
        tier: 'SMALL' as BillingTier,
        monthlyFee: '',
        contactEmail: '',
        subdomain: '',
        isActive: true,
    });

    useEffect(() => {
        if (!open || !schoolId) return;
        setLoading(true);
        setError('');
        fetch(`/api/provider/schools/${schoolId}`)
            .then((r) => r.json())
            .then((data) => {
                if (!data.school) throw new Error(data.error || 'Failed to load');
                const s = data.school as SchoolDetail;
                setDetail(s);
                setForm({
                    name: s.name,
                    tier: s.tier,
                    monthlyFee: String(s.monthlyFee),
                    contactEmail: s.contactEmail ?? '',
                    subdomain: s.subdomain ?? '',
                    isActive: s.isActive,
                });
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [open, schoolId]);

    const save = async () => {
        if (!schoolId) return;
        setSaving(true);
        setMessage('');
        setError('');
        const res = await fetch(`/api/provider/schools/${schoolId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: form.name,
                tier: form.tier,
                monthlyFee: Number(form.monthlyFee),
                contactEmail: form.contactEmail,
                subdomain: form.subdomain || null,
                isActive: form.isActive,
            }),
        });
        const data = await res.json();
        setSaving(false);
        if (!res.ok) {
            setError(data.error || 'Save failed');
            return;
        }
        setMessage('School updated');
        onUpdated();
    };

    const impersonate = async () => {
        if (!schoolId) return;
        const res = await fetch('/api/provider/impersonate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schoolId }),
        });
        const data = await res.json();
        if (!res.ok) {
            setError(data.error || 'Impersonation failed');
            return;
        }
        window.open(data.impersonateUrl, '_blank', 'noopener,noreferrer');
    };

    const issueBill = async () => {
        if (!schoolId) return;
        const res = await fetch('/api/admin/billing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schoolId }),
        });
        if (!res.ok) {
            const data = await res.json();
            setError(data.error || 'Failed to issue bill');
            return;
        }
        setMessage('Bill issued');
        onUpdated();
    };

    return (
        <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}>
            <Box p={3}>
                <Typography variant="h6" fontWeight={800} gutterBottom>
                    School details
                </Typography>

                {loading && (
                    <Box display="flex" justifyContent="center" py={6}>
                        <CircularProgress />
                    </Box>
                )}

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

                {!loading && detail && (
                    <>
                        <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                            <Chip
                                label={detail.health.label}
                                color={
                                    detail.health.label === 'Healthy'
                                        ? 'success'
                                        : detail.health.label === 'Attention'
                                          ? 'warning'
                                          : 'error'
                                }
                                size="small"
                            />
                            <Chip label={`${detail.learnerCount} learners`} size="small" />
                            <Chip label={`${detail.staffCount} staff`} size="small" />
                            <Chip
                                label={detail.isActive ? 'Active' : 'Suspended'}
                                color={detail.isActive ? 'success' : 'default'}
                                size="small"
                            />
                        </Box>

                        {detail.health.reasons.length > 0 && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                {detail.health.reasons.join(' · ')}
                            </Typography>
                        )}

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    label="School name"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Tier"
                                    value={form.tier}
                                    onChange={(e) => {
                                        const tier = e.target.value as BillingTier;
                                        setForm({
                                            ...form,
                                            tier,
                                            monthlyFee: String(getTierDefaultFee(tier)),
                                        });
                                    }}
                                >
                                    {(Object.keys(TIER_PLANS) as BillingTier[]).map((tier) => (
                                        <MenuItem key={tier} value={tier}>
                                            {TIER_PLANS[tier].label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    label="Monthly fee (ZAR)"
                                    type="number"
                                    value={form.monthlyFee}
                                    onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    label="Contact email"
                                    value={form.contactEmail}
                                    onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    label="Subdomain"
                                    value={form.subdomain}
                                    onChange={(e) => setForm({ ...form, subdomain: e.target.value })}
                                    helperText={`.${BRAND_DEFAULTS.tenantRootDomain}`}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Status"
                                    value={form.isActive ? 'active' : 'suspended'}
                                    onChange={(e) =>
                                        setForm({ ...form, isActive: e.target.value === 'active' })
                                    }
                                >
                                    <MenuItem value="active">Active</MenuItem>
                                    <MenuItem value="suspended">Suspended</MenuItem>
                                </TextField>
                            </Grid>
                        </Grid>

                        <Typography variant="subtitle2" fontWeight={700} mt={3} mb={1}>
                            Plan features
                        </Typography>
                        <Box display="flex" gap={0.5} flexWrap="wrap" mb={2}>
                            {detail.tierPlan.features.map((f) => (
                                <Chip key={f} label={PLAN_FEATURE_LABELS[f]} size="small" variant="outlined" />
                            ))}
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="body2" color="text.secondary">
                            Owner: {detail.owner?.email ?? 'Not assigned'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Principal: {detail.principal?.email ?? '—'}
                        </Typography>
                        {detail.applyUrl && (
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                Apply link: {detail.applyUrl}
                            </Typography>
                        )}

                        <Box display="flex" flexWrap="wrap" gap={1}>
                            <Button variant="contained" onClick={save} disabled={saving}>
                                {saving ? 'Saving…' : 'Save changes'}
                            </Button>
                            <Button variant="outlined" onClick={issueBill}>
                                Issue bill
                            </Button>
                            <Button variant="outlined" color="secondary" onClick={impersonate}>
                                Impersonate admin
                            </Button>
                        </Box>
                    </>
                )}
            </Box>
        </Drawer>
    );
}
