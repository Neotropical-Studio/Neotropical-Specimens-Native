import {
  GEO_EDGE_CONFIG,
  DEFAULT_PROFILE,
  COUNTRY_TO_PROFILE,
  GEO_HEADERS,
  type GeoProfile,
} from './config';

export interface ResolvedGeo {
  country: string | null;
  profileKey: string;
  profile: GeoProfile;
  fallbackChain: string[];
}

// Extrae el país desde las cabeceras conocidas (borde/anycast).
export function detectCountry(headers: Headers): string | null {
  for (const key of GEO_HEADERS) {
    const value = headers.get(key);
    if (value && value !== 'XX') return value.toUpperCase();
  }
  return null;
}

// Resuelve el perfil geo aplicando la cadena de fallback:
// target_locale (país detectado) → zh-CN → en-US.
// `knownCountry` permite inyectar un país ya resuelto (p. ej. por IP en el
// middleware) para no repetir la detección.
export function resolveGeo(
  headers: Headers,
  forcedLocale?: string | null,
  knownCountry?: string | null,
): ResolvedGeo {
  const country = knownCountry ?? detectCountry(headers);
  const chain = GEO_EDGE_CONFIG.geolocation_routing.fallback_chain;

  const target =
    forcedLocale ??
    (country ? COUNTRY_TO_PROFILE[country] : undefined);

  const candidates = [
    target,
    ...chain.map((c) => (c === 'target_locale' ? target : c)),
  ].filter(Boolean) as string[];

  for (const key of candidates) {
    const profile = GEO_EDGE_CONFIG.profiles[key];
    if (profile) {
      return { country, profileKey: key, profile, fallbackChain: candidates };
    }
  }

  return {
    country,
    profileKey: DEFAULT_PROFILE.locale,
    profile: DEFAULT_PROFILE,
    fallbackChain: candidates,
  };
}

// Mapea el tema del perfil geo a la paleta camaleónica (variables CSS).
export const THEME_PALETTE: Record<string, { primary: string; accent: string; surface: string }> = {
  minimal_speed_optimized: { primary: '#e60012', accent: '#ffcc00', surface: '#0a0a0a' },
  collector_luxury: { primary: '#b8860b', accent: '#7b1113', surface: '#141014' },
  dynamic_seoul: { primary: '#3182f6', accent: '#00d2ff', surface: '#0b0f1a' },
  standard: { primary: '#0f766e', accent: '#f59e0b', surface: '#0b0f0e' },
};
