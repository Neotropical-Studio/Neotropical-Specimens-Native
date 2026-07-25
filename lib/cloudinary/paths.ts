// ============================================================================
// Convención de carpetas en Cloudinary: `{tipo-de-espécimen}/{región}/...`.
// El tipo de espécimen es una faceta física/museográfica (seco, esqueleto,
// planta) — independiente del `category` de merchandising (rubro comercial
// como "Mariposas"), que puede agrupar varios tipos bajo un mismo rubro.
// ============================================================================

export const SPECIMEN_KIND_FOLDERS = {
  dried_specimen: 'especimenes-secos',
  zoology_skeleton: 'esqueletos-zoologia',
  plant: 'plantas',
} as const;

export type SpecimenKind = keyof typeof SPECIMEN_KIND_FOLDERS;

export function specimenFolder(kind: SpecimenKind, regionCode: string): string {
  return `${SPECIMEN_KIND_FOLDERS[kind]}/${regionCode.toLowerCase()}`;
}

// No fuerza el nombre de archivo (eso queda libre, como ya ocurre en
// supabase/seed.sql): sólo exige que el recurso viva bajo la carpeta que le
// corresponde por tipo + región, para no servir media de otro rubro/región.
export function isWithinSpecimenFolder(
  cloudinaryId: string,
  kind: SpecimenKind,
  regionCode: string,
): boolean {
  return cloudinaryId.startsWith(`${specimenFolder(kind, regionCode)}/`);
}
