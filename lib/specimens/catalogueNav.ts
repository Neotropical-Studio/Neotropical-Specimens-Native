// ============================================================================
// Navegación del catálogo storefront:
//   RUBRO → REGIÓN → CATEGORÍA → FAMILIA → especies → ficha
//
// Cloudinary (Jul 2026): 3 rubros; bajo secos hay 5 REGION…; Neotropical
// tiene 5 categorías; Butterflies Diurne tiene 17 familias (Hesperidae /
// Heliconidae = spelling Cloudinary).
//
// Media de cada nodo: `{nodePath}/_card/*` + `{nodePath}/_video/*`
// (aliases `card`/`video`). No son taxones.
// ============================================================================

import {
  DRIED_SPECIMEN_CATEGORY_FOLDERS,
  DRIED_SPECIMEN_REGION_FOLDERS,
  EXPECTED_AFRICA_BUTTERFLY_FAMILIES,
  EXPECTED_AUSTRALASIAN_BUTTERFLY_FAMILIES,
  EXPECTED_EUROPE_BUTTERFLY_FAMILIES,
  EXPECTED_NEARCTIC_BUTTERFLY_FAMILIES,
  EXPECTED_NEOTROPICAL_BUTTERFLY_FAMILIES,
  EXPECTED_NEOTROPICAL_MOTHS_FAMILIES,
  EXPECTED_SHARED_INSECTS_FAMILIES,
  MOTHS_DISPLAY_LABEL,
  RARE_GYNAN_DISPLAY_LABEL,
  REGION_FOLDER,
  RUBRO_FOLDER,
  RUBROS_CHILD_FOLDERS,
  beetleFamiliesForRegion,
  butterflyFamiliesForRegion,
  insectFamiliesForRegion,
  isNodeMediaFolderName,
  mothFamiliesForRegion,
  rareGynanFamiliesForRegion,
} from '@/scripts/sync-cloudinary/roots';
import {
  isNodeMediaPublicId,
  pickNodeSlotMedia,
} from '@/lib/mirror/contract';
import {
  STOREFRONT_RUBROS,
  canonicalizeRubroId,
  detectRubro,
  type InventoryRubroId,
} from './rubros';
import type { SpecimenView } from './view';

/** Media de card / hero de un nivel del catálogo. */
export interface CatalogueNodeMedia {
  /** Cloudinary public_id o URL de cover/imagen. */
  coverPublicId: string | null;
  /** Versión CDN para bustear cache tras overwrite de cover. */
  coverVersion?: number | null;
  /** Cloudinary public_id o URL de video de entrada corto (opcional). */
  videoPublicId: string | null;
}

export interface CatalogueNavNode extends CatalogueNodeMedia {
  id: string;
  label: string;
  count: number;
}

export interface CatalogueBreadcrumb {
  label: string;
  href: string | null;
}

type DriedCategoryFolder = (typeof DRIED_SPECIMEN_CATEGORY_FOLDERS)[number];

function categoryMetaFromRoot(
  folder: DriedCategoryFolder,
  displayLabel?: string,
) {
  // Familias Butterflies / Beetles por REGION via *FamiliesForRegion(regionId).
  return {
    id: folder.id,
    label: displayLabel ?? folder.segment,
    segment: folder.segment,
    aliases: folder.aliases,
    rubroId: 'dried-specimens' as InventoryRubroId,
    /** @deprecated Usar butterflyFamiliesForRegion / beetleFamiliesForRegion */
    expectedFamilies: [] as readonly string[],
  };
}

function isKnownButterflyFamily(family: string): boolean {
  const fam = family.trim();
  if (!fam) return false;
  const familyBase = fam.toLowerCase().replace(/\s+\d+$/, '');
  const pools = [
    ...EXPECTED_AFRICA_BUTTERFLY_FAMILIES,
    ...EXPECTED_AUSTRALASIAN_BUTTERFLY_FAMILIES,
    ...EXPECTED_NEOTROPICAL_BUTTERFLY_FAMILIES,
    ...EXPECTED_EUROPE_BUTTERFLY_FAMILIES,
    ...EXPECTED_NEARCTIC_BUTTERFLY_FAMILIES,
  ];
  return pools.some((f) => {
    const expected = f.toLowerCase();
    const expectedBase = expected.replace(/\s+\d+$/, '');
    return expected === fam.toLowerCase() || expectedBase === familyBase;
  });
}

function isKnownMothFamily(family: string): boolean {
  const fam = family.trim();
  if (!fam) return false;
  return EXPECTED_NEOTROPICAL_MOTHS_FAMILIES.some(
    (f) => f.toLowerCase() === fam.toLowerCase(),
  );
}

function isKnownInsectFamily(family: string): boolean {
  const fam = family.trim();
  if (!fam) return false;
  return EXPECTED_SHARED_INSECTS_FAMILIES.some(
    (f) => f.toLowerCase() === fam.toLowerCase(),
  );
}

function driedCategoryById(id: DriedCategoryFolder['id']): DriedCategoryFolder {
  const hit = DRIED_SPECIMEN_CATEGORY_FOLDERS.find((c) => c.id === id);
  if (!hit) throw new Error(`Categoría canónica no encontrada: ${id}`);
  return hit;
}

