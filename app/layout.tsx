import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import CameleonThemeStyle from '@/components/CameleonThemeStyle';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import { resolveLocale } from '@/lib/i18n/locales';
import { THEME_PALETTE } from '@/lib/geo/resolve';
import { cloudinaryImageUrl } from '@/lib/cloudinary/url';

// Base absoluta obligatoria para que canonical y hreflang de /[lang] salgan como
// URLs absolutas: Google ignora los hreflang relativos.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const faviconId = process.env.NEXT_PUBLIC_CLOUDINARY_FAVICON_ID || 'neotropical-favicon';
const faviconUrl = cloudinaryImageUrl(faviconId, ['w_64', 'h_64', 'c_scale']);
const appleIconUrl = cloudinaryImageUrl(faviconId, ['w_180', 'h_180', 'c_scale']);

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
    icon: faviconUrl,
    shortcut: faviconUrl,
    apple: appleIconUrl,
  },
};

export const viewport: Viewport = {
  themeColor: '#121212',
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
};

// El layout raíz no recibe params (también sirve /offline), así que toma el
// idioma de ruta de la cabecera x-lang que fija el middleware y lo normaliza
// contra el set habilitado en Sanity para emitir <html lang/dir> correctos.
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
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
