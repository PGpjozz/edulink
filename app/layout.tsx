import type { Metadata, Viewport } from 'next';
import ThemeRegistry from './theme/ThemeRegistry';
import { BRAND } from '@/lib/branding';

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description: BRAND.description,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: BRAND.shortName,
  },
  icons: {
    apple: '/icon-512x512.png',
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#f59e0b',
};

import AuthProvider from './AuthProvider';
import PWARegistration from './components/PWARegistration';
import InstallPWA from './components/InstallPWA';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PWARegistration />
        <InstallPWA />
        <AuthProvider>
          <ThemeRegistry>
            {children}
          </ThemeRegistry>
        </AuthProvider>
      </body>
    </html>
  );
}
