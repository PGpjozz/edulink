import type { Metadata, Viewport } from 'next';
import ThemeRegistry from './theme/ThemeRegistry';

export const metadata: Metadata = {
  title: 'EduLink Intelligence',
  description: 'Premium Multiple School Management System',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'EduLink',
  },
  icons: {
    apple: '/icon-512x512.png',
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#2563eb',
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
