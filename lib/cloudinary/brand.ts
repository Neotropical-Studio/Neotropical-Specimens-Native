// ============================================================================
// Identificadores y URLs de marca — constantes planas (strings) seguras para
// el build estático de Next/Vercel. Sin objetos anidados ambiguos ni env
// sin normalizar ("" / undefined → fallback real verificado en Cloudinary).
// ============================================================================
import { cloudinaryImageUrl } from './url';

function envId(key: string, fallback: string): string {
  const raw = process.env[key];
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

/** public_id reales (cuenta juufg4mn) — strings planos. */
export const BRAND_LOGO_ID: string = envId('NEXT_PUBLIC_CLOUDINARY_LOGO_ID', 'logo_ztmh8j');
export const BRAND_FAVICON_ID: string = envId('NEXT_PUBLIC_CLOUDINARY_FAVICON_ID', 'favicon-32x32_fbfnr6');
export const BRAND_APPLE_ICON_ID: string = envId('NEXT_PUBLIC_CLOUDINARY_APPLE_ICON_ID', 'apple-touch-icon_bwwwdv');
export const BRAND_FAVICON_ICO_ID: string = envId('NEXT_PUBLIC_CLOUDINARY_FAVICON_ICO_ID', 'favicon_x0rpym');
export const BRAND_GLOBE_ID: string = envId('NEXT_PUBLIC_CLOUDINARY_GLOBE_ID', 'Rotating_earth__large_vwcedm');

/** URLs absolutas precomputadas (f_auto,q_auto). Siempre string, nunca undefined. */
export const BRAND_LOGO_URL: string = cloudinaryImageUrl(BRAND_LOGO_ID, ['w_192', 'h_192', 'c_fit']) || '';
export const BRAND_GLOBE_URL: string = cloudinaryImageUrl(BRAND_GLOBE_ID, ['w_48', 'h_48', 'c_fill', 'g_center']) || '';
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
  return cloudinaryImageUrl(BRAND_LOGO_ID, parts) || '';
}

export function brandGlobeUrl(extra: string[] = []): string {
  const parts = Array.isArray(extra) && extra.length > 0 ? extra : ['w_48', 'h_48', 'c_fill', 'g_center'];
  return cloudinaryImageUrl(BRAND_GLOBE_ID, parts) || '';
}

export function brandFaviconUrl(extra: string[] = []): string {
  const parts = Array.isArray(extra) && extra.length > 0 ? extra : ['w_64', 'h_64', 'c_fit'];
  return cloudinaryImageUrl(BRAND_FAVICON_ID, parts) || '';
}

export function brandAppleIconUrl(extra: string[] = []): string {
  const parts = Array.isArray(extra) && extra.length > 0 ? extra : ['w_180', 'h_180', 'c_fit'];
  return cloudinaryImageUrl(BRAND_APPLE_ICON_ID, parts) || '';
}
