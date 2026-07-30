// ============================================================================
// Contrato industrial del espejo Cloudinary ↔ Supabase.
//
// REGLA DE ORO: nunca crear carpetas fuera del árbol entomológico canónico.
// Catálogo (fotos, cards, videos de intro) SOLO bajo REGION… (ver path abajo).
// Assets fuera de sitio → ORPHAN / reportar; no “arreglar” inventando carpetas.
// ============================================================================

import {
  AFRICA_BEETLES_ROOT,
  AFRICA_BUTTERFLIES_ROOT,
  AUSTRALASIAN_BEETLES_ROOT,
  AUSTRALASIAN_BUTTERFLIES_ROOT,
  DRIED_SPECIMEN_CATEGORY_FOLDERS,
  DRIED_SPECIMEN_REGION_FOLDERS,
  DRIED_SPECIMEN_REGION_ROOTS,
  EUROPE_BEETLES_ROOT,
  EUROPE_BUTTERFLIES_ROOT,
  EXPECTED_AFRICA_BEETLES_FAMILIES,
  EXPECTED_AFRICA_BUTTERFLY_FAMILIES,
  EXPECTED_AUSTRALASIAN_BEETLES_FAMILIES,
  EXPECTED_AUSTRALASIAN_BUTTERFLY_FAMILIES,
  EXPECTED_EUROPE_BEETLES_FAMILIES,
  EXPECTED_EUROPE_BUTTERFLY_FAMILIES,
  EXPECTED_NEARCTIC_BEETLES_FAMILIES,
  EXPECTED_NEARCTIC_BUTTERFLY_FAMILIES,
  EXPECTED_NEOTROPICAL_BEETLES_FAMILIES,
  EXPECTED_NEOTROPICAL_BUTTERFLY_FAMILIES,
  CURRENT_CATEGORY_FOCUS,
  EXPECTED_RARE_SUBFOLDERS,
  EXPECTED_SHARED_INSECTS_FAMILIES,
  EXPECTED_NEOTROPICAL_MOTHS_FAMILIES,
  INSECTS_REGION_ROOTS,
  RARE_GYNAN_REGION_ROOTS,
  NEARCTIC_BEETLES_ROOT,
  NEARCTIC_BUTTERFLIES_ROOT,
  NEOTROPICAL_BEETLES_ROOT,
  NEOTROPICAL_INSECTS_ROOT,
  NEOTROPICAL_MOTHS_ROOT,
  NODE_MEDIA_SLOT,
  NODE_MEDIA_SLOT_ALIASES,
  REGION_FOLDER,
  RUBRO_FOLDER,
  RUBROS_CHILD_FOLDERS,
  RUBROS_RUBRO_ROOT,
  driedSpecimenRegionRoot,
  isNodeMediaFolderName,
  nodeCardFolder,
  nodeVideoFolder,
} from '@/scripts/sync-cloudinary/roots';

export {
  NODE_MEDIA_SLOT,
  NODE_MEDIA_SLOT_ALIASES,
  isNodeMediaFolderName,
  nodeCardFolder,
  nodeVideoFolder,
};

/**
 * Path canónico storefront default (REGION Neotropical).
 * Mayúsculas y espacios importan (Admin API exacta).
 * Media de nodo: `{path}/_card/*` y `{path}/_video/*` (nunca taxones).
 * Catálogo válido = cualquiera de las 5 REGIONs bajo rubro 1 (ver PREFIXES).
 */
export const MIRROR_CANONICAL_REGION_PATH =
  `RUBROS/${RUBRO_FOLDER}/${REGION_FOLDER}` as const;

export const MIRROR_CANONICAL_BUTTERFLIES_PATH =
  `${MIRROR_CANONICAL_REGION_PATH}/Butterflies(lepidoptera) Diurne` as const;

/** Paths de media de ingreso de los 3 rubros (hub `/[lang]/catalogue`). */
export const MIRROR_RUBRO_NODE_MEDIA = RUBROS_CHILD_FOLDERS.map((r) => {
  const nodePath = `RUBROS/${r.folder}`;
  return {
    id: r.id,
    folder: r.folder,
    nodePath,
    cardFolder: nodeCardFolder(nodePath),
    videoFolder: nodeVideoFolder(nodePath),
  };
});

/**
 * Media de ingreso de las 5 REGIONs bajo rubro 1 (ESPECIMENS SECOS).
 * Cada una → `_card` + `_video`.
 */
