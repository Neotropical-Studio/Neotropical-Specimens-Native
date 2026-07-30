// ============================================================================
// Carpetas Cloudinary para uploads de especímenes.
// ÚNICO árbol permitido para catálogo: RUBROS → ESPECIMENS… → REGION…
// Nunca especimenes-secos/, _PENDING, CATALOGUE_*, ni raíz.
// ============================================================================

import {
  assertCanonicalUploadFolder,
  isCanonicalCataloguePublicId,
  MIRROR_CANONICAL_REGION_PATH,
  resolveCanonicalSpecimenFolder,
} from '@/lib/mirror/contract';

/**
 * @deprecated Los kinds legacy apuntaban a especimenes-secos / esqueletos / plantas.
 * Ya no se usan como destino de escritura; se mantienen solo para tipado de formularios.
 */
export const SPECIMEN_KIND_FOLDERS = {
  dried_specimen: MIRROR_CANONICAL_REGION_PATH,
  zoology_skeleton: MIRROR_CANONICAL_REGION_PATH,
  plant: MIRROR_CANONICAL_REGION_PATH,
} as const;

export type SpecimenKind = keyof typeof SPECIMEN_KIND_FOLDERS;

export type SpecimenFolderTaxonomy = {
  existingPublicId?: string | null;
  categoria?: string | null;
  familia?: string | null;
  genero?: string | null;
  orderName?: string | null;
};

/**
 * Destino de upload de espécimen: SOLO bajo REGION canónica.
 * Requiere taxonomía (categoría/familia) o un public_id canónico existente.
 * Lanza si no se puede resolver sin inventar carpetas basura.
 */
export function specimenFolder(
  _kind: SpecimenKind,
  _regionCode: string,
  taxonomy?: SpecimenFolderTaxonomy,
): string {
  const folder = resolveCanonicalSpecimenFolder(taxonomy ?? {});
  if (!folder) {
    throw new Error(
      `Upload bloqueado: falta categoría/familia en Supabase para ubicar el asset bajo ` +
        `«${MIRROR_CANONICAL_REGION_PATH}/…». Completá taxonomía primero; no se crea ` +
        `_PENDING ni especimenes-secos/neotropical.`,
    );
  }
  assertCanonicalUploadFolder(folder);
  return folder;
}

/** True solo si el public_id vive bajo el árbol canónico REGION…. */
export function isWithinSpecimenFolder(
  cloudinaryId: string,
  _kind?: SpecimenKind,
  _regionCode?: string,
): boolean {
  return isCanonicalCataloguePublicId(cloudinaryId);
}