/**
 * Las 5 categorías canónicas bajo especímenes secos.
 * Orden: Butterflies Diurne → Nocturne → Beetles → Insects → Rare/Gynan.
 * Cada una → card + videoPublicId opcional → familias.
 */
export const CATALOGUE_CATEGORIES = [
  {
    ...categoryMetaFromRoot(
      driedCategoryById('butterflies-lepidoptera-diurne'),
      'Butterflies (Lepidoptera) Diurne',
    ),
    match: /butterflies.*diurne|diurne.*lepidoptera/i,
  },
  {
    ...categoryMetaFromRoot(
      driedCategoryById('moths-lepidoptera-nocturne'),
      MOTHS_DISPLAY_LABEL,
    ),
    match: /moths.*nocturn[ae]|nocturn[ae].*lepidoptera|butterflies\s*nocturne/i,
  },
  {
    ...categoryMetaFromRoot(
      driedCategoryById('beetles-coleoptera-insects'),
      'Beetles (Coleoptera)',
    ),
    match: /beetles.*coleoptera|coleoptera.*insects/i,
  },
  {
    ...categoryMetaFromRoot(
      driedCategoryById('insects-arthropoda'),
      'Insects (Arthropoda)',
    ),
    match: /insects?\s*\(arthropoda\)|insects-arthropoda/i,
  },
  {
    ...categoryMetaFromRoot(
      driedCategoryById('rare-gynan-aberrations'),
      RARE_GYNAN_DISPLAY_LABEL,
    ),
    match: /gynan|aberration|hybrid|freak/i,
  },
] as const;

export type CatalogueCategoryId = (typeof CATALOGUE_CATEGORIES)[number]['id'];

/**
 * Overrides opcionales de media de entrada por familia (slug).
 * Rellenar cuando existan public_ids de video/cover dedicados en Cloudinary.
 * Sin override: se toma el primer cover/video de especímenes del grupo.
 */
export const FAMILY_ENTRY_MEDIA: Record<
  string,
  Partial<CatalogueNodeMedia>
> = {
  // ej. satyridae: { videoPublicId: 'RUBROS/.../Satyridae/_intro', coverPublicId: '...' }
};

/** Overrides de video/cover por rubro id. */
export const RUBRO_ENTRY_MEDIA: Partial<
  Record<InventoryRubroId, Partial<CatalogueNodeMedia>>
> = {};

/** Overrides de video/cover por región id. */
export const REGION_ENTRY_MEDIA: Partial<
  Record<string, Partial<CatalogueNodeMedia>>
> = {};

/**
 * Overrides de video/cover por categoría id.
 * Preferencia real: assets en `{path}/_card` y `{path}/_video`.
 */
export const CATEGORY_ENTRY_MEDIA: Partial<
  Record<CatalogueCategoryId, Partial<CatalogueNodeMedia>>
> = {};