export const MIRROR_REGION_NODE_MEDIA = DRIED_SPECIMEN_REGION_ROOTS.map((r) => ({
  id: r.id,
  folder: r.folder,
  nodePath: r.path,
  cardFolder: nodeCardFolder(r.path),
  videoFolder: nodeVideoFolder(r.path),
}));

/**
 * Categorías × las 5 REGIONs del rubro 1 (mismo patrón Neotropical).
 * Cada una → `_card` + `_video` SOLO bajo ese path.
 */
export const MIRROR_CATEGORY_NODE_MEDIA = DRIED_SPECIMEN_REGION_ROOTS.flatMap(
  (reg) =>
    DRIED_SPECIMEN_CATEGORY_FOLDERS.map((c) => {
      const nodePath = `${reg.path}/${c.segment}`;
      return {
        id: c.id,
        regionId: reg.id,
        regionFolder: reg.folder,
        segment: c.segment,
        nodePath,
        cardFolder: nodeCardFolder(nodePath),
        videoFolder: nodeVideoFolder(nodePath),
      };
    }),
);

/** Solo Neotropical (checklist corto / familias). */
export const MIRROR_NEOTROPICAL_CATEGORY_NODE_MEDIA =
  MIRROR_CATEGORY_NODE_MEDIA.filter((c) => c.regionId === 'neotropical');

/**
 * Beetles(Coleoptera) Insects × las 5 REGIONs (mismo segment en cada una).
 * Cada path → `_card` + `_video` (allowlist via listNodeMediaUploadTargets).
 * Familias: Africa 12 · Australasian 13 · Neotropical 13 · Europe 13 · Nearctic 13.
 */
export const MIRROR_BEETLES_CATEGORY_NODE_MEDIA =
  MIRROR_CATEGORY_NODE_MEDIA.filter((c) => c.id === 'beetles-coleoptera-insects');

/**
 * Insects(arthropoda) × las 5 REGIONs (mismo segment en cada una).
 * Cada path → `_card` + `_video`. Taxones: 10 compartidos (allowlist familia).
 */
export const MIRROR_INSECTS_CATEGORY_NODE_MEDIA =
  MIRROR_CATEGORY_NODE_MEDIA.filter((c) => c.id === 'insects-arthropoda');

/**
 * Moths(Lepidoptera) Nocturne × las 5 REGIONs (mismo segment en cada una).
 * Cada path → `_card` + `_video`. Familias: Neo 14; resto pendiente.
 */
export const MIRROR_MOTHS_CATEGORY_NODE_MEDIA =
  MIRROR_CATEGORY_NODE_MEDIA.filter((c) => c.id === 'moths-lepidoptera-nocturne');

/**
 * Butterflies(lepidoptera) Diurne × las 5 REGIONs (mismo segment en cada una).
 * Cada path → `_card` + `_video`. Familias: 5/5 REGIONs confirmadas.
 */
export const MIRROR_BUTTERFLIES_CATEGORY_NODE_MEDIA =
  MIRROR_CATEGORY_NODE_MEDIA.filter(
    (c) => c.id === 'butterflies-lepidoptera-diurne',
  );

/**
 * Rare -Gynan-Aberrations × las 5 REGIONs (mismo segment en cada una).
 * Cada path → `_card` + `_video`. Familias: placeholder (lista usuario).
 */
export const MIRROR_RARE_GYNAN_CATEGORY_NODE_MEDIA =
  MIRROR_CATEGORY_NODE_MEDIA.filter((c) => c.id === 'rare-gynan-aberrations');

/**
 * Foco actual (Rare-Gynan · Neotropical) — checklist corto.
 * Array #1 · avance usuario #5 · carpeta exacta: Rare -Gynan-Aberrations.
 */
export const MIRROR_CURRENT_CATEGORY_NODE_MEDIA =
  MIRROR_RARE_GYNAN_CATEGORY_NODE_MEDIA.find(
    (c) => c.regionId === CURRENT_CATEGORY_FOCUS.primaryRegionId,
  )!;

/** Path canónico Beetles · Neotropical. */
export const MIRROR_CANONICAL_BEETLES_PATH = NEOTROPICAL_BEETLES_ROOT;

/** Path canónico Insects · Neotropical. */
export const MIRROR_CANONICAL_INSECTS_PATH = NEOTROPICAL_INSECTS_ROOT;

/** Path canónico Moths Nocturne · Neotropical. */
export const MIRROR_CANONICAL_MOTHS_PATH = NEOTROPICAL_MOTHS_ROOT;

