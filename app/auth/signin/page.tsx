'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
} from '@mui/material';
import { Visibility, VisibilityOff, School } from '@mui/icons-material';
import { useThemeContext } from '@/app/theme/ThemeContext';

type PublicBranding = {
  schoolName: string;
  logoUrl: string | null;
  primaryColor: string;
};

export default function SignInPage() {
  const router = useRouter();
  const { schoolName, logoUrl } = useThemeContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<PublicBranding | null>(null);

  useEffect(() => {
    fetch('/api/school/branding/public')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.schoolName) setBranding(data);
      })
      .catch(() => {});
  }, []);

  const displayName = branding?.schoolName || schoolName;
  const displayLogo = branding?.logoUrl || logoUrl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        bgcolor: 'background.default',
      }}
    >
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          width: '42%',
          minHeight: '100vh',
          background: (theme) =>
            `linear-gradient(145deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 55%, #0f172a 100%)`,
          color: 'primary.contrastText',
          flexDirection: 'column',
          justifyContent: 'center',
          px: 6,
          py: 8,
        }}
      >
        <Box sx={{ maxWidth: 400 }}>
          {displayLogo ? (
            <Box
              component="img"
              src={displayLogo}
              alt=""
              sx={{ height: 56, mb: 3, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
            />
          ) : (
            <School sx={{ fontSize: 56, mb: 2, opacity: 0.9 }} />
          )}
          <Typography variant="h3" fontWeight={800} gutterBottom sx={{ letterSpacing: '-0.03em' }}>
            {displayName}
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.88, fontWeight: 400, lineHeight: 1.6 }}>
            One place for grades, attendance, homework, and school communication.
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 2, sm: 4 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 420 }}>
          <Box sx={{ display: { xs: 'block', md: 'none' }, textAlign: 'center', mb: 3 }}>
            {displayLogo ? (
              <Box component="img" src={displayLogo} alt="" sx={{ height: 48, mb: 1, objectFit: 'contain' }} />
            ) : (
              <School color="primary" sx={{ fontSize: 48, mb: 1 }} />
            )}
            <Typography variant="h5" fontWeight={700}>
              {displayName}
            </Typography>
          </Box>

          <Typography variant="h4" fontWeight={700} gutterBottom sx={{ display: { xs: 'none', md: 'block' } }}>
            Sign in
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Use your school email and password
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              sx={{ mb: 1 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" aria-label="toggle password">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ textAlign: 'right', mb: 3 }}>
              <Link href="/auth/forgot-password" style={{ fontSize: '0.875rem' }}>
                Forgot password?
              </Link>
            </Box>
            <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ py: 1.5, mb: 2 }}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign in'}
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary" textAlign="center">
            <Link href="/privacy">Privacy policy</Link>
            {' · '}
            <Link href="/terms">Terms of use</Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
