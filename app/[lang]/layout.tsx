// app/[lang]/layout.tsx
// Frontera de idioma de todas las rutas públicas. Hace dos cosas que el borde no
// puede hacer barato: normaliza el segmento contra el set habilitado en Sanity
// (el middleware sólo valida BCP-47 sintáctico) y publica canonical + hreflang.
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { resolveLocale, resolveLang } from '@/lib/i18n/locales';

// Ruta sin el segmento de idioma: '/es/product/7' → '/product/7'; '/es' → ''.
function stripLang(pathname: string): string {
  const rest = pathname.split('/').slice(2).join('/');
  return rest ? `/${rest}` : '';
}

async function routeRest(lang: string): Promise<string> {
  const h = await headers();
  return stripLang(h.get('x-pathname') ?? `/${lang}`);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const { locale, defaultLocale, locales } = await resolveLocale(lang);
  const rest = await routeRest(lang);

  // hreflang para cada idioma habilitado (escala con el set de Sanity, sin
  // tocar código) + x-default apuntando al idioma por defecto.
  const languages: Record<string, string> = {};
  for (const l of locales) languages[l.code] = `/${l.code}${rest}`;
  languages['x-default'] = `/${defaultLocale}${rest}`;

  return {
    alternates: { canonical: `/${locale}${rest}`, languages },
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const { isEnabled } = await resolveLocale(lang);

  // Idioma no habilitado (o segmento que sólo parecía un código): servimos una
  // única URL canónica por idioma en vez de duplicar contenido bajo /xx/.
  // El destino se renegocia con el país (detectado en el borde por cabecera o
  // por IP) y con TODO el Accept-Language, no se salta al default sin más.
  if (!isEnabled) {
    const [h, c] = [await headers(), await cookies()];
    const country = h.get('x-geo-country');
    const best = await resolveLang({
      cookie: c.get('NEXT_LOCALE')?.value ?? null,
      geoCountry: country && country !== 'XX' ? country : null,
      accept: h.get('accept-language'),
    });
    redirect(`/${best}${await routeRest(lang)}`);
  }

  return <>{children}</>;
}
