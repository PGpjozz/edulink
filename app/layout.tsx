import type { Metadata } from 'next';
import ThemeRegistry from './theme/ThemeRegistry';

export const metadata: Metadata = {
  title: 'EduLink Intelligence',
  description: 'Premium Multiple School Management System',
  manifest: '/manifest.json',
  themeColor: '#2563eb',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'EduLink',
  },
  icons: {
    apple: '/icon-512x512.png',
  }
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