/** Ejemplos de checklist media (no crear fuera de estos paths). */
export const MIRROR_NODE_MEDIA_EXAMPLES = {
  driedSpecimensCard: MIRROR_RUBRO_NODE_MEDIA[0].cardFolder,
  driedSpecimensVideo: MIRROR_RUBRO_NODE_MEDIA[0].videoFolder,
  zoologySkeletonsCard: MIRROR_RUBRO_NODE_MEDIA[1].cardFolder,
  zoologySkeletonsVideo: MIRROR_RUBRO_NODE_MEDIA[1].videoFolder,
  dryPlantsCard: MIRROR_RUBRO_NODE_MEDIA[2].cardFolder,
  dryPlantsVideo: MIRROR_RUBRO_NODE_MEDIA[2].videoFolder,
  butterfliesCard: nodeCardFolder(MIRROR_CANONICAL_BUTTERFLIES_PATH),
  butterfliesVideo: nodeVideoFolder(MIRROR_CANONICAL_BUTTERFLIES_PATH),
  brassolidaeCard: nodeCardFolder(`${MIRROR_CANONICAL_BUTTERFLIES_PATH}/Brassolidae`),
  brassolidaeVideo: nodeVideoFolder(`${MIRROR_CANONICAL_BUTTERFLIES_PATH}/Brassolidae`),
} as const;

/**
 * ¿El public_id vive bajo un slot `_card` / `_video` (o alias) de algún nodo?
 * Esos assets alimentan cards/intros — no son especímenes.
 */
export function isNodeMediaPublicId(publicId: string): boolean {
  if (typeof publicId !== 'string' || !publicId) return false;
  const pid = publicId.replace(/^\/+|\/+$/g, '');
  const parts = pid.split('/');
  return parts.some((seg) => isNodeMediaFolderName(seg));
}

/**
 * Extrae cover/video de un inventario de public_ids para un path de nodo.
 * Solo mira `nodePath/_card|card/*` y `nodePath/_video|video/*`.
 */
export function pickNodeSlotMedia(
  nodePath: string,
  publicIds: readonly string[],
): { coverPublicId: string | null; videoPublicId: string | null } {
  const base = nodePath.replace(/\/+$/, '');
  const cardPrefixes = NODE_MEDIA_SLOT_ALIASES.card.map((s) => `${base}/${s}/`);
  const videoPrefixes = NODE_MEDIA_SLOT_ALIASES.video.map((s) => `${base}/${s}/`);

  let coverPublicId: string | null = null;
  let videoPublicId: string | null = null;

  for (const raw of publicIds) {
    const pid = extractPublicId(raw) ?? raw.replace(/^\/+|\/+$/g, '');
    if (!pid) continue;
    if (!coverPublicId && cardPrefixes.some((p) => pid.startsWith(p))) {
      coverPublicId = pid;
    }
    if (!videoPublicId && videoPrefixes.some((p) => pid.startsWith(p))) {
      videoPublicId = pid;
    }
    if (coverPublicId && videoPublicId) break;
  }

  return { coverPublicId, videoPublicId };
}

/** Checklist admin: ¿faltan slots de media en este path de nodo? */
export function nodeMediaChecklist(nodePath: string, publicIds: readonly string[]) {
  const { coverPublicId, videoPublicId } = pickNodeSlotMedia(nodePath, publicIds);
  return {
    nodePath: nodePath.replace(/\/+$/, ''),
    cardFolder: nodeCardFolder(nodePath),
    videoFolder: nodeVideoFolder(nodePath),
    hasCard: Boolean(coverPublicId),
    hasVideo: Boolean(videoPublicId),
    coverPublicId,
    videoPublicId,
    missing: [
      ...(!coverPublicId ? [NODE_MEDIA_SLOT.card] : []),
      ...(!videoPublicId ? [NODE_MEDIA_SLOT.video] : []),
    ] as Array<typeof NODE_MEDIA_SLOT.card | typeof NODE_MEDIA_SLOT.video>,
  };
}

/**
 * Prefijos que el espejo ESCANEA como inventario de catálogo (solo canónico).
 * Rubro 1 × las 5 REGIONs. No incluye CATALOGUE_* ni especimenes-secos ni raíz.
 */
export const MIRROR_CATALOGUE_PREFIXES = DRIED_SPECIMEN_REGION_ROOTS.map(
  (r) => r.path,
) as readonly string[];

