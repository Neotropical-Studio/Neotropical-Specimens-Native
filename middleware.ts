import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { GEO_EDGE_CONFIG } from '@/lib/geo/config';
import { resolveGeo, detectCountry } from '@/lib/geo/resolve';
import { langForCountry } from '@/lib/geo/countries';
import { countryFromIp, isGeoIpConfigured } from '@/lib/geo/ip';

// BCP-47 sintáctico (no valida contra el set habilitado de Sanity: eso lo hace
// el layout de /[lang] con resolveLang). Mantiene el middleware barato.
const BCP47 = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
const DEFAULT_LANG = process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? 'en';

// Primeros segmentos que NUNCA llevan idioma: APIs, la página de reserva que
// precachea el service worker (URL única), el Studio embebido, el panel
// admin y el catálogo de prueba fuera de /[lang]. OJO: cualquier ruta nueva
// de 2–3 letras a nivel raíz debe añadirse aquí, o el borde la confundirá
// con un código de idioma (ej: /faq).
const RESERVED = new Set(['api', 'offline', '_next', 'icons', 'studio', 'admin', 'catalogue']);

// Verificación barata de sesión para /admin/*: sólo confirma que existe un
// usuario de Supabase Auth (clave anon, apta para el borde). La verificación
// autoritativa — ¿es un admin_users activo? — vive en app/admin/layout.tsx y
// en cada Server Action (requireAdmin en lib/auth/admin.ts), que sí pueden
// usar la clave service_role. No confiar sólo en este chequeo de borde.
async function checkAdminSession(req: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }

  return response;
}

// Accept-Language ordenado por calidad: 'es-PE,es;q=0.9,en;q=0.7' → [es-PE,es,en].
// Respetar el peso q importa: el primer tag no siempre es el preferido.
function acceptLanguages(accept: string | null): string[] {
  if (!accept) return [];
  return accept
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.find((p) => p.trim().startsWith('q='));
      const weight = q ? Number.parseFloat(q.trim().slice(2)) : 1;
      return { tag: tag.trim(), q: Number.isFinite(weight) ? weight : 0 };
    })
    .filter((l) => l.tag && l.tag !== '*' && l.q > 0 && BCP47.test(l.tag))
    .sort((a, b) => b.q - a.q)
    .map((l) => l.tag);
}

// Idioma destino de la redirección: cookie → geo (país) → Accept-Language →
// default. Puede devolver un idioma NO habilitado; el layout de /[lang] lo
// normaliza contra el set de Sanity (aquí no se puede consultar el CMS barato).
function redirectLang(req: NextRequest, country: string | null): string {
  const cookie = req.cookies.get('NEXT_LOCALE')?.value ?? null;
  return (
    (cookie && BCP47.test(cookie) && cookie) ||
    langForCountry(country) ||
    acceptLanguages(req.headers.get('accept-language'))[0] ||
    DEFAULT_LANG
  );
}

// Motor geo-edge + enrutado i18n por ruta (/[lang]/…). Se ejecuta en el borde
// antes de renderizar; propaga el perfil vía cookies/headers.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /admin/* nunca pasa por geo/i18n: es un panel interno, no parte del
  // storefront multilenguaje. La página de login queda fuera del chequeo de
  // sesión (si no, nadie podría llegar a ella para autenticarse).
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (pathname === '/admin/login') return NextResponse.next();
    return checkAdminSession(req);
  }

  // Preferencia explícita del usuario (cookie) por encima de la geo.
  const forced = req.cookies.get('locale')?.value ?? null;
  const cookieLang = req.cookies.get('NEXT_LOCALE')?.value ?? null;

  // El motor geo sólo gobierna el auto-switch por país: con el motor en pausa
  // se sigue enrutando i18n (cookie → Accept-Language → default), porque todas
  // las páginas viven bajo /[lang]/ y sin segmento no habría nada que servir.
  const engineOn =
    GEO_EDGE_CONFIG.engine_status === 'active' &&
    GEO_EDGE_CONFIG.geolocation_routing.auto_switch;

  // --- Detección de país -----------------------------------------------------
  // 1) Cabecera del borde (Cloudflare/Vercel/nginx GeoIP): gratis e inmediata.
  // 2) Si no hay, consulta por IP (sólo si está configurada y aporta algo).
  // La consulta se evita cuando el visitante ya tiene idioma elegido en cookie
  // o cuando el motor está en pausa: en ambos casos el país no cambia la ruta.
  let country = detectCountry(req.headers);
  if (!country && engineOn && !cookieLang && isGeoIpConfigured()) {
    country = await countryFromIp(req.headers);
  }

  const { profileKey, profile } = resolveGeo(req.headers, forced, country);

  // --- Enrutado i18n: redirige a /[lang]/… si falta el segmento de idioma ----
  const firstSeg = pathname.split('/')[1] ?? '';
  const isFile = /\.[a-zA-Z0-9]+$/.test(pathname);
  const isReserved = RESERVED.has(firstSeg);
  const hasLocaleSeg = !isReserved && BCP47.test(firstSeg);

  if (!isFile && !isReserved && !hasLocaleSeg) {
    const lang = redirectLang(req, engineOn ? country : null);
    const url = req.nextUrl.clone();
    url.pathname = `/${lang}${pathname === '/' ? '' : pathname}`;
    const redirect = NextResponse.redirect(url, 307);
    redirect.cookies.set('NEXT_LOCALE', lang, { path: '/', maxAge: 31536000, sameSite: 'lax' });
    if (!forced) {
      redirect.cookies.set('locale', profile.locale, { path: '/', maxAge: 31536000, sameSite: 'lax' });
      redirect.cookies.set('currency', profile.currency, { path: '/', maxAge: 31536000, sameSite: 'lax' });
    }
    return redirect;
  }

  // --- Propagación de perfil geo + contexto de ruta --------------------------
  const res = NextResponse.next();
  res.headers.set('x-geo-country', country ?? 'XX');
  res.headers.set('x-geo-profile', profileKey);
  res.headers.set('x-locale', profile.locale);
  res.headers.set('x-currency', profile.currency);
  res.headers.set('x-ui-theme', profile.ui_overrides.theme);

  // El layout raíz no recibe params: le pasamos el idioma de ruta y la ruta
  // completa por cabecera (para <html lang/dir>, canonical y hreflang).
  res.headers.set('x-lang', hasLocaleSeg ? firstSeg : '');
  res.headers.set('x-pathname', pathname);

  // El idioma de ruta (si existe) manda sobre la cookie de idioma.
  if (hasLocaleSeg) {
    res.cookies.set('NEXT_LOCALE', firstSeg, { path: '/', maxAge: 31536000, sameSite: 'lax' });
  }
  if (!forced) {
    res.cookies.set('locale', profile.locale, { path: '/', maxAge: 31536000, sameSite: 'lax' });
    res.cookies.set('currency', profile.currency, { path: '/', maxAge: 31536000, sameSite: 'lax' });
  }

  return res;
}

export const config = {
  // Evita assets estáticos y el proxy de media (streaming) para no romper Range.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/media).*)'],
};
