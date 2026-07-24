import { NextRequest, NextResponse } from 'next/server';
import { GEO_EDGE_CONFIG } from '@/lib/geo/config';
import { resolveGeo } from '@/lib/geo/resolve';

// Motor geo-edge: auto-switch de perfil por país + cadena de fallback.
// Se ejecuta en el borde antes de renderizar; propaga el perfil vía cookies/headers.
export function middleware(req: NextRequest) {
  if (GEO_EDGE_CONFIG.engine_status !== 'active' || !GEO_EDGE_CONFIG.geolocation_routing.auto_switch) {
    return NextResponse.next();
  }

  // Preferencia explícita del usuario (cookie) por encima de la geo.
  const forced = req.cookies.get('locale')?.value ?? null;
  const { country, profileKey, profile } = resolveGeo(req.headers, forced);

  const res = NextResponse.next();
  res.headers.set('x-geo-country', country ?? 'XX');
  res.headers.set('x-geo-profile', profileKey);
  res.headers.set('x-locale', profile.locale);
  res.headers.set('x-currency', profile.currency);
  res.headers.set('x-ui-theme', profile.ui_overrides.theme);

  // Persistir el perfil resuelto (1 año) si no había preferencia previa.
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