/**
 * Prefijos legacy / basura: detectar y reportar como “fuera de lugar”.
 * Nunca escribir aquí (ni _PENDING, ni raíz, ni CATALOGUE suelto).
 */
export const MIRROR_MISPLACED_SCAN_PREFIXES = [
  'especimenes-secos',
  'CATALOGUE_Butterflies',
  'CATALOGUE',
  'CATALOGUE_Butterflies/_PENDING',
  '_PENDING',
] as const;

/** @deprecated No crear placeholders. Se mantiene solo para rechazar escrituras. */
export const MIRROR_PENDING_FOLDER = 'CATALOGUE_Butterflies/_PENDING';

export const MIRROR_TAGS = {
  mirrored: 'neo_mirrored',
  placeholder: 'neo_placeholder',
  pending: 'neo_pending',
  misplaced: 'neo_misplaced',
} as const;

export type MediaSyncStatus =
  | 'MIRRORED'
  | 'PENDING_UPLOAD'
  | 'PENDING_DB'
  | 'ORPHAN_CLOUD'
  | 'ORPHAN_DB'
  | 'ERROR';

export type SpecimenMirrorStatus = 'MIRRORED' | 'PENDING' | 'PLACEHOLDER' | 'ERROR';

export type PublicIdPlacement = 'canonical' | 'misplaced' | 'non_catalogue';

/** Extrae public_id desde URL Cloudinary o devuelve el string limpio. */
export function extractPublicId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  if (!s.includes('/upload/')) {
    return s.replace(/\.[a-z0-9]+$/i, '').replace(/^\/+/, '') || null;
  }
  const after = s.split('/upload/')[1] ?? '';
  const noVersion = after.replace(/^v\d+\//, '');
  const noExt = noVersion.replace(/\.[a-z0-9]+$/i, '');
  const cleaned = noExt.replace(/^\/+|\/+$/g, '');
  return cleaned || null;
}

/**
 * @deprecated Placeholders / _PENDING están bloqueados.
 * Lanza siempre — no hay public_id industrial fuera del árbol canónico.
 */
export function pendingPublicId(_specimenId: string): never {
  throw new Error(
    'Bloqueado: no se crean placeholders en _PENDING ni fuera de ' +
      MIRROR_CANONICAL_REGION_PATH,
  );
}

/** ¿Vive bajo rubro 1 × alguna REGION canónica? (único sitio válido para catálogo). */
export function isCanonicalCataloguePublicId(publicId: string): boolean {
  const pid = publicId.replace(/^\/+|\/+$/g, '');
  if (pid === RUBROS_RUBRO_ROOT || pid.startsWith(`${RUBROS_RUBRO_ROOT}/`)) {
    // Rubro root alone is ok for node media; specimen inventory under REGION…
    for (const reg of DRIED_SPECIMEN_REGION_ROOTS) {
      if (pid === reg.path || pid.startsWith(`${reg.path}/`)) return true;
    }
    // Also accept known REGION folder aliases (e.g. double-space Neotropical).
    for (const reg of DRIED_SPECIMEN_REGION_FOLDERS) {
      for (const alias of reg.aliases) {
        const aliasPath = driedSpecimenRegionRoot(alias);
        if (pid === aliasPath || pid.startsWith(`${aliasPath}/`)) return true;
      }
    }
  }
  return false;
}