export function slugifyCatalogue(label: string): string {
  return label
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function findRubroById(id: string) {
  const canonical = canonicalizeRubroId(id) ?? id;
  return STOREFRONT_RUBROS.find((r) => r.id === canonical) ?? null;
}

export function findRegionById(id: string) {
  return (
    DRIED_SPECIMEN_REGION_FOLDERS.find(
      (r) => r.id === id || slugifyCatalogue(r.folder) === id,
    ) ?? null
  );
}

export function findRegionBySlugOrFolder(slugOrFolder: string) {
  const key = slugOrFolder.trim().toLowerCase();
  const stripped = key.replace(/^['"]+|['"]+$/g, '');
  return (
    DRIED_SPECIMEN_REGION_FOLDERS.find((r) => {
      if (r.id === key || r.id === stripped) return true;
      if (slugifyCatalogue(r.folder) === key || slugifyCatalogue(r.folder) === stripped)
        return true;
      if (r.folder.toLowerCase() === key || r.folder.toLowerCase() === stripped)
        return true;
      return r.aliases.some(
        (a) =>
          a.toLowerCase() === key ||
          a.toLowerCase() === stripped ||
          slugifyCatalogue(a) === key ||
          slugifyCatalogue(a) === stripped,
      );
    }) ?? null
  );
}

export function findCategoryById(id: string) {
  return CATALOGUE_CATEGORIES.find((c) => c.id === id) ?? null;
}

export function findCategoryBySlugOrLabel(slugOrLabel: string) {
  const key = slugOrLabel.trim().toLowerCase();
  const stripped = key.replace(/^['"]+|['"]+$/g, '');
  return (
    CATALOGUE_CATEGORIES.find((c) => {
      if (c.id === key || c.id === stripped) return true;
      if (slugifyCatalogue(c.label) === key || slugifyCatalogue(c.label) === stripped)
        return true;
      if (c.label.toLowerCase() === key || c.label.toLowerCase() === stripped)
        return true;
      if (
        slugifyCatalogue(c.segment) === key ||
        slugifyCatalogue(c.segment) === stripped
      )
        return true;
      if (c.match.test(slugOrLabel) || c.match.test(stripped)) return true;
      return c.aliases.some(
        (a) =>
          a.toLowerCase() === key ||
          a.toLowerCase() === stripped ||
          slugifyCatalogue(a) === key ||
          slugifyCatalogue(a) === stripped,
      );
    }) ?? null
  );
}

/** Extrae región/categoría/familia desde un public_id Cloudinary RUBROS/…. */
export function parseRubrosPath(publicId: string | null | undefined): {
  regionLabel: string | null;
  categoriaLabel: string | null;
  familiaLabel: string | null;
} {
  if (!publicId) return { regionLabel: null, categoriaLabel: null, familiaLabel: null };
  const parts = publicId.split('/').filter(Boolean);
  const rubrosIdx = parts.findIndex((p) => /^rubros$/i.test(p));
  if (rubrosIdx < 0) return { regionLabel: null, categoriaLabel: null, familiaLabel: null };

  // RUBROS / <rubroFolder> / <regionFolder> / <categoria> / <familia>/…
  const regionLabel = parts[rubrosIdx + 2] ?? null;
  const afterRegion = parts.slice(rubrosIdx + 3).filter((p) => !isNodeMediaFolderName(p));
  const categoriaLabel = afterRegion[0] ?? null;
  let familiaLabel: string | null = null;
  for (const seg of afterRegion.slice(1)) {
    if (/idae(\s|$|\d)/i.test(seg) || /[a-z]+idae$/i.test(seg.split(/\s+/)[0] ?? '')) {
      familiaLabel = seg;
      break;
    }
  }
  return { regionLabel, categoriaLabel, familiaLabel };
}

function collectInventoryPublicIds(specimens: SpecimenView[]): string[] {
  const out: string[] = [];
  for (const s of specimens) {
    if (s.primaryImage) out.push(s.primaryImage);
    if (s.secondaryImage) out.push(s.secondaryImage);
    if (s.video) out.push(s.video);
    for (const img of s.images ?? []) {
      if (img.publicId) out.push(img.publicId);
    }
  }
  return out;
}

function collectInventoryVersions(
  specimens: SpecimenView[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of specimens) {
    const v = s.mediaVersion;
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) continue;
    if (s.primaryImage) map.set(s.primaryImage, Math.floor(v));
    if (s.video) map.set(s.video, Math.floor(v));
    for (const img of s.images ?? []) {
      if (img.publicId) map.set(img.publicId, Math.floor(v));
    }
  }
  return map;
}

/** Media de entrada del nodo: primero `_card`/`_video` de ESE path; luego override; luego fallback. */
function resolveEntryMedia(
  nodePath: string,
  inventoryIds: string[],
  fallback: CatalogueNodeMedia,
  override?: Partial<CatalogueNodeMedia> | null,
  versions?: Map<string, number>,
): CatalogueNodeMedia {
  const fromSlots = pickNodeSlotMedia(nodePath, inventoryIds);
  const coverPublicId = fromSlots.coverPublicId ?? fallback.coverPublicId;
  const videoPublicId = fromSlots.videoPublicId ?? fallback.videoPublicId;
  const coverVersion =
    (coverPublicId && versions?.get(coverPublicId)) ||
    fallback.coverVersion ||
    null;
  return applyOverride(
    {
      coverPublicId,
      coverVersion,
      videoPublicId,
    },
    override,
  );
}

function rubroCloudPath(rubroId: InventoryRubroId): string {
  const folder =
    RUBROS_CHILD_FOLDERS.find((r) => r.id === rubroId)?.folder ?? RUBRO_FOLDER;
  return `RUBROS/${folder}`;
}

function regionCloudPath(rubroId: InventoryRubroId, regionFolder: string): string {
  return `${rubroCloudPath(rubroId)}/${regionFolder}`;
}

function categoryCloudPath(
  rubroId: InventoryRubroId,
  regionFolder: string,
  categorySegment: string,
): string {
  return `${regionCloudPath(rubroId, regionFolder)}/${categorySegment}`;
}

function familyCloudPath(
  rubroId: InventoryRubroId,
  regionFolder: string,
  categorySegment: string,
  familyLabel: string,
): string {
  return `${categoryCloudPath(rubroId, regionFolder, categorySegment)}/${familyLabel}`;
}

/** Códigos cortos / país → id de REGION geográfica Cloudinary. */
const REGION_SHORT_CODES: Record<string, string> = {
  neo: 'neotropical',
  neotropical: 'neotropical',
  pe: 'neotropical',
  peru: 'neotropical',
  perú: 'neotropical',
  afr: 'afrotropical',
  africa: 'afrotropical',
  afrotropical: 'afrotropical',
  aus: 'australasian-oriental',
  australasian: 'australasian-oriental',
  oriental: 'australasian-oriental',
  eur: 'holarctic-europe',
  europe: 'holarctic-europe',
  holarctic: 'holarctic-europe',
  nearctic: 'nearctic',
  na: 'nearctic',
  usa: 'nearctic',
};

function resolveRegionFromHint(
  hint: string | null | undefined,
): { id: string; label: string; folder: string } | null {
  if (!hint?.trim()) return null;
  const known = findRegionBySlugOrFolder(hint);
  if (known) return { id: known.id, label: known.folder, folder: known.folder };
  const short = REGION_SHORT_CODES[hint.trim().toLowerCase()];
  if (short) {
    const byId = findRegionById(short);
    if (byId) return { id: byId.id, label: byId.folder, folder: byId.folder };
  }
  return null;
}

function resolveRegion(
  s: SpecimenView,
): { id: string; label: string; folder: string } | null {
  const fromPath = parseRubrosPath(s.primaryImage).regionLabel;
  const fromPathResolved = resolveRegionFromHint(fromPath);
  if (fromPathResolved) return fromPathResolved;
  if (fromPath) {
    return { id: slugifyCatalogue(fromPath), label: fromPath, folder: fromPath };
  }

  // Flat columns / global_regions (PE, NEO, nombre de carpeta REGION…).
  const fromFlat =
    resolveRegionFromHint(s.regionCode) ??
    resolveRegionFromHint(s.regionName) ??
    resolveRegionFromHint(s.country);
  if (fromFlat) return fromFlat;

  // Default storefront: Neotropical si es dried-specimens sin path.
  if (canonicalizeRubroId(s.rubroId) === 'dried-specimens' || !s.rubroId) {
    const neo = findRegionById('neotropical');
    if (neo) return { id: neo.id, label: neo.folder, folder: neo.folder };
  }
  return null;
}

/** Región geográfica canónica del espécimen (admin + catálogo). */
export function resolveSpecimenRegion(s: SpecimenView) {
  return resolveRegion(s);
}

/** Categoría de merchandising del espécimen (admin + catálogo). */
export function resolveSpecimenCategoria(s: SpecimenView) {
  return resolveCategoria(s);
}

/** Etiqueta de familia del espécimen (admin + catálogo). */
export function resolveSpecimenFamiliaLabel(s: SpecimenView) {
  return resolveFamiliaLabel(s);
}

function resolveCategoria(
  s: SpecimenView,
): { id: string; label: string } | null {
  const flat = s.categoria?.trim() || null;
  if (flat) {
    const known = findCategoryBySlugOrLabel(flat) ?? findCategoryBySlugOrLabel(slugifyCatalogue(flat));
    if (known) return { id: known.id, label: known.label };
    return { id: slugifyCatalogue(flat), label: flat };
  }

  const fromPath = parseRubrosPath(s.primaryImage);
  if (fromPath.categoriaLabel) {
    const known = findCategoryBySlugOrLabel(fromPath.categoriaLabel);
    if (known) return { id: known.id, label: known.label };
    return {
      id: slugifyCatalogue(fromPath.categoriaLabel),
      label: fromPath.categoriaLabel,
    };
  }

  // Fallback: orden biológico + familia esperada → Insects / Nocturne / Diurne / Beetles
  if (s.rubroId === 'dried-specimens' || !s.rubroId) {
    const family = (s.family ?? '').trim();
    if (isKnownInsectFamily(family)) {
      const cat = findCategoryById('insects-arthropoda');
      if (cat) return { id: cat.id, label: cat.label };
    }
    if (isKnownMothFamily(family)) {
      const cat = findCategoryById('moths-lepidoptera-nocturne');
      if (cat) return { id: cat.id, label: cat.label };
    }
    if (isKnownButterflyFamily(family) || /lepidoptera/i.test(s.order ?? '')) {
      const cat = findCategoryById('butterflies-lepidoptera-diurne');
      if (cat) return { id: cat.id, label: cat.label };
    }
    if (/coleoptera/i.test(s.order ?? '')) {
      const cat = findCategoryById('beetles-coleoptera-insects');
      if (cat) return { id: cat.id, label: cat.label };
    }
  }

  return null;
}

function resolveFamiliaLabel(s: SpecimenView): string | null {
  const fromPath = parseRubrosPath(s.primaryImage).familiaLabel;
  if (fromPath) return fromPath;
  return s.family?.trim() || null;
}

function mergeMedia(
  current: CatalogueNodeMedia,
  cover: string | null | undefined,
  video: string | null | undefined,
): CatalogueNodeMedia {
  return {
    coverPublicId: current.coverPublicId ?? cover ?? null,
    coverVersion: current.coverVersion ?? null,
    videoPublicId: current.videoPublicId ?? video ?? null,
  };
}

function applyOverride(
  base: CatalogueNodeMedia,
  override?: Partial<CatalogueNodeMedia> | null,
): CatalogueNodeMedia {
  if (!override) return base;
  return {
    coverPublicId: override.coverPublicId ?? base.coverPublicId,
    coverVersion: override.coverVersion ?? base.coverVersion ?? null,
    videoPublicId: override.videoPublicId ?? base.videoPublicId,
  };
}

/** Agrupa inventario en cards de rubro (nivel 1).
 *  Siempre exactamente los 3 hijos de Cloudinary RUBROS/ (aunque count=0).
 *  Cover/video SOLO desde `{RUBROS/<folder>}/_card|_video` (+ override).
 *  Nunca fallback a fotos de especímenes fuera de ese path. */
export function buildRubroNodes(specimens: SpecimenView[]): CatalogueNavNode[] {
  const inventoryIds = collectInventoryPublicIds(specimens);
  const versions = collectInventoryVersions(specimens);
  const counts = new Map<InventoryRubroId, number>();
  for (const rubro of STOREFRONT_RUBROS) counts.set(rubro.id, 0);

  for (const s of specimens) {
    if (s.primaryImage && isNodeMediaPublicId(s.primaryImage)) continue;
    const detected = detectRubro({
      mediaHint: s.primaryImage,
      order: s.order,
      family: s.family,
      genus: s.genus,
      scientificName: s.scientificName,
    });
    const id = canonicalizeRubroId(s.rubroId) ?? detected.id;
    if (!counts.has(id)) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return STOREFRONT_RUBROS.map((r) => ({
    id: r.id,
    label: r.label,
    count: counts.get(r.id) ?? 0,
    ...resolveEntryMedia(
      rubroCloudPath(r.id),
      inventoryIds,
      { coverPublicId: null, videoPublicId: null },
      RUBRO_ENTRY_MEDIA[r.id],
      versions,
    ),
  }));
}

/**
 * Regiones dentro de un rubro (nivel 2).
 * dried-specimens: siempre las 5 REGION… (aunque count=0).
 * Otros rubros: vacío hasta que existan carpetas REGION en Cloudinary.
 */
export function buildRegionNodes(
  specimens: SpecimenView[],
  rubroId: InventoryRubroId,
): CatalogueNavNode[] {
  const inventoryIds = collectInventoryPublicIds(specimens);
  const versions = collectInventoryVersions(specimens);
  const known =
    rubroId === 'dried-specimens' ? [...DRIED_SPECIMEN_REGION_FOLDERS] : [];

  const buckets = new Map<string, CatalogueNavNode>();
  for (const region of known) {
    const path = regionCloudPath(rubroId, region.folder);
    buckets.set(region.id, {
      id: region.id,
      label: region.folder,
      count: 0,
      ...resolveEntryMedia(
        path,
        inventoryIds,
        { coverPublicId: null, videoPublicId: null },
        REGION_ENTRY_MEDIA[region.id],
      versions,
    ),
    });
  }

  const inRubro = specimens.filter((s) => {
    if (s.primaryImage && isNodeMediaPublicId(s.primaryImage)) return false;
    const id =
      canonicalizeRubroId(s.rubroId) ??
      detectRubro({
        mediaHint: s.primaryImage,
        order: s.order,
        family: s.family,
        genus: s.genus,
        scientificName: s.scientificName,
      }).id;
    return id === rubroId;
  });

  for (const s of inRubro) {
    const region = resolveRegion(s);
    if (!region) continue;
    const path = regionCloudPath(rubroId, region.folder);
    const existing = buckets.get(region.id) ?? {
      id: region.id,
      label: region.label,
      count: 0,
      coverPublicId: null as string | null,
      videoPublicId: null as string | null,
    };
    existing.count += 1;
    const merged = mergeMedia(existing, s.primaryImage, s.video);
    buckets.set(region.id, {
      ...existing,
      ...resolveEntryMedia(path, inventoryIds, merged, REGION_ENTRY_MEDIA[region.id],
      versions,
    ),
    });
  }

  if (known.length) {
    return known.map((r) => buckets.get(r.id)!);
  }
  return [...buckets.values()]
    .filter((n) => n.count > 0)
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Categorías dentro de rubro+región (nivel 3).
 *  dried-specimens × cualquiera de las 5 REGIONs: siempre las 5 cards canónicas.
 *  Otros rubros: categorías vistas en inventario (mismo patrón card+video).
 *  Cover/video SOLO desde `{region}/{categoria}/_card|_video` (+ override). */
export function buildCategoryNodes(
  specimens: SpecimenView[],
  rubroId: InventoryRubroId,
  regionId: string,
): CatalogueNavNode[] {
  const inventoryIds = collectInventoryPublicIds(specimens);
  const versions = collectInventoryVersions(specimens);
  const regionMeta = findRegionById(regionId) ?? findRegionBySlugOrFolder(regionId);
  const regionFolder = regionMeta?.folder ?? REGION_FOLDER;
  const resolvedRegionId = regionMeta?.id ?? regionId;
  // Rubro 1: mismas 5 categorías en Africa / Australasian / Neo / Europe / Nearctic.
  const forceCanonicalFive = rubroId === 'dried-specimens' && Boolean(regionMeta);

  const inScope = specimens.filter((s) => {
    if (s.primaryImage && isNodeMediaPublicId(s.primaryImage)) return false;
    const id =
      canonicalizeRubroId(s.rubroId) ??
      detectRubro({
        mediaHint: s.primaryImage,
        order: s.order,
        family: s.family,
        genus: s.genus,
        scientificName: s.scientificName,
      }).id;
    if (id !== rubroId) return false;
    const region = resolveRegion(s);
    return region?.id === resolvedRegionId;
  });

  const buckets = new Map<string, CatalogueNavNode>();
  const knownForScope = forceCanonicalFive
    ? CATALOGUE_CATEGORIES.filter((c) => c.rubroId === rubroId)
    : [];

  for (const known of knownForScope) {
    const path = categoryCloudPath(rubroId, regionFolder, known.segment);
    buckets.set(known.id, {
      id: known.id,
      label: known.label,
      count: 0,
      ...resolveEntryMedia(
        path,
        inventoryIds,
        { coverPublicId: null, videoPublicId: null },
        CATEGORY_ENTRY_MEDIA[known.id],
      versions,
    ),
    });
  }

  for (const s of inScope) {
    const cat = resolveCategoria(s);
    if (!cat) continue;
    const catMeta = findCategoryById(cat.id);
    const segment = catMeta?.segment ?? cat.label;
    const path = categoryCloudPath(rubroId, regionFolder, segment);
    const existing = buckets.get(cat.id) ?? {
      id: cat.id,
      label: cat.label,
      count: 0,
      coverPublicId: null as string | null,
      videoPublicId: null as string | null,
    };
    existing.count += 1;
    // Media solo desde slots _card/_video del path de categoría (no fotos de ejemplar).
    buckets.set(cat.id, {
      ...existing,
      ...resolveEntryMedia(
        path,
        inventoryIds,
        {
          coverPublicId: existing.coverPublicId,
          videoPublicId: existing.videoPublicId,
        },
        CATEGORY_ENTRY_MEDIA[cat.id as CatalogueCategoryId],
      versions,
    ),
    });
  }

  const knownIds = new Set<string>(knownForScope.map((c) => c.id));
  const knownNodes = knownForScope.map((c) => buckets.get(c.id)!);
  const extras = [...buckets.values()]
    .filter((n) => !knownIds.has(n.id) && n.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return [...knownNodes, ...extras];
}

/**
 * Familias dentro de categoría (nivel 4).
 * Butterflies: por REGION (Africa 5 / Neotropical 17).
 * Media: `{…/Familia}/_card|_video` — folder Cloudinary (no el label renombrado).
 */
export function buildFamilyNodes(
  specimens: SpecimenView[],
  rubroId: InventoryRubroId,
  regionId: string,
  categoryId: string,
  /** Labels o {label, folder} ordenados (meta/DB). Si omitido → EXPECTED_*. */
  familyLabelsOverride?: readonly (string | { label: string; folder: string })[] | null,
): CatalogueNavNode[] {
  const inventoryIds = collectInventoryPublicIds(specimens);
  const versions = collectInventoryVersions(specimens);
  const catMeta = findCategoryById(categoryId);
  const regionMeta = findRegionById(regionId) ?? findRegionBySlugOrFolder(regionId);
  const regionFolder = regionMeta?.folder ?? REGION_FOLDER;
  const resolvedRegionId = regionMeta?.id ?? regionId;
  const categorySegment = catMeta?.segment ?? categoryId;
  const expectedEntries: Array<{ label: string; folder: string }> =
    familyLabelsOverride && familyLabelsOverride.length > 0
      ? familyLabelsOverride.map((e) =>
          typeof e === 'string'
            ? { label: e, folder: e }
            : { label: e.label, folder: e.folder || e.label },
        )
      : (
          categoryId === 'butterflies-lepidoptera-diurne'
            ? butterflyFamiliesForRegion(resolvedRegionId)
            : categoryId === 'moths-lepidoptera-nocturne'
              ? mothFamiliesForRegion(resolvedRegionId)
              : categoryId === 'insects-arthropoda'
                ? insectFamiliesForRegion(resolvedRegionId)
                : categoryId === 'beetles-coleoptera-insects'
                  ? beetleFamiliesForRegion(resolvedRegionId)
                  : categoryId === 'rare-gynan-aberrations'
                    ? rareGynanFamiliesForRegion(resolvedRegionId)
                    : (catMeta?.expectedFamilies ?? [])
        ).map((label) => ({ label, folder: label }));

  const inScope = specimens.filter((s) => {
    if (s.primaryImage && isNodeMediaPublicId(s.primaryImage)) return false;
    const rid =
      canonicalizeRubroId(s.rubroId) ??
      detectRubro({
        mediaHint: s.primaryImage,
        order: s.order,
        family: s.family,
        genus: s.genus,
        scientificName: s.scientificName,
      }).id;
    if (rid !== rubroId) return false;
    const region = resolveRegion(s);
    if (region?.id !== resolvedRegionId) return false;
    const cat = resolveCategoria(s);
    return cat?.id === categoryId;
  });

  const buckets = new Map<string, CatalogueNavNode>();
  const expectedIds = new Set<string>();
  for (const fam of expectedEntries) {
    const id = slugifyCatalogue(fam.label);
    expectedIds.add(id);
    const path = familyCloudPath(rubroId, regionFolder, categorySegment, fam.folder);
    buckets.set(id, {
      id,
      label: fam.label,
      count: 0,
      ...resolveEntryMedia(
        path,
        inventoryIds,
        { coverPublicId: null, videoPublicId: null },
        FAMILY_ENTRY_MEDIA[id],
      versions,
    ),
    });
  }

  for (const s of inScope) {
    const familiaLabel = resolveFamiliaLabel(s);
    if (!familiaLabel) continue;
    const id = slugifyCatalogue(familiaLabel);
    const path = familyCloudPath(rubroId, regionFolder, categorySegment, familiaLabel);
    const existing = buckets.get(id) ?? {
      id,
      label: familiaLabel,
      count: 0,
      coverPublicId: null as string | null,
      videoPublicId: null as string | null,
    };
    existing.count += 1;
    if (familiaLabel.length > existing.label.length) existing.label = familiaLabel;
    // Media solo desde `{…/Familia}/_card|_video` (no fotos de ejemplar).
    buckets.set(id, {
      ...existing,
      ...resolveEntryMedia(
        path,
        inventoryIds,
        {
          coverPublicId: existing.coverPublicId,
          videoPublicId: existing.videoPublicId,
        },
        FAMILY_ENTRY_MEDIA[id],
      versions,
    ),
    });
  }

  const expectedNodes = expectedEntries.map(
    (fam) => buckets.get(slugifyCatalogue(fam.label))!,
  );
  const extras = [...buckets.values()]
    .filter((n) => !expectedIds.has(n.id) && n.count > 0)
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

  return [...expectedNodes, ...extras];
}

/** Comparación A→Z por nombre científico (catálogo de familia). */
export function compareSpecimensAlphabetical(
  a: SpecimenView,
  b: SpecimenView,
): number {
  const byName = a.scientificName.localeCompare(b.scientificName, undefined, {
    sensitivity: 'base',
    numeric: true,
  });
  if (byName !== 0) return byName;
  return a.code.localeCompare(b.code, undefined, {
    sensitivity: 'base',
    numeric: true,
  });
}

/** Especímenes de una familia (nivel 5 — grid de productos), orden alfabético. */
export function filterSpecimensByFamily(
  specimens: SpecimenView[],
  rubroId: InventoryRubroId,
  regionId: string,
  categoryId: string,
  familyId: string,
): SpecimenView[] {
  const target = familyId.trim().toLowerCase();
  if (!target) return [];
  const regionMeta = findRegionById(regionId) ?? findRegionBySlugOrFolder(regionId);

  return specimens
    .filter((s) => {
      if (s.primaryImage && isNodeMediaPublicId(s.primaryImage)) return false;
      const rid =
        canonicalizeRubroId(s.rubroId) ??
        detectRubro({
          mediaHint: s.primaryImage,
          order: s.order,
          family: s.family,
          genus: s.genus,
          scientificName: s.scientificName,
        }).id;
      if (rid !== rubroId) return false;
      const region = resolveRegion(s);
      if (region?.id !== (regionMeta?.id ?? regionId)) return false;
      const cat = resolveCategoria(s);
      if (cat?.id !== categoryId) return false;
      const familiaLabel = resolveFamiliaLabel(s);
      if (!familiaLabel) return false;
      return slugifyCatalogue(familiaLabel) === target;
    })
    .sort(compareSpecimensAlphabetical);
}

export function catalogueHref(
  lang: string,
  parts: { rubro?: string; region?: string; categoria?: string; familia?: string },
): string {
  const base = `/${lang}/catalogue`;
  if (!parts.rubro) return base;
  if (!parts.region) return `${base}/${parts.rubro}`;
  if (!parts.categoria) return `${base}/${parts.rubro}/${parts.region}`;
  if (!parts.familia) return `${base}/${parts.rubro}/${parts.region}/${parts.categoria}`;
  return `${base}/${parts.rubro}/${parts.region}/${parts.categoria}/${parts.familia}`;
}

/** Path Cloudinary del rubro (para _card/_video). */
export function rubroNodeCloudPath(rubroId: InventoryRubroId): string {
  return rubroCloudPath(rubroId);
}

export function rubroIntroHref(lang: string, rubroId: string): string {
  return catalogueHref(lang, { rubro: rubroId });
}

export function rubroRegionsHref(lang: string, rubroId: string): string {
  return `${catalogueHref(lang, { rubro: rubroId })}?view=regions`;
}

/** Región por defecto al entrar a categorías (Neotropical / principal). */
export const DEFAULT_CATALOGUE_REGION_ID = 'neotropical';

/** Tras el rubro: ir directo a categorías (luego familias/catálogos). */
export function rubroCategoriesHref(
  lang: string,
  rubroId: string,
  regionId: string = DEFAULT_CATALOGUE_REGION_ID,
): string {
  return regionCategoriesHref(lang, { rubro: rubroId, region: regionId });
}

/**
 * Click rubro:
 * - dried-specimens → intro (si hay video) o categorías (Neotropical)
 * - otros rubros → intro o regiones
 */
export function rubroEntryHref(
  lang: string,
  rubroId: string,
  hasVideo: boolean,
): string {
  if (rubroId === 'dried-specimens') {
    return hasVideo
      ? rubroIntroHref(lang, rubroId)
      : rubroCategoriesHref(lang, rubroId);
  }
  return hasVideo ? rubroIntroHref(lang, rubroId) : rubroRegionsHref(lang, rubroId);
}

export function regionIntroHref(
  lang: string,
  parts: { rubro: string; region: string },
): string {
  return catalogueHref(lang, parts);
}

export function regionCategoriesHref(
  lang: string,
  parts: { rubro: string; region: string },
): string {
  return `${catalogueHref(lang, parts)}?view=categories`;
}

/** Click región: ventana VIDEO de ingreso si hay; si no, directo a categorías. */
export function regionEntryHref(
  lang: string,
  parts: { rubro: string; region: string },
  hasVideo: boolean,
): string {
  return hasVideo ? regionIntroHref(lang, parts) : regionCategoriesHref(lang, parts);
}

export function categoryIntroHref(
  lang: string,
  parts: { rubro: string; region: string; categoria: string },
): string {
  return catalogueHref(lang, parts);
}

export function categoryFamiliesHref(
  lang: string,
  parts: { rubro: string; region: string; categoria: string },
): string {
  return `${catalogueHref(lang, parts)}?view=families`;
}

export function categoryEntryHref(
  lang: string,
  parts: { rubro: string; region: string; categoria: string },
  hasVideo: boolean,
): string {
  return hasVideo ? categoryIntroHref(lang, parts) : categoryFamiliesHref(lang, parts);
}

export function familyIntroHref(
  lang: string,
  parts: { rubro: string; region: string; categoria: string; familia: string },
): string {
  return catalogueHref(lang, parts);
}

export function familyCatalogHref(
  lang: string,
  parts: { rubro: string; region: string; categoria: string; familia: string },
): string {
  return `${catalogueHref(lang, parts)}?view=catalog`;
}

export function familyEntryHref(
  lang: string,
  parts: { rubro: string; region: string; categoria: string; familia: string },
  hasVideo: boolean,
): string {
  return hasVideo ? familyIntroHref(lang, parts) : familyCatalogHref(lang, parts);
}

/**
 * Rutas de vuelta al catálogo desde una ficha de espécimen
 * (familia Brassolidae, categoría Butterflies Diurne, etc.).
 */
export function resolveSpecimenCatalogueTrail(
  lang: string,
  specimen: {
    rubroId?: string | null;
    regionCode?: string | null;
    regionName?: string | null;
    categoria?: string | null;
    family?: string | null;
  },
): {
  familyHref: string | null;
  familyLabel: string | null;
  categoryHref: string | null;
  categoryLabel: string | null;
} | null {
  const rubroId = (specimen.rubroId ?? 'dried-specimens').trim();
  if (!findRubroById(rubroId)) return null;

  const regionRaw = (specimen.regionCode ?? specimen.regionName ?? 'neotropical').trim();
  const region =
    findRegionById(regionRaw) ??
    findRegionBySlugOrFolder(regionRaw) ??
    findRegionById('neotropical');
  if (!region) return null;

  const catRaw = (specimen.categoria ?? '').trim();
  const category =
    (catRaw
      ? findCategoryById(catRaw) ?? findCategoryBySlugOrLabel(catRaw)
      : null) ??
    findCategoryBySlugOrLabel('butterflies-lepidoptera-diurne');
  if (!category) return null;

  const familyLabel = (specimen.family ?? '').trim();
  const familyId = familyLabel ? slugifyCatalogue(familyLabel) : '';

  const parts = {
    rubro: rubroId,
    region: region.id,
    categoria: category.id,
  };

  return {
    categoryHref: categoryFamiliesHref(lang, parts),
    categoryLabel: category.label,
    familyHref: familyId
      ? familyCatalogHref(lang, { ...parts, familia: familyId })
      : null,
    familyLabel: familyLabel || null,
  };
}

export function buildBreadcrumbs(
  lang: string,
  t: (key: string, fallback: string) => string,
  parts: {
    rubro?: { id: string; label: string };
    region?: { id: string; label: string };
    categoria?: { id: string; label: string };
    familia?: { id: string; label: string };
  },
): CatalogueBreadcrumb[] {
  const crumbs: CatalogueBreadcrumb[] = [
    { label: t('nav.catalog', 'Catálogo'), href: catalogueHref(lang, {}) },
  ];
  if (parts.rubro) {
    crumbs.push({
      label: parts.rubro.label,
      href: parts.region
        ? rubroRegionsHref(lang, parts.rubro.id)
        : null,
    });
  }
  if (parts.rubro && parts.region) {
    crumbs.push({
      label: parts.region.label,
      href: parts.categoria
        ? regionCategoriesHref(lang, {
            rubro: parts.rubro.id,
            region: parts.region.id,
          })
        : null,
    });
  }
  if (parts.rubro && parts.region && parts.categoria) {
    crumbs.push({
      label: parts.categoria.label,
      // Desde familia: volver al grid de familias (?view=families), no al intro ni a especies.
      href: parts.familia
        ? categoryFamiliesHref(lang, {
            rubro: parts.rubro.id,
            region: parts.region.id,
            categoria: parts.categoria.id,
          })
        : null,
    });
  }
  if (parts.familia) {
    crumbs.push({ label: parts.familia.label, href: null });
  }
  return crumbs;
}

/** Hint de path Cloudinary canónico (único sitio para catálogo). Nunca crear fuera. */
export { MIRROR_CANONICAL_REGION_PATH as CLOUDINARY_CANONICAL_REGION_PATH } from '@/lib/mirror/contract';
export const CLOUDINARY_BROWSE_HINT = `RUBROS/${RUBRO_FOLDER}/${REGION_FOLDER}/…`;
