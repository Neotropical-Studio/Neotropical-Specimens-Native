// ============================================================================
// Identificadores reales de marca en Cloudinary (cuenta juufg4mn).
// Extraídos del Admin API / asset folders — NUNCA placeholders inventados.
//
// Carpetas de origen:
//   LOGOS/LOGOS SPECIEMENES SECOS BIOLOGICOS NO-CITES → logo_ztmh8j
//   FAVICON/FAVICON SPECIMENES SECOS… → favicon-32x32_fbfnr6, apple-touch-icon_bwwwdv
//   globo terraqueo global → Rotating_earth__large_vwcedm
//
// Override opcional vía NEXT_PUBLIC_CLOUDINARY_* sin tocar código.
// ============================================================================
import { cloudinaryImageUrl } from './url';

export const BRAND_CLOUDINARY = {
  /** Sello circular oficial (PNG). */
  logo: process.env.NEXT_PUBLIC_CLOUDINARY_LOGO_ID || 'logo_ztmh8j',
  /** Favicon principal 32×32. */
  favicon: process.env.NEXT_PUBLIC_CLOUDINARY_FAVICON_ID || 'favicon-32x32_fbfnr6',
  /** Apple touch icon. */
  appleIcon: process.env.NEXT_PUBLIC_CLOUDINARY_APPLE_ICON_ID || 'apple-touch-icon_bwwwdv',
  /** ICO clásico. */
  faviconIco: process.env.NEXT_PUBLIC_CLOUDINARY_FAVICON_ICO_ID || 'favicon_x0rpym',
  /** Globo terráqueo animado (GIF). */
  globe: process.env.NEXT_PUBLIC_CLOUDINARY_GLOBE_ID || 'Rotating_earth__large_vwcedm',
} as const;

export function brandLogoUrl(extra: string[] = ['w_192', 'h_192', 'c_fit']): string {
  return cloudinaryImageUrl(BRAND_CLOUDINARY.logo, extra);
}

export function brandGlobeUrl(extra: string[] = ['w_48', 'h_48', 'c_fill', 'g_center']): string {
  return cloudinaryImageUrl(BRAND_CLOUDINARY.globe, extra);
}

export function brandFaviconUrl(extra: string[] = ['w_64', 'h_64', 'c_fit']): string {
  return cloudinaryImageUrl(BRAND_CLOUDINARY.favicon, extra);
}

export function brandAppleIconUrl(extra: string[] = ['w_180', 'h_180', 'c_fit']): string {
  return cloudinaryImageUrl(BRAND_CLOUDINARY.appleIcon, extra);
}
