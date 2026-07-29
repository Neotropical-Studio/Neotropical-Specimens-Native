// ============================================================================
// Logotipos institucionales oficiales — public_id REALES en Cloudinary
// (carpeta LOGOS/.../LOGOS DE LOS PERMISO COMO SERFOR , VUCE, CITES , SENASA).
// Nótese el typo literal del asset SERFOR: `COode_SERFOR_yqgswm` (doble O).
// ============================================================================
import { cloudinaryImageUrl } from './url';

export type PermitCode = 'CITES' | 'VUCE' | 'SENASA' | 'SERFOR';

/** public_id exactos verificados (HTTP 200) en la cuenta juufg4mn. */
export const PERMIT_CLOUDINARY_IDS: Record<PermitCode, string> = {
  CITES: process.env.NEXT_PUBLIC_CLOUDINARY_PERMIT_CITES || 'Code_CITES_ht5gyv',
  SERFOR: process.env.NEXT_PUBLIC_CLOUDINARY_PERMIT_SERFOR || 'COode_SERFOR_yqgswm',
  VUCE: process.env.NEXT_PUBLIC_CLOUDINARY_PERMIT_VUCE || 'Code_VUCE_vzlhha',
  SENASA: process.env.NEXT_PUBLIC_CLOUDINARY_PERMIT_SENASA || 'Code_SENASA_gi5qfd',
};

/** URL optimizada: f_auto + q_auto + w_150. */
export function permitLogoUrl(code: PermitCode): string {
  const id = PERMIT_CLOUDINARY_IDS[code];
  if (!id) return '';
  return cloudinaryImageUrl(id, ['w_150', 'c_fit']);
}

export const PERMIT_ORDER: PermitCode[] = ['CITES', 'VUCE', 'SENASA', 'SERFOR'];
