import { createTheme, ThemeOptions } from '@mui/material/styles';
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
      h1: { fontFamily: `${outfit.style.fontFamily}, sans-serif`, fontWeight: 700 },
      h2: { fontFamily: `${outfit.style.fontFamily}, sans-serif`, fontWeight: 700 },
      h3: { fontFamily: `${outfit.style.fontFamily}, sans-serif`, fontWeight: 600 },
      h4: { fontFamily: `${outfit.style.fontFamily}, sans-serif`, fontWeight: 600 },
      h5: { fontFamily: `${outfit.style.fontFamily}, sans-serif`, fontWeight: 600 },
      h6: { fontFamily: `${outfit.style.fontFamily}, sans-serif`, fontWeight: 600 },
    },
    palette: {
      mode,
      primary: {
        main: primaryColor,
        light: '#6366f1',
        dark: '#312e81',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#06b6d4',
        light: '#67e8f9',
        dark: '#0891b2',
        contrastText: '#ffffff',
      },
      background: {
        default: isDark ? '#0f172a' : '#f8fafc',
        paper: isDark ? '#1e293b' : '#ffffff',
      },
      text: {
        primary: isDark ? '#f1f5f9' : '#1e293b',
        secondary: isDark ? '#94a3b8' : '#64748b',
      },
      divider: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 10,
            padding: '8px 20px',
          },
          containedPrimary: {
            background: `linear-gradient(135deg, ${primaryColor} 0%, #6366f1 100%)`,
            boxShadow: `0px 4px 10px rgba(67, 56, 202, ${isDark ? '0.4' : '0.2'})`,
            '&:hover': {
              boxShadow: `0px 6px 15px rgba(67, 56, 202, ${isDark ? '0.6' : '0.3'})`,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
          elevation1: {
            boxShadow: isDark ? '0px 4px 20px rgba(0, 0, 0, 0.4)' : '0px 2px 12px rgba(0, 0, 0, 0.04)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(226, 232, 240, 0.8)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)',
            color: isDark ? '#f1f5f9' : '#1e293b',
          }
        }
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#1e293b' : 'rgba(255, 255, 255, 0.8)',
          }
        }
      }
    },
  };

  return createTheme(themeOptions);
};

const defaultTheme = getTheme('light');
export default defaultTheme;
