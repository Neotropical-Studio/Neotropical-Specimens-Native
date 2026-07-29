// ============================================================================
// Logotipos institucionales oficiales de la barra de permisos.
// Se sirven SIEMPRE desde Cloudinary (nunca SVG inventados ni íconos Lucide
// que aparenten ser la marca). Los public_id por defecto viven bajo la
// carpeta `permisos/` — súbelos como PNG/WebP con fondo transparente:
//   permisos/cites | permisos/vuce | permisos/serfor | permisos/senasa
// Cada uno se puede sobreescribir con NEXT_PUBLIC_CLOUDINARY_PERMIT_<CODE>
// (public_id o URL https completa) sin tocar código.
// ============================================================================
import { cloudinaryImageUrl } from './url';

export type PermitCode = 'CITES' | 'VUCE' | 'SENASA' | 'SERFOR';

/** public_id canónicos en Cloudinary (carpeta `permisos/`). */
export const PERMIT_CLOUDINARY_IDS: Record<PermitCode, string> = {
  CITES: process.env.NEXT_PUBLIC_CLOUDINARY_PERMIT_CITES || 'permisos/cites',
  VUCE: process.env.NEXT_PUBLIC_CLOUDINARY_PERMIT_VUCE || 'permisos/vuce',
  SENASA: process.env.NEXT_PUBLIC_CLOUDINARY_PERMIT_SENASA || 'permisos/senasa',
  SERFOR: process.env.NEXT_PUBLIC_CLOUDINARY_PERMIT_SERFOR || 'permisos/serfor',
};

/** URL optimizada: f_auto + q_auto + w_150 (adaptable a la barra sin perder nitidez). */
export function permitLogoUrl(code: PermitCode): string {
  const id = PERMIT_CLOUDINARY_IDS[code];
  if (!id) return '';
  // cloudinaryImageUrl ya antepone f_auto,q_auto; añadimos el ancho pedido.
  return cloudinaryImageUrl(id, ['w_150', 'c_fit']);
}

export const PERMIT_ORDER: PermitCode[] = ['CITES', 'VUCE', 'SENASA', 'SERFOR'];
