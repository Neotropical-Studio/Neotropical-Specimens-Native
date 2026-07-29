// ============================================================================
// Identificadores y URLs de marca — constantes planas (strings) seguras para
// el build estático de Next/Vercel. Sin objetos anidados ambiguos ni env
// sin normalizar ("" / undefined → fallback real verificado en Cloudinary).
//
// public_ids verificados (HTTP 200 en juufg4mn). Los alias antiguos
// `neotropical-logo` / `neotropical-globe` NO existen en Cloudinary (404).
// ============================================================================
import { cloudinaryImageUrl } from './url';

/** Fallbacks reales verificados en Cloudinary (cuenta juufg4mn). */
const VERIFIED_LOGO_ID = 'logo_ztmh8j';
const VERIFIED_GLOBE_ID = 'Rotating_earth__large_vwcedm';
const VERIFIED_FAVICON_ID = 'favicon-32x32_fbfnr6';
const VERIFIED_APPLE_ICON_ID = 'apple-touch-icon_bwwwdv';
const VERIFIED_FAVICON_ICO_ID = 'favicon_x0rpym';

/** public_ids obsoletos que aún pueden vivir en .env y provocan 404. */
const OBSOLETE_BRAND_IDS = new Set([
  'neotropical-logo',
  'neotropical-globe',
  'neotropical_logo',
  'neotropical_globe',
]);

function envId(key: string, fallback: string): string {
  const raw = process.env[key];
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return fallback;
  if (OBSOLETE_BRAND_IDS.has(trimmed)) return fallback;
  return trimmed;
}

/** public_id reales (cuenta juufg4mn) — strings planos. */
export const BRAND_LOGO_ID: string = envId('NEXT_PUBLIC_CLOUDINARY_LOGO_ID', VERIFIED_LOGO_ID);
export const BRAND_FAVICON_ID: string = envId('NEXT_PUBLIC_CLOUDINARY_FAVICON_ID', VERIFIED_FAVICON_ID);
export const BRAND_APPLE_ICON_ID: string = envId('NEXT_PUBLIC_CLOUDINARY_APPLE_ICON_ID', VERIFIED_APPLE_ICON_ID);
export const BRAND_FAVICON_ICO_ID: string = envId('NEXT_PUBLIC_CLOUDINARY_FAVICON_ICO_ID', VERIFIED_FAVICON_ICO_ID);
export const BRAND_GLOBE_ID: string = envId('NEXT_PUBLIC_CLOUDINARY_GLOBE_ID', VERIFIED_GLOBE_ID);

/** URLs absolutas precomputadas (f_auto,q_auto). Siempre string, nunca undefined. */
export const BRAND_LOGO_URL: string =
  cloudinaryImageUrl(BRAND_LOGO_ID, ['w_192', 'h_192', 'c_fit']) ||
  cloudinaryImageUrl(VERIFIED_LOGO_ID, ['w_192', 'h_192', 'c_fit']) ||
  '';
export const BRAND_GLOBE_URL: string =
  cloudinaryImageUrl(BRAND_GLOBE_ID, ['w_48', 'h_48', 'c_fill', 'g_center']) ||
  cloudinaryImageUrl(VERIFIED_GLOBE_ID, ['w_48', 'h_48', 'c_fill', 'g_center']) ||
  '';
export const BRAND_FAVICON_URL: string = cloudinaryImageUrl(BRAND_FAVICON_ID, ['w_64', 'h_64', 'c_fit']) || '';
export const BRAND_APPLE_ICON_URL: string = cloudinaryImageUrl(BRAND_APPLE_ICON_ID, ['w_180', 'h_180', 'c_fit']) || '';
export const BRAND_FAVICON_ICO_URL: string = cloudinaryImageUrl(BRAND_FAVICON_ICO_ID, ['w_32', 'h_32', 'c_fit']) || '';

/** @deprecated Preferir constantes planas BRAND_*_ID / BRAND_*_URL. */
export const BRAND_CLOUDINARY = {
  logo: BRAND_LOGO_ID,
  favicon: BRAND_FAVICON_ID,
  appleIcon: BRAND_APPLE_ICON_ID,
  faviconIco: BRAND_FAVICON_ICO_ID,
  globe: BRAND_GLOBE_ID,
};

export function brandLogoUrl(extra: string[] = []): string {
  const parts = Array.isArray(extra) && extra.length > 0 ? extra : ['w_192', 'h_192', 'c_fit'];
  return cloudinaryImageUrl(BRAND_LOGO_ID, parts) || cloudinaryImageUrl(VERIFIED_LOGO_ID, parts) || '';
}

export function brandGlobeUrl(extra: string[] = []): string {
  // Preferir f_gif si el caller no fija formato: el asset es GIF animado.
  const parts =
    Array.isArray(extra) && extra.length > 0
      ? extra
      : ['f_gif', 'w_112', 'h_112', 'c_fill', 'g_center'];
  return cloudinaryImageUrl(BRAND_GLOBE_ID, parts) || cloudinaryImageUrl(VERIFIED_GLOBE_ID, parts) || '';
}

export function brandFaviconUrl(extra: string[] = []): string {
  const parts = Array.isArray(extra) && extra.length > 0 ? extra : ['w_64', 'h_64', 'c_fit'];
  return cloudinaryImageUrl(BRAND_FAVICON_ID, parts) || '';
}

export function brandAppleIconUrl(extra: string[] = []): string {
  const parts = Array.isArray(extra) && extra.length > 0 ? extra : ['w_180', 'h_180', 'c_fit'];
  return cloudinaryImageUrl(BRAND_APPLE_ICON_ID, parts) || '';
}
