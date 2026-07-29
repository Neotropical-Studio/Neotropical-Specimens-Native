// ============================================================================
// Logotipos institucionales — public_id reales como strings planos.
// SERFOR usa el typo literal del asset en Cloudinary: `COode_SERFOR_yqgswm`.
// ============================================================================
import { cloudinaryImageUrl } from './url';

export type PermitCode = 'CITES' | 'VUCE' | 'SENASA' | 'SERFOR';

/**
 * Sellos institucionales en UI.
 * - CITES: diccionario / tratado de comercio internacional (NO es tarifa).
 * - SERFOR / SENASA: permisos nacionales con costo en checkout.
 * - VUCE: ventanilla única (trámite, no fee de catálogo).
 */

function envId(key: string, fallback: string): string {
  const raw = process.env[key];
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export const PERMIT_CITES_ID: string = envId('NEXT_PUBLIC_CLOUDINARY_PERMIT_CITES', 'Code_CITES_ht5gyv');
export const PERMIT_SERFOR_ID: string = envId('NEXT_PUBLIC_CLOUDINARY_PERMIT_SERFOR', 'COode_SERFOR_yqgswm');
export const PERMIT_VUCE_ID: string = envId('NEXT_PUBLIC_CLOUDINARY_PERMIT_VUCE', 'Code_VUCE_vzlhha');
export const PERMIT_SENASA_ID: string = envId('NEXT_PUBLIC_CLOUDINARY_PERMIT_SENASA', 'Code_SENASA_gi5qfd');

/** Mapa plano código → public_id (siempre string). */
export const PERMIT_CLOUDINARY_IDS: Record<PermitCode, string> = {
  CITES: PERMIT_CITES_ID,
  SERFOR: PERMIT_SERFOR_ID,
  VUCE: PERMIT_VUCE_ID,
  SENASA: PERMIT_SENASA_ID,
};

/** Orden fijo de la barra — arreglo constante, nunca undefined. */
export const PERMIT_ORDER: PermitCode[] = ['CITES', 'VUCE', 'SENASA', 'SERFOR'];

/** URL optimizada: f_auto + q_auto + w_150. Siempre string ("" si falta id). */
export function permitLogoUrl(code: PermitCode): string {
  const id = PERMIT_CLOUDINARY_IDS[code] ?? '';
  if (typeof id !== 'string' || id.length === 0) return '';
  return cloudinaryImageUrl(id, ['w_150', 'c_fit']) || '';
}
