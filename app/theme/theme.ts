import { createTheme, ThemeOptions, alpha } from '@mui/material/styles';
import { Inter, Outfit } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});

export const getTheme = (mode: 'light' | 'dark', primaryColor: string = '#4338ca') => {
  const isDark = mode === 'dark';

  const themeOptions: ThemeOptions = {
    typography: {
      fontFamily: `${inter.style.fontFamily}, sans-serif`,
      h1: { fontFamily: `${outfit.style.fontFamily}, sans-serif`, fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontFamily: `${outfit.style.fontFamily}, sans-serif`, fontWeight: 700, letterSpacing: '-0.02em' },
      h3: { fontFamily: `${outfit.style.fontFamily}, sans-serif`, fontWeight: 600, letterSpacing: '-0.01em' },
      h4: { fontFamily: `${outfit.style.fontFamily}, sans-serif`, fontWeight: 600, letterSpacing: '-0.01em' },
      h5: { fontFamily: `${outfit.style.fontFamily}, sans-serif`, fontWeight: 600 },
      h6: { fontFamily: `${outfit.style.fontFamily}, sans-serif`, fontWeight: 600 },
      body1: { lineHeight: 1.6 },
      body2: { lineHeight: 1.55 },
      button: { fontWeight: 600 },
    },
    palette: {
      mode,
      primary: {
        main: primaryColor,
        light: isDark ? alpha(primaryColor, 0.8) : '#6366f1',
        dark: isDark ? alpha(primaryColor, 0.6) : '#312e81',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#06b6d4',
        light: '#67e8f9',
        dark: '#0891b2',
        contrastText: '#ffffff',
      },
      success: { main: '#10b981' },
      warning: { main: '#f59e0b' },
      error: { main: '#ef4444' },
      info: { main: '#3b82f6' },
      background: {
        default: isDark ? '#0f172a' : '#f1f5f9',
        paper: isDark ? '#1e293b' : '#ffffff',
      },
      text: {
        primary: isDark ? '#f1f5f9' : '#0f172a',
        secondary: isDark ? '#94a3b8' : '#64748b',
      },
      divider: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
      action: {
        hover: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.04)',
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollBehavior: 'smooth',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 10,
            padding: '8px 20px',
            boxShadow: 'none',
          },
          containedPrimary: {
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${alpha(primaryColor, 0.85)} 100%)`,
            boxShadow: `0px 4px 14px ${alpha(primaryColor, isDark ? 0.45 : 0.28)}`,
            '&:hover': {
              boxShadow: `0px 6px 20px ${alpha(primaryColor, isDark ? 0.55 : 0.35)}`,
            },
          },
          outlined: {
            borderWidth: 1.5,
            '&:hover': { borderWidth: 1.5 },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
          elevation1: {
            boxShadow: isDark ? '0px 4px 24px rgba(0, 0, 0, 0.35)' : '0px 2px 16px rgba(15, 23, 42, 0.06)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.06)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.06)',
            boxShadow: isDark ? '0px 4px 20px rgba(0,0,0,0.25)' : '0px 2px 12px rgba(15, 23, 42, 0.04)',
          },
        },
      },
      MuiTextField: {
        defaultProps: { size: 'small' },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 10,
              '&.Mui-focused fieldset': {
                borderWidth: 2,
              },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, borderRadius: 8 },
          outlined: { borderWidth: 1.5 },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              fontWeight: 700,
              bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15, 23, 42, 0.03)',
            },
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': {
              bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15, 23, 42, 0.02)',
            },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 12 },
          standardSuccess: {
            bgcolor: isDark ? alpha('#10b981', 0.12) : alpha('#10b981', 0.08),
          },
          standardError: {
            bgcolor: isDark ? alpha('#ef4444', 0.12) : alpha('#ef4444', 0.08),
          },
          standardWarning: {
            bgcolor: isDark ? alpha('#f59e0b', 0.12) : alpha('#f59e0b', 0.08),
          },
          standardInfo: {
            bgcolor: isDark ? alpha('#3b82f6', 0.12) : alpha('#3b82f6', 0.08),
          },
        },
      },
      MuiSkeleton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.06)',
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.85)',
            color: isDark ? '#f1f5f9' : '#0f172a',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#1e293b' : 'rgba(255, 255, 255, 0.92)',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: 16 },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: { height: 3, borderRadius: 3 },
        },
      },
    },
  };

  return createTheme(themeOptions);
};

const defaultTheme = getTheme('light');
export default defaultTheme;
