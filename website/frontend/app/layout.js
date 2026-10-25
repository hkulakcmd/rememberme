import { Inter, Poppins } from 'next/font/google';

import { AuthProvider } from '@/components/providers/AuthProvider';
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration';
import { ToastProvider } from '@/components/providers/ToastProvider';

import './globals.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin', 'latin-ext'],
  weight: ['600'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata = {
  title: {
    default: 'RememberMe — pamiętaj o urodzinach bliskich',
    template: '%s · RememberMe',
  },
  description:
    'RememberMe przypomina o urodzinach rodziny i przyjaciół. Prosto, spokojnie i zawsze na czas.',
  applicationName: 'RememberMe',
  manifest: '/manifest.webmanifest',
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RememberMe',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
    shortcut: '/favicon.svg',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FFF9FB',
  colorScheme: 'light',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl" className={`${inter.variable} ${poppins.variable}`}>
      <body>
        <ServiceWorkerRegistration />
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
