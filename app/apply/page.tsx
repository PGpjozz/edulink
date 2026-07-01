'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Paper,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { BRAND } from '@/lib/branding';
import BrandLogo from '@/app/components/BrandLogo';

type SchoolInfo = {
  id: string;
  name: string;
  subdomain: string;
  gradesOffered: string[];
  primaryColor?: string;
  logoUrl?: string | null;
};

function ApplyFormInner() {
  const searchParams = useSearchParams();
  const subdomainParam = searchParams.get('school')?.toLowerCase() ?? '';

  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [loadingSchool, setLoadingSchool] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [grade, setGrade] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const sub = subdomainParam || 'westview';
    fetch(`/api/school/public?subdomain=${encodeURIComponent(sub)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setSchool)
      .catch(() => setSchool(null))
      .finally(() => setLoadingSchool(false));
  }, [subdomainParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!school) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admissions/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          firstName,
          lastName,
          email,
          grade,
          idNumber: idNumber || undefined,
          notes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data === 'string' ? data : 'Application failed');
        return;
      }
      setSuccess(`Thank you! Your application to ${school.name} was submitted. We will email you at ${email}.`);
      setFirstName('');
      setLastName('');
      setEmail('');
      setGrade('');
      setIdNumber('');
      setNotes('');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingSchool) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!school) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Alert severity="error">School not found. Check your application link.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 6, px: 2 }}>
      <Paper sx={{ maxWidth: 520, mx: 'auto', p: { xs: 3, sm: 4 }, borderRadius: 3 }}>
        <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
          {school.logoUrl ? (
            <Box component="img" src={school.logoUrl} alt={`${school.name} logo`} sx={{ height: 56, mb: 2, objectFit: 'contain' }} />
          ) : (
            <Box mb={2}>
              <BrandLogo variant="icon" height={56} />
            </Box>
          )}
          <Typography variant="h5" fontWeight={800} textAlign="center">
            Apply to {school.name}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
          Submit an online application. Our admissions team will review and contact you by email.
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" textAlign="center" sx={{ mb: 3 }}>
          Powered by {BRAND.name}
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {!success && (
          <Box component="form" onSubmit={handleSubmit}>
            <TextField fullWidth label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required sx={{ mb: 2 }} />
            <TextField fullWidth label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required sx={{ mb: 2 }} />
            <TextField fullWidth label="Parent / guardian email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required sx={{ mb: 2 }} />
            <TextField fullWidth select label="Grade applying for" value={grade} onChange={(e) => setGrade(e.target.value)} required sx={{ mb: 2 }}>
              {school.gradesOffered.map((g) => (
                <MenuItem key={g} value={g}>Grade {g}</MenuItem>
              ))}
            </TextField>
            <TextField fullWidth label="Learner SA ID (optional)" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} helperText="13-digit ID if available" sx={{ mb: 2 }} />
            <TextField fullWidth label="Additional notes" multiline rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} sx={{ mb: 3 }} />
            <Button type="submit" fullWidth variant="contained" size="large" disabled={submitting}>
              {submitting ? <CircularProgress size={24} color="inherit" /> : 'Submit application'}
            </Button>
          </Box>
        )}

        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 3 }}>
          Already enrolled? <Link href={`/auth/signin?school=${school.subdomain}`}>Sign in</Link>
          {' · '}
          <Link href="/privacy">Privacy policy</Link>
        </Typography>
      </Paper>
    </Box>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={<CircularProgress />}>
      <ApplyFormInner />
    </Suspense>
  );
}
