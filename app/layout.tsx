import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import CameleonThemeStyle from '@/components/CameleonThemeStyle';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { THEME_PALETTE } from '@/lib/geo/resolve';

export const metadata: Metadata = {
  applicationName: 'Entomology Global Edge Engine',
  title: 'Neotropical Specimens Native',
  description: 'Ecosistema dinámico de especímenes neotropicales',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'EntmoEdge',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#121212',
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const locale = h.get('x-locale') ?? 'en-US';
  const theme = h.get('x-ui-theme') ?? 'standard';

  const dict = await getDictionary(locale);
  const palette = THEME_PALETTE[theme] ?? THEME_PALETTE.standard;

  return (
    <html lang={dict.locale} suppressHydrationWarning>
      <head>
        <CameleonThemeStyle source={palette} />
      </head>
      <body data-theme={theme} data-currency={dict.currency}>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