/** ¿Es un dump legacy / raíz / _PENDING / CATALOGUE suelto? */
export function isMisplacedInventoryPublicId(publicId: string): boolean {
  const pid = publicId.replace(/^\/+|\/+$/g, '');
  if (!pid) return false;
  if (isCanonicalCataloguePublicId(pid)) return false;

  if (pid.includes('_PENDING') || /(^|\/)_PENDING(\/|$)/i.test(pid)) return true;

  for (const prefix of MIRROR_MISPLACED_SCAN_PREFIXES) {
    if (pid === prefix || pid.startsWith(`${prefix}/`)) return true;
  }

  // Raíz suelta (Morpho_… sin carpeta) = fuera de sitio
  if (!pid.includes('/')) return isLikelySpecimenRootAsset(pid);

  // RUBROS pero no bajo REGION canónica (subcarpeta inventada / typo)
  if (/^RUBROS\//i.test(pid) && !isCanonicalCataloguePublicId(pid)) return true;

  return false;
}

/**
 * Catálogo “de inventario” (canónico o misplaced).
 * Brand/UI → false. Misplaced sigue siendo inventario a reportar, no a recrear.
 */
export function isCataloguePublicId(publicId: string): boolean {
  if (isCanonicalCataloguePublicId(publicId)) return true;
  if (isMisplacedInventoryPublicId(publicId)) return true;
  return false;
}

export function classifyPublicIdPlacement(publicId: string): PublicIdPlacement {
  if (isCanonicalCataloguePublicId(publicId)) return 'canonical';
  if (isMisplacedInventoryPublicId(publicId)) return 'misplaced';
  return 'non_catalogue';
}

/** Heurística: raíz tipo Morpho_… / SPECIES_NAME, excluye brand/UI. */
export function isLikelySpecimenRootAsset(publicId: string): boolean {
  const leaf = publicId.toLowerCase();
  const deny = [
    'logo',
    'favicon',
    'android-chrome',
    'apple-touch',
    'rotating_earth',
    'main-sample',
    'code_senasa',
    'code_serfor',
    'coode_serfor',
    'code_cites',
    'code_vuce',
    'og-image',
    'banner',
    'icon',
  ];
  if (deny.some((d) => leaf.includes(d))) return false;
  return /[A-Za-z]{3,}/.test(publicId) && (publicId.includes('_') || /[A-Z]/.test(publicId));
}

/**
 * Carpetas operativas permitidas (NO catálogo entomológico).
 * Campañas, permisos, QR — nunca _PENDING / especimenes-secos / CATALOGUE.
 */
const ALLOWED_OPERATIONAL_FOLDER_RE =
  /^(campanas|documentos-legales|qr|permits)(\/|$)/i;

export function isAllowedOperationalFolder(folder: string): boolean {
  return ALLOWED_OPERATIONAL_FOLDER_RE.test(folder.replace(/^\/+|\/+$/g, ''));
}

/** ¿Esta carpeta/public_id es un dump de catálogo prohibido para escritura? */
export function isForbiddenCatalogueWriteTarget(folderOrPublicId: string): boolean {
  const raw = folderOrPublicId.replace(/^\/+|\/+$/g, '');
  if (!raw) return true;
  if (isAllowedOperationalFolder(raw)) return false;
  if (raw.includes('_PENDING')) return true;
  if (/^CATALOGUE/i.test(raw)) return true;
  if (/^especimenes-secos(\/|$)/i.test(raw)) return true;
  if (/^esqueletos-zoologia(\/|$)/i.test(raw)) return true;
  if (/^plantas(\/|$)/i.test(raw)) return true;
  // Escritura a raíz (sin /) = prohibida para catálogo
  if (!raw.includes('/')) return true;
  // RUBROS fuera de REGION canónica
  if (/^RUBROS\//i.test(raw) && !isCanonicalCataloguePublicId(raw)) return true;
  return false;
}

/**
 * Exige carpeta de upload de espécimen bajo el árbol canónico.
 * Lanza Error con mensaje en ES si está fuera de sitio.
 */
export function assertCanonicalUploadFolder(folder: string): void {
  const f = folder.replace(/^\/+|\/+$/g, '');
  if (!isCanonicalCataloguePublicId(f)) {
    throw new Error(
      `Upload bloqueado: la carpeta debe estar bajo «${RUBROS_RUBRO_ROOT}/REGION…/…» ` +
        `(las 5 regiones del rubro secos). Recibido: «${f || '(vacío)'}». ` +
        `Nunca _PENDING, CATALOGUE_*, especimenes-secos ni raíz.`,
    );
  }
  if (f.includes('_PENDING')) {
    throw new Error('Upload bloqueado: no se permite _PENDING.');
  }
}

export type NodeMediaLevel = 'rubro' | 'region' | 'categoria' | 'familia';

export type NodeMediaUploadTarget = {
  id: string;
  label: string;
  level: NodeMediaLevel;
  nodePath: string;
  cardFolder: string;
  videoFolder: string;
};

/** Targets fijos para subir card/video desde el admin (allowlist). */
export function listNodeMediaUploadTargets(): NodeMediaUploadTarget[] {
  const out: NodeMediaUploadTarget[] = [];

  for (const r of RUBROS_CHILD_FOLDERS) {
    const nodePath = `RUBROS/${r.folder}`;
    out.push({
      id: `rubro:${r.id}`,
      label: `Rubro · ${r.id}`,
      level: 'rubro',
      nodePath,
      cardFolder: nodeCardFolder(nodePath),
      videoFolder: nodeVideoFolder(nodePath),
    });
  }

  for (const reg of DRIED_SPECIMEN_REGION_ROOTS) {
    out.push({
      id: `region:${reg.id}`,
      label: `Región · ${reg.folder}`,
      level: 'region',
      nodePath: reg.path,
      cardFolder: nodeCardFolder(reg.path),
      videoFolder: nodeVideoFolder(reg.path),
    });
  }

  // Categorías bajo las 5 REGIONs del rubro 1 (mismo patrón).
  for (const reg of DRIED_SPECIMEN_REGION_ROOTS) {
    for (const c of DRIED_SPECIMEN_CATEGORY_FOLDERS) {
      const nodePath = `${reg.path}/${c.segment}`;
      const shortRegion = reg.folder.replace(/^REGION\s+/, '');
      out.push({
        id: `categoria:${reg.id}:${c.id}`,
        label: `${shortRegion} · ${c.segment}`,
        level: 'categoria',
        nodePath,
        cardFolder: nodeCardFolder(nodePath),
        videoFolder: nodeVideoFolder(nodePath),
      });
    }
  }

  // Cada familia/taxón → `_card` + `_video` (mismo patrón en todas las regiones).
  const familyBatches: Array<{
    regionId: string;
    labelPrefix: string;
    butterfliesRoot: string;
    families: readonly string[];
  }> = [
    {
      regionId: 'afrotropical',
      labelPrefix: 'Africa',
      butterfliesRoot: AFRICA_BUTTERFLIES_ROOT,
      families: EXPECTED_AFRICA_BUTTERFLY_FAMILIES,
    },
    {
      regionId: 'australasian-oriental',
      labelPrefix: 'Australasian',
      butterfliesRoot: AUSTRALASIAN_BUTTERFLIES_ROOT,
      families: EXPECTED_AUSTRALASIAN_BUTTERFLY_FAMILIES,
    },
    {
      regionId: 'neotropical',
      labelPrefix: 'Neotropical',
      butterfliesRoot: MIRROR_CANONICAL_BUTTERFLIES_PATH,
      families: EXPECTED_NEOTROPICAL_BUTTERFLY_FAMILIES,
    },
    {
      regionId: 'holarctic-europe',
      labelPrefix: 'Europe',
      butterfliesRoot: EUROPE_BUTTERFLIES_ROOT,
      families: EXPECTED_EUROPE_BUTTERFLY_FAMILIES,
    },
    {
      regionId: 'nearctic',
      labelPrefix: 'Nearctic',
      butterfliesRoot: NEARCTIC_BUTTERFLIES_ROOT,
      families: EXPECTED_NEARCTIC_BUTTERFLY_FAMILIES,
    },
  ];

  for (const batch of familyBatches) {
    for (const fam of batch.families) {
      const nodePath = `${batch.butterfliesRoot}/${fam}`;
      const slug = fam.toLowerCase().replace(/\s+/g, '-');
      out.push({
        id: `familia:${batch.regionId}:${slug}`,
        label: `${batch.labelPrefix} · ${fam}`,
        level: 'familia',
        nodePath,
        cardFolder: nodeCardFolder(nodePath),
        videoFolder: nodeVideoFolder(nodePath),
      });
    }
  }

  // Moths(Lepidoptera) Nocturne · Neotropical — 14 familias (_card/_video).
  for (const fam of EXPECTED_NEOTROPICAL_MOTHS_FAMILIES) {
    const nodePath = `${NEOTROPICAL_MOTHS_ROOT}/${fam}`;
    const slug = fam.toLowerCase().replace(/\s+/g, '-');
    out.push({
      id: `familia:neotropical:moths:${slug}`,
      label: `Neotropical · Moths · ${fam}`,
      level: 'familia',
      nodePath,
      cardFolder: nodeCardFolder(nodePath),
      videoFolder: nodeVideoFolder(nodePath),
    });
  }

  // Insects(arthropoda) · 5 REGIONs × 10 taxones compartidos (_card/_video c/u).
  // Categoría Insects ya cubierta arriba (loop DRIED_SPECIMEN_CATEGORY_FOLDERS).
  const insectRegionLabels: Record<string, string> = {
    afrotropical: 'Africa · Insects',
    'australasian-oriental': 'Australasian · Insects',
    neotropical: 'Neotropical · Insects',
    'holarctic-europe': 'Europe · Insects',
    nearctic: 'Nearctic · Insects',
  };
  for (const reg of INSECTS_REGION_ROOTS) {
    for (const fam of EXPECTED_SHARED_INSECTS_FAMILIES) {
      const nodePath = `${reg.nodePath}/${fam}`;
      const slug = fam.toLowerCase().replace(/\s+/g, '-');
      out.push({
        id: `familia:${reg.id}:insects:${slug}`,
        label: `${insectRegionLabels[reg.id] ?? 'Insects'} · ${fam}`,
        level: 'familia',
        nodePath,
        cardFolder: nodeCardFolder(nodePath),
        videoFolder: nodeVideoFolder(nodePath),
      });
    }
  }

  // Beetles(Coleoptera) Insects · 5 REGIONs (12/13/13/13/13).
  const beetleBatches: Array<{
    regionId: string;
    labelPrefix: string;
    beetlesRoot: string;
    families: readonly string[];
  }> = [
    {
      regionId: 'afrotropical',
      labelPrefix: 'Africa · Beetles',
      beetlesRoot: AFRICA_BEETLES_ROOT,
      families: EXPECTED_AFRICA_BEETLES_FAMILIES,
    },
    {
      regionId: 'australasian-oriental',
      labelPrefix: 'Australasian · Beetles',
      beetlesRoot: AUSTRALASIAN_BEETLES_ROOT,
      families: EXPECTED_AUSTRALASIAN_BEETLES_FAMILIES,
    },
    {
      regionId: 'neotropical',
      labelPrefix: 'Neotropical · Beetles',
      beetlesRoot: NEOTROPICAL_BEETLES_ROOT,
      families: EXPECTED_NEOTROPICAL_BEETLES_FAMILIES,
    },
    {
      regionId: 'holarctic-europe',
      labelPrefix: 'Europe · Beetles',
      beetlesRoot: EUROPE_BEETLES_ROOT,
      families: EXPECTED_EUROPE_BEETLES_FAMILIES,
    },
    {
      regionId: 'nearctic',
      labelPrefix: 'Nearctic · Beetles',
      beetlesRoot: NEARCTIC_BEETLES_ROOT,
      families: EXPECTED_NEARCTIC_BEETLES_FAMILIES,
    },
  ];

  for (const batch of beetleBatches) {
    for (const fam of batch.families) {
      const nodePath = `${batch.beetlesRoot}/${fam}`;
      const slug = fam.toLowerCase().replace(/\s+/g, '-');
      out.push({
        id: `familia:${batch.regionId}:beetles:${slug}`,
        label: `${batch.labelPrefix} · ${fam}`,
        level: 'familia',
        nodePath,
        cardFolder: nodeCardFolder(nodePath),
        videoFolder: nodeVideoFolder(nodePath),
      });
    }
  }

  // Rare -Gynan-Aberrations · 5 REGIONs × 3 subcarpetas (_card/_video c/u).
  const rareRegionLabels: Record<string, string> = {
    afrotropical: 'Africa · Rare',
    'australasian-oriental': 'Australasian · Rare',
    neotropical: 'Neotropical · Rare',
    'holarctic-europe': 'Europe · Rare',
    nearctic: 'Nearctic · Rare',
  };
  for (const reg of RARE_GYNAN_REGION_ROOTS) {
    for (const child of EXPECTED_RARE_SUBFOLDERS) {
      const nodePath = `${reg.nodePath}/${child}`;
      const slug = child.toLowerCase().replace(/\s+/g, '-');
      out.push({
        id: `familia:${reg.id}:rare:${slug}`,
        label: `${rareRegionLabels[reg.id] ?? 'Rare'} · ${child}`,
        level: 'familia',
        nodePath,
        cardFolder: nodeCardFolder(nodePath),
        videoFolder: nodeVideoFolder(nodePath),
      });
    }
  }

  return out;
}

export function findNodeMediaUploadTarget(id: string): NodeMediaUploadTarget | null {
  return listNodeMediaUploadTargets().find((t) => t.id === id) ?? null;
}

/**
 * Upload de card/video de nodo: solo `_card` / `_video` bajo un target allowlist.
 */
export function assertNodeMediaSlotFolder(folder: string, slot: 'card' | 'video'): void {
  const f = folder.replace(/^\/+|\/+$/g, '');
  const expectedSeg = slot === 'card' ? NODE_MEDIA_SLOT.card : NODE_MEDIA_SLOT.video;
  if (!f.endsWith(`/${expectedSeg}`)) {
    throw new Error(
      `Upload bloqueado: la carpeta debe terminar en «/${expectedSeg}». Recibido: «${f}».`,
    );
  }
  if (f.includes('_PENDING') || /^CATALOGUE/i.test(f) || /^especimenes-secos/i.test(f)) {
    throw new Error('Upload bloqueado: carpeta prohibida (_PENDING / CATALOGUE / especimenes-secos).');
  }
  const allowed = listNodeMediaUploadTargets().some(
    (t) => (slot === 'card' ? t.cardFolder : t.videoFolder) === f,
  );
  if (!allowed) {
    throw new Error(
      `Upload bloqueado: «${f}» no está en la lista de nodos canónicos (rubro/región/categoría/familia).`,
    );
  }
}

/**
 * Documentos/campañas: permite carpetas operativas; bloquea dumps de catálogo.
 */
export function assertAllowedOperationalFolder(folder: string): void {
  const f = folder.replace(/^\/+|\/+$/g, '');
  if (isAllowedOperationalFolder(f)) return;
  if (isCanonicalCataloguePublicId(f)) return; // OK si alguien sube doc al árbol correcto
  if (isForbiddenCatalogueWriteTarget(f)) {
    throw new Error(
      `Upload bloqueado: «${f}» no es carpeta operativa ni árbol canónico RUBROS. ` +
        `Usa campanas/ o documentos-legales/, o el path REGION… para catálogo.`,
    );
  }
}

/**
 * Resuelve carpeta de upload de espécimen SOLO bajo el árbol canónico.
 * Preferencia: carpeta del public_id existente → categoría+familia+género.
 * Si falta taxonomía → null (el caller debe rechazar; no inventar _PENDING).
 */
export function resolveCanonicalSpecimenFolder(input: {
  existingPublicId?: string | null;
  categoria?: string | null;
  familia?: string | null;
  genero?: string | null;
  orderName?: string | null;
}): string | null {
  const existing = extractPublicId(input.existingPublicId);
  if (existing && isCanonicalCataloguePublicId(existing)) {
    const parts = existing.split('/');
    if (parts.length >= 2) return parts.slice(0, -1).join('/');
    return MIRROR_CANONICAL_REGION_PATH;
  }

  const categorySeg = resolveCategorySegment(input.categoria, input.familia, input.orderName);
  if (!categorySeg) return null;

  const parts = [MIRROR_CANONICAL_REGION_PATH, categorySeg];
  const fam = (input.familia ?? '').trim();
  if (fam) parts.push(fam);
  const gen = (input.genero ?? '').trim();
  if (gen) parts.push(gen);
  return parts.join('/');
}

function resolveCategorySegment(
  categoria?: string | null,
  familia?: string | null,
  orderName?: string | null,
): string | null {
  const catRaw = (categoria ?? '').trim();
  if (catRaw) {
    const hit = DRIED_SPECIMEN_CATEGORY_FOLDERS.find((c) => {
      const key = catRaw.toLowerCase();
      return (
        c.segment.toLowerCase() === key ||
        c.id === key ||
        c.aliases.some((a) => a.toLowerCase() === key) ||
        c.segment.toLowerCase().includes(key) ||
        key.includes(c.segment.toLowerCase().slice(0, 12))
      );
    });
    if (hit) return hit.segment;
  }

  const fam = (familia ?? '').trim();
  if (fam) {
    const famBase = fam.toLowerCase().replace(/\s+\d+$/, '');
    const isButterfly = EXPECTED_NEOTROPICAL_BUTTERFLY_FAMILIES.some((f) => {
      const expected = f.toLowerCase();
      const expectedBase = expected.replace(/\s+\d+$/, '');
      return expected === fam.toLowerCase() || expectedBase === famBase;
    });
    if (isButterfly || /idae$/i.test(famBase)) {
      // Familias -idae del catálogo diurno → Butterflies por defecto
      if (isButterfly || /lepidoptera/i.test(orderName ?? '')) {
        return 'Butterflies(lepidoptera) Diurne';
      }
    }
  }

  const order = (orderName ?? '').toLowerCase();
  if (/coleoptera/.test(order)) return 'Beetles(Coleoptera) Insects';
  if (/lepidoptera/.test(order) && /nocturn|moth/.test(order + (categoria ?? ''))) {
    return 'Moths(Lepidoptera) Nocturne';
  }
  if (/lepidoptera/.test(order)) return 'Butterflies(lepidoptera) Diurne';
  if (/arthropoda|insect/.test(order)) return 'Insects(arthropoda)';

  return null;
}
