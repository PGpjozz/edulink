'use client';

import { useEffect, useState } from 'react';
import { Paper, Typography, Box, Chip, Stack, Tooltip } from '@mui/material';
import { CheckCircle, Warning } from '@mui/icons-material';

type Integrations = {
    database: boolean;
    authSecret: boolean;
    email: boolean;
    payments: boolean;
    paymentsMode: string;
    fileStorage: boolean;
};

function StatusChip({ ok, label, okHint, warnHint }: { ok: boolean; label: string; okHint?: string; warnHint?: string }) {
    return (
        <Tooltip title={ok ? (okHint || 'Configured') : (warnHint || 'Not configured')}>
            <Chip
                icon={ok ? <CheckCircle /> : <Warning />}
                color={ok ? 'success' : 'warning'}
                variant={ok ? 'filled' : 'outlined'}
                label={label}
                size="small"
            />
        </Tooltip>
    );
}

export default function SystemStatusPanel() {
    const [data, setData] = useState<Integrations | null>(null);

    useEffect(() => {
        fetch('/api/system/status')
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => setData(d?.integrations ?? null))
            .catch(() => setData(null));
    }, []);

    if (!data) return null;

    const allReady = data.database && data.authSecret && data.email && data.payments && data.fileStorage;

    return (
        <Paper variant="outlined" sx={{ p: 2, mb: 4, borderRadius: 3 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1} flexWrap="wrap" gap={1}>
                <Typography variant="subtitle1" fontWeight="bold">Platform readiness</Typography>
                <Chip
                    size="small"
                    color={allReady ? 'success' : 'warning'}
                    label={allReady ? 'All integrations configured' : 'Some integrations need setup'}
                />
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <StatusChip ok={data.database} label="Database" warnHint="Set DATABASE_URL" />
                <StatusChip ok={data.authSecret} label="Auth secret" warnHint="Set NEXTAUTH_SECRET" />
                <StatusChip ok={data.email} label="Email (Resend)" warnHint="Set RESEND_API_KEY + verified EMAIL_FROM to send invites/resets" />
                <StatusChip
                    ok={data.payments}
                    label={`Payments${data.payments ? ` (${data.paymentsMode})` : ''}`}
                    warnHint="Set PAYFAST_MERCHANT_ID / KEY (+ passphrase)"
                />
                <StatusChip
                    ok={data.fileStorage}
                    label="File storage"
                    okHint="Vercel Blob configured"
                    warnHint="Using local-disk fallback — set BLOB_READ_WRITE_TOKEN for durable uploads in production"
                />
            </Stack>
        </Paper>
    );
}
