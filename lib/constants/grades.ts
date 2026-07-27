// ============================================================================
// Lista fija de grados de calidad para el selector del panel admin. Tomada de
// los valores ya vistos en supabase/seed.sql y sanity/schemas/specimen.ts
// ("A1, A1/A1-, A1-, VGA2, A2…") — confirmar la lista canónica completa con el
// negocio antes de tratarla como definitiva.
//
// `code` se guarda tal cual en attributes.grade_code (sin puntos, como ya está
// almacenado hoy); `label` es sólo de presentación ("A.1", como en el pedido
// original) — no se introduce un segundo formato de almacenamiento.
// ============================================================================

export interface GradeOption {
  code: string;
  label: string;
  name: string;
}

export const GRADE_OPTIONS: GradeOption[] = [
  { code: 'A1', label: 'A.1', name: 'A1 (Perfecto)' },
  { code: 'A1-', label: 'A.1-', name: 'A1- (Casi perfecto)' },
  { code: 'VGA1', label: 'VG A.1', name: 'Very Good A1' },
  { code: 'A2', label: 'A.2', name: 'A2 (Bueno)' },
  { code: 'VGA2', label: 'VG A.2', name: 'Very Good A2' },
];
