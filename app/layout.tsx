import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import CameleonThemeStyle from '@/components/CameleonThemeStyle';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import { CartProvider } from '@/components/CartProvider';
import { resolveLocale } from '@/lib/i18n/locales';
import { THEME_PALETTE } from '@/lib/geo/resolve';
import {
  BRAND_APPLE_ICON_URL,
  BRAND_FAVICON_ICO_URL,
  BRAND_FAVICON_URL,
} from '@/lib/cloudinary/brand';

// Base absoluta segura: nunca pasar undefined/"" a `new URL(...)`.
function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    try {
      return new URL(raw.trim()).toString();
    } catch {
      /* fall through */
    }
  }
  return 'http://localhost:3000';
}

const SITE_URL = resolveSiteUrl();

const faviconUrl = typeof BRAND_FAVICON_URL === 'string' ? BRAND_FAVICON_URL : '';
const appleIconUrl = typeof BRAND_APPLE_ICON_URL === 'string' ? BRAND_APPLE_ICON_URL : '';
const faviconIcoUrl = typeof BRAND_FAVICON_ICO_URL === 'string' ? BRAND_FAVICON_ICO_URL : '';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
    icon: [
      ...(faviconUrl.length > 0 ? [{ url: faviconUrl, sizes: '32x32', type: 'image/png' as const }] : []),
      ...(faviconIcoUrl.length > 0 ? [{ url: faviconIcoUrl, sizes: 'any' }] : []),
    ],
    shortcut: faviconUrl.length > 0 ? faviconUrl : undefined,
    apple: appleIconUrl.length > 0 ? appleIconUrl : undefined,
  },
};

export const viewport: Viewport = {
  themeColor: '#121212',
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
  // Accesible en cualquier dispositivo (móvil → PC); no bloquear zoom.
  userScalable: true,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const theme = h.get('x-ui-theme') ?? 'standard';
  const currency = h.get('x-currency') ?? 'USD';

  const { locale, dir } = await resolveLocale(h.get('x-lang') ?? '');
  const palette = THEME_PALETTE[theme] ?? THEME_PALETTE.standard;

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <CameleonThemeStyle source={palette} />
      </head>
      <body data-theme={theme} data-currency={currency}>
        <CartProvider>{children}</CartProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
