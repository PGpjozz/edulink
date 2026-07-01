'use client';

import { useEffect, useState } from 'react';
import { BRAND } from '@/lib/branding';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  FormControlLabel,
  Checkbox,
  Link,
} from '@mui/material';

const CONSENT_VERSION = '2026-01';

export default function PrivacyConsentGate() {
  const { data: session, status, update } = useSession();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;
    const rolesNeedingConsent = ['LEARNER', 'PARENT', 'TEACHER', 'HOD', 'PRINCIPAL', 'SCHOOL_ADMIN', 'SCHOOL_OWNER'];
    if (!rolesNeedingConsent.includes(session.user.role)) return;

    fetch('/api/user/privacy-consent')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && !data.hasConsent) setOpen(true);
      })
      .catch(() => {});
  }, [session, status]);

  const handleAccept = async () => {
    if (!checked) return;
    setLoading(true);
    try {
      const res = await fetch('/api/user/privacy-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: CONSENT_VERSION }),
      });
      if (res.ok) {
        setOpen(false);
        await update({});
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} disableEscapeKeyDown>
      <DialogTitle>Privacy &amp; data protection (POPIA)</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" paragraph>
          {BRAND.name} processes personal information to provide school services. Please read our{' '}
          <Link href="/privacy" target="_blank">privacy policy</Link> before continuing.
        </Typography>
        <FormControlLabel
          control={<Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)} />}
          label="I consent to the processing of my personal information as described in the privacy policy."
        />
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={handleAccept} disabled={!checked || loading}>
          {loading ? 'Saving…' : 'Continue'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
