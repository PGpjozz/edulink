'use client';

import { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    Grid,
    Alert,
    CircularProgress,
    Divider
} from '@mui/material';
import { useThemeContext } from '@/app/theme/ThemeContext';
import { Palette, CloudUpload } from '@mui/icons-material';

export default function BrandingSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [branding, setBranding] = useState({ logoUrl: '', primaryColor: '' });
    const [message, setMessage] = useState({ type: 'success', text: '' });
    const { setPrimaryColor, setLogoUrl } = useThemeContext();

    useEffect(() => {
        fetch('/api/school/branding')
            .then(res => res.json())
            .then(data => {
                setBranding({
                    logoUrl: data.logoUrl || '',
                    primaryColor: data.primaryColor || '#4338ca'
                });
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: 'success', text: '' });

        try {
            const res = await fetch('/api/school/branding', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(branding)
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Branding updated successfully!' });
                setPrimaryColor(branding.primaryColor); // Instant update in UI
                if (branding.logoUrl) setLogoUrl(branding.logoUrl);
            } else {
                setMessage({ type: 'error', text: 'Failed to update branding.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An unexpected error occurred.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>;

    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Box mb={4}>
                <Typography variant="h4" fontWeight="bold">School Branding</Typography>
                <Typography color="text.secondary">Customize how EduLink looks for your staff and parents.</Typography>
            </Box>

            {message.text && (
                <Alert severity={message.type as any} sx={{ mb: 3 }}>
                    {message.text}
                </Alert>
            )}

            <form onSubmit={handleSave}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Box display="flex" alignItems="center" gap={1} mb={2}>
                                    <CloudUpload color="primary" />
                                    <Typography variant="h6" fontWeight="bold">Logo & Identity</Typography>
                                </Box>
                                <TextField
                                    fullWidth
                                    label="Logo URL"
                                    variant="outlined"
                                    value={branding.logoUrl}
                                    onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                                    placeholder="https://example.com/logo.png"
                                    sx={{ mb: 2 }}
                                />
                                <Typography variant="caption" color="text.secondary">
                                    Provide a public URL to your school's logo. Recommended size: 200x200px.
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Box display="flex" alignItems="center" gap={1} mb={2}>
                                    <Palette color="primary" />
                                    <Typography variant="h6" fontWeight="bold">Color Scheme</Typography>
                                </Box>
                                <TextField
                                    fullWidth
                                    label="Primary Theme Color"
                                    type="color"
                                    variant="outlined"
                                    value={branding.primaryColor}
                                    onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                                    sx={{ mb: 2 }}
                                />
                                <Box
                                    sx={{
                                        width: '100%',
                                        height: 40,
                                        bgcolor: branding.primaryColor,
                                        borderRadius: 1,
                                        mb: 1
                                    }}
                                />
                                <Typography variant="caption" color="text.secondary">
                                    Select your school's primary color. This will update buttons, links, and icons.
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12}>
                        <Divider sx={{ my: 2 }} />
                        <Box display="flex" justifyContent="flex-end">
                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                disabled={saving}
                                startIcon={saving && <CircularProgress size={20} />}
                            >
                                {saving ? 'Saving...' : 'Save Branding Changes'}
                            </Button>
                        </Box>
                    </Grid>
                </Grid>
            </form>
        </Container>
    );
}
