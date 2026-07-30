// ============================================================================
// Raíces Cloudinary canónicas (rutas reales de la cuenta — no inventadas).
// Verificadas / alineadas con Media Library (Jul 2026):
//
//   RUBROS   ← exactamente 3 hijos
//     ├─ ESPECIMENS SECOS BIOLOGICOS…          ← PRIORIDAD: × TODAS las REGIONs
//     │    ├─ REGION Africa (Afrotropical)              (+ 5 categorías)
//     │    ├─ REGION Australasian Y Oriental            (+ 5 categorías)
//     │    ├─ REGION Central South America Neotropical  ← foco storefront
//     │    │    └─ 5 categorías; Insects(arthropoda) ← foco #2 ×5 REGIONs (_card/_video)
//     │    │         · Beetles ×5: 12/13/13/13/13 · Moths Neo 14 · Butterflies 17
//     │    │         · Insects: 10 taxones ×5 REGIONs (Odonata=id3; id4 pend.)
//     │    ├─ REGION Europe (Holarctic)                 (+ 5 categorías; Butterflies 5)
//     │    └─ REGION North America (Nearctic)           (+ 5 categorías; Butterflies 5)
//     ├─ ESQUELETOS…  ← después (stub)
//     └─ PLANTAS…     ← después (stub)
//
// En CADA nodo (rubro / REGION / categoría / familia): subcarpetas de media
//   _card/   ← imagen(es) de la card del nodo
//   _video/  ← video corto de entrada
// Estas NO son taxones. Nunca crear fuera de RUBROS/….
// ============================================================================

/**
 * Los 3 hijos exactos de la carpeta Cloudinary `RUBROS/`.
 * Orden = hub storefront `/[lang]/catalogue`.
 */
export const RUBROS_CHILD_FOLDERS = [
  {
    id: 'dried-specimens' as const,
    folder: 'ESPECIMENS SECOS BIOLOGICOS Y INSECTOS COLEOPTEROS  Y ARHHROPODS',
  },
  {
    id: 'zoology-skeletons' as const,
    folder: 'ESQUELETOS DE ZOOLOGIA , BIRS, BATS,AMPHIBIANS,CRUSATACEOS',
  },
  {
    id: 'dry-plants-no-cites' as const,
    folder: 'PLANTAS SECAS NO-CITES',
  },
] as const;

/** Contenedor del rubro 1 (especímenes secos) — carpeta exacta en Cloudinary. */
export const RUBRO_FOLDER = RUBROS_CHILD_FOLDERS[0].folder;

/** Rubro 2 — esqueletos / zoología (carpeta exacta). */
export const RUBRO_FOLDER_SKELETONS = RUBROS_CHILD_FOLDERS[1].folder;

/** Rubro 3 — plantas secas no-CITES (carpeta exacta). */
export const RUBRO_FOLDER_PLANTS = RUBROS_CHILD_FOLDERS[2].folder;

/**
 * Convención de media de nodo (card + video de entrada).
 * Canónico: `_card` / `_video` (prefijo `_` evita confusión con taxones).
 * Alias de lectura: `card` / `video` (sin guion bajo).
 * Nunca crear estas carpetas fuera del path del nodo bajo RUBROS/….
 */
export const NODE_MEDIA_SLOT = {
  card: '_card',
  video: '_video',
} as const;

export const NODE_MEDIA_SLOT_ALIASES = {
  card: ['_card', 'card'] as const,
  video: ['_video', 'video'] as const,
} as const;

/** ¿Nombre de carpeta = slot de media de nodo (no taxón)? */
export function isNodeMediaFolderName(name: string): boolean {
  const n = name.trim().replace(/^['"]+|['"]+$/g, '');
  return /^_?(card|video)$/i.test(n);
}

/** Path de la subcarpeta `_card` bajo un nodo canónico. */
export function nodeCardFolder(nodePath: string): string {
  return `${nodePath.replace(/\/+$/, '')}/${NODE_MEDIA_SLOT.card}`;
}

/** Path de la subcarpeta `_video` bajo un nodo canónico. */
export function nodeVideoFolder(nodePath: string): string {
  return `${nodePath.replace(/\/+$/, '')}/${NODE_MEDIA_SLOT.video}`;
}

/**
 * Regiones GEOGRÁFICAS bajo rubro 1 (ESPECIMENS SECOS BIOLOGICOS).
 * Carpetas Cloudinary exactas — no inventar paths.
 * Orden UI confirmado:
 *   1 Africa · 2 Australasian/Oriental · 3 Neotropical · 4 Europe · 5 Nearctic
 * Familias: Africa (5) · Australasian (9) · Neotropical (17) · Europe (5) · Nearctic (5).
 * Cada familia/taxón: `_card` + `_video`. Rubros 2–3 después.
 *
 * Alias histórico: DRIED_SPECIMEN_REGION_FOLDERS (mismo array).
 */
export const GEOGRAPHIC_REGION_FOLDERS = [
  {
    id: 'afrotropical',
    folder: 'REGION Africa (Afrotropical)',
    aliases: ['REGION Africa (Afrotropical)'] as const,
  },
  {
    id: 'australasian-oriental',
    folder: 'REGION Australasian Y Oriental',
    aliases: ['REGION Australasian Y Oriental'] as const,
  },
  {
    id: 'neotropical',
    folder: 'REGION Central South America Neotropical',
    // Historial: doble espacio entre Central y South visto en sync previo.
    aliases: [
      'REGION Central South America Neotropical',
      'REGION Central  South America Neotropical',
    ] as const,
  },
  {
    id: 'holarctic-europe',
    folder: 'REGION Europe (Holarctic)',
    aliases: ['REGION Europe (Holarctic)'] as const,
  },
  {
    id: 'nearctic',
    folder: 'REGION North America (Nearctic)',
    aliases: ['REGION North America (Nearctic)'] as const,
  },
] as const;

/** @deprecated Usar GEOGRAPHIC_REGION_FOLDERS — mismo contenido (regiones geográficas). */
export const DRIED_SPECIMEN_REGION_FOLDERS = GEOGRAPHIC_REGION_FOLDERS;

/** Prefijo hasta el rubro 1 (especímenes secos). */
export const RUBROS_RUBRO_ROOT = `RUBROS/${RUBRO_FOLDER}`;

/** Path Cloudinary de una carpeta REGION bajo el rubro 1. */
export function driedSpecimenRegionRoot(regionFolder: string): string {
  return `${RUBROS_RUBRO_ROOT}/${regionFolder.replace(/\/+$/, '')}`;
}

/**
 * Las 5 raíces REGION bajo ESPECIMENS SECOS (rubro 1).
 * Contrato sync / espejo / node-media: completar todas de una vez.
 */
export const DRIED_SPECIMEN_REGION_ROOTS = GEOGRAPHIC_REGION_FOLDERS.map((r) => ({
  id: r.id,
  folder: r.folder,
  path: driedSpecimenRegionRoot(r.folder),
}));

/** Región Neotropical (carpeta canónica storefront / sync default). */
export const REGION_FOLDER =
  GEOGRAPHIC_REGION_FOLDERS.find((r) => r.id === 'neotropical')!.folder;

/**
 * DEFAULT: nivel REGIÓN Neotropical — incluye las 5 categorías.
 * Así discover ve Satyridae, Nymphalidae 1..6, etc. bajo Butterflies.
 * Otras regiones: --root=<region-id> o path completo (ver KNOWN_ROOTS).
 */
export const DEFAULT_ROOT = driedSpecimenRegionRoot(REGION_FOLDER);

/** Solo mariposas diurnas Neotropical (familias -idae de la captura). */
export const BUTTERFLIES_ROOT = `${DEFAULT_ROOT}/Butterflies(lepidoptera) Diurne`;

/** Rama legacy (antes era el DEFAULT). Sigue válida con --root=… */
export const LEGACY_NO_CITES_ROOT = `${DEFAULT_ROOT}/SPECIMENES SECOS Y BIOLOGICOS NO CITES`;

/**
 * Las 5 carpetas-categoría exactas bajo CADA REGION del rubro 1.
 * Mismo patrón en las 5 regiones; familias Butterflies (17) = foco Neotropical.
 */
export const DRIED_SPECIMEN_CATEGORY_FOLDERS = [
  {
    id: 'rare-gynan-aberrations',
    segment: 'Rare -Gynan-Aberrations',
    aliases: ["Rare -Gynan-Aberrations", "'Rare -Gynan-Aberrations'"] as const,
  },
  {
    id: 'insects-arthropoda',
    segment: 'Insects(arthropoda)',
    aliases: ['Insects(arthropoda)', 'insects(arthropoda)'] as const,
  },
  {
    id: 'beetles-coleoptera-insects',
    segment: 'Beetles(Coleoptera) Insects',
    aliases: ['Beetles(Coleoptera) Insects'] as const,
  },
  {
    id: 'moths-lepidoptera-nocturne',
    // Cloudinary exacto: "Nocturne" (no "Nocturnas"). Display ES: ver MOTHS_DISPLAY_LABEL.
    segment: 'Moths(Lepidoptera) Nocturne',
    aliases: [
      'Moths(Lepidoptera) Nocturne',
      'Moths (Lepidoptera) Nocturnas',
      'Moths(Lepidoptera) Nocturnas',
    ] as const,
  },
  {
    id: 'butterflies-lepidoptera-diurne',
    segment: 'Butterflies(lepidoptera) Diurne',
    aliases: ['Butterflies(lepidoptera) Diurne'] as const,
  },
] as const;

/**
 * Categoría 1 (1-based) en DRIED_SPECIMEN_CATEGORY_FOLDERS — Rare -Gynan-Aberrations.
 * Avance usuario: 5ª categoría del rubro. Foco admin: _card + _video × 5 REGIONs.
 * Familias/subcarpetas: placeholder — esperar lista (no inventar).
 */
export const RARE_GYNAN_CATEGORY =
  DRIED_SPECIMEN_CATEGORY_FOLDERS.find((c) => c.id === 'rare-gynan-aberrations')!;

/** Carpeta Cloudinary exacta. */
export const RARE_GYNAN_CATEGORY_SEGMENT = RARE_GYNAN_CATEGORY.segment;

/** Label UI — coincide con carpeta Cloudinary. */
export const RARE_GYNAN_DISPLAY_LABEL = 'Rare -Gynan-Aberrations';

/** Rare-Gynan bajo Neotropical — foco primario _card/_video. */
export const NEOTROPICAL_RARE_GYNAN_ROOT = `${DEFAULT_ROOT}/${RARE_GYNAN_CATEGORY_SEGMENT}`;

/**
 * Rare -Gynan-Aberrations bajo CADA REGION del rubro 1.
 * Path: `RUBROS/{dried}/{REGION …}/Rare -Gynan-Aberrations`.
 * Cada una: `_card` + `_video`. Hijos: EXPECTED_RARE_SUBFOLDERS ×5.
 */
export const RARE_GYNAN_REGION_ROOTS = GEOGRAPHIC_REGION_FOLDERS.map((r) => ({
  id: r.id,
  regionFolder: r.folder,
  nodePath: `${driedSpecimenRegionRoot(r.folder)}/${RARE_GYNAN_CATEGORY_SEGMENT}`,
}));

/**
 * Subcarpetas bajo Rare -Gynan-Aberrations (nombres exactos usuario).
 * No reutilizar segmentos Diurne/Nocturne (categorías hermanas del rubro).
 * Beetles… Arthropoda (confirmado; no “Atropoda”).
 * Cada una: `_card` + `_video`. Path: `…/Rare -Gynan-Aberrations/{child}`.
 */
export const EXPECTED_RARE_SUBFOLDERS = [
  'Butterflies (Lepidoptera)',
  'Moths (Lepidoptera)',
  'Beetles (Coleoptera) Y Arthropoda Insects',
] as const;

/** Alias — mismos 3 nodos (compat. families API / UI). */
export const EXPECTED_SHARED_RARE_GYNAN_FAMILIES = EXPECTED_RARE_SUBFOLDERS;

export const REGION_RARE_GYNAN_FAMILIES: Partial<
  Record<(typeof GEOGRAPHIC_REGION_FOLDERS)[number]['id'], readonly string[]>
> = {
  afrotropical: EXPECTED_RARE_SUBFOLDERS,
  'australasian-oriental': EXPECTED_RARE_SUBFOLDERS,
  neotropical: EXPECTED_RARE_SUBFOLDERS,
  'holarctic-europe': EXPECTED_RARE_SUBFOLDERS,
  nearctic: EXPECTED_RARE_SUBFOLDERS,
};

/** Subcarpetas Rare-Gynan en una REGION (set compartido ×5). */
export function rareGynanFamiliesForRegion(
  regionId: string | null | undefined,
): readonly string[] {
  if (!regionId) return [];
  return (
    REGION_RARE_GYNAN_FAMILIES[
      regionId as (typeof GEOGRAPHIC_REGION_FOLDERS)[number]['id']
    ] ?? []
  );
}

/**
 * Categoría 2 (1-based) en DRIED_SPECIMEN_CATEGORY_FOLDERS — Insects (Arthropoda).
 * Taxones: 10 compartidos. _card + _video × 5 REGIONs.
 */
export const INSECTS_CATEGORY =
  DRIED_SPECIMEN_CATEGORY_FOLDERS.find((c) => c.id === 'insects-arthropoda')!;

/** Carpeta Cloudinary exacta. */
export const INSECTS_CATEGORY_SEGMENT = INSECTS_CATEGORY.segment;

/** Label UI — coincide con carpeta Cloudinary (sin espacio antes del paréntesis). */
export const INSECTS_DISPLAY_LABEL = 'Insects (Arthropoda)';

/** Insects bajo Neotropical — foco primario _card/_video. */
export const NEOTROPICAL_INSECTS_ROOT = `${DEFAULT_ROOT}/${INSECTS_CATEGORY_SEGMENT}`;

/**
 * Insects(arthropoda) bajo CADA REGION del rubro 1.
 * Path: `RUBROS/{dried}/{REGION …}/Insects(arthropoda)`.
 * Cada una: `_card` + `_video`. Familias: set compartido (hasta overrides por región).
 */
export const INSECTS_REGION_ROOTS = GEOGRAPHIC_REGION_FOLDERS.map((r) => ({
  id: r.id,
  regionFolder: r.folder,
  nodePath: `${driedSpecimenRegionRoot(r.folder)}/${INSECTS_CATEGORY_SEGMENT}`,
}));

/**
 * Familias/taxones Insects(arthropoda) — set compartido (XML parcial Jul 2026).
 * Orden usuario: 1 Arañas y otros · 2 Homoptera · Odonata · 5–11 Phasmidae…Escorpión.
 * Id XML 4 aún no enviado — no inventar. Cada carpeta: `_card` + `_video`.
 * Aplicado a las 5 REGIONs hasta diffs por región.
 */
export const EXPECTED_SHARED_INSECTS_FAMILIES = [
  'Arañas y otros', // 1 · Arachnida y otros arácnidos
  'Homoptera', // 2 · Insectos del orden Homoptera
  'Odonata', // libélulas / caballitos del diablo (odonata)
  // id 4 — pendiente (XML incompleto)
  'Phasmidae', // 5 · Insectos palo y hoja (Phasmatodea)
  'Phylliidae', // 6 · Insectos hoja
  'Mantidae', // 7 · Mántidos / Mantis religiosas
  'Orthoptera', // 8 · Saltamontes, grillos y afines
  'Hemiptera', // 9 · Insectos hemípteros
  'Hymenoptera', // 10 · Abejas, avispas y hormigas
  'Escorpión', // 11 · Escorpiones y alacranes (Scorpiones)
] as const;

/** Descripciones XML (display) — no son carpetas. */
export const INSECTS_FAMILY_DESCRIPTIONS: Partial<Record<string, string>> = {
  'Arañas y otros': 'Arachnida y otros arácnidos',
  Homoptera: 'Insectos del orden Homoptera',
  Odonata: 'Libélulas y caballitos del diablo (Odonata)',
  Phasmidae: 'Insectos palo y hoja (Phasmatodea)',
  Phylliidae: 'Insectos hoja',
  Mantidae: 'Mántidos / Mantis religiosas',
  Orthoptera: 'Saltamontes, grillos y afines',
  Hemiptera: 'Insectos hemípteros',
  Hymenoptera: 'Abejas, avispas y hormigas',
  Escorpión: 'Escorpiones y alacranes (Scorpiones)',
};

/** Alias por región → shared (override individual cuando llegue XML per-region). */
export const EXPECTED_AFRICA_INSECTS_FAMILIES = EXPECTED_SHARED_INSECTS_FAMILIES;
export const EXPECTED_AUSTRALASIAN_INSECTS_FAMILIES =
  EXPECTED_SHARED_INSECTS_FAMILIES;
export const EXPECTED_NEOTROPICAL_INSECTS_FAMILIES =
  EXPECTED_SHARED_INSECTS_FAMILIES;
export const EXPECTED_EUROPE_INSECTS_FAMILIES = EXPECTED_SHARED_INSECTS_FAMILIES;
export const EXPECTED_NEARCTIC_INSECTS_FAMILIES = EXPECTED_SHARED_INSECTS_FAMILIES;

/** Familias Insects por región — shared set ×5 (hasta overrides). */
export const REGION_INSECTS_FAMILIES: Partial<
  Record<(typeof GEOGRAPHIC_REGION_FOLDERS)[number]['id'], readonly string[]>
> = {
  afrotropical: EXPECTED_AFRICA_INSECTS_FAMILIES,
  'australasian-oriental': EXPECTED_AUSTRALASIAN_INSECTS_FAMILIES,
  neotropical: EXPECTED_NEOTROPICAL_INSECTS_FAMILIES,
  'holarctic-europe': EXPECTED_EUROPE_INSECTS_FAMILIES,
  nearctic: EXPECTED_NEARCTIC_INSECTS_FAMILIES,
};

/** Familias Insects en una REGION (o [] si pendiente). */
export function insectFamiliesForRegion(
  regionId: string | null | undefined,
): readonly string[] {
  if (!regionId) return [];
  return (
    REGION_INSECTS_FAMILIES[
      regionId as (typeof GEOGRAPHIC_REGION_FOLDERS)[number]['id']
    ] ?? []
  );
}

/**
 * Categoría 3 (1-based) en DRIED_SPECIMEN_CATEGORY_FOLDERS — Beetles.
 * Familias 5/5 confirmadas; ya no es foco.
 */
export const BEETLES_CATEGORY =
  DRIED_SPECIMEN_CATEGORY_FOLDERS.find((c) => c.id === 'beetles-coleoptera-insects')!;

/** Carpeta Cloudinary exacta. */
export const BEETLES_CATEGORY_SEGMENT = BEETLES_CATEGORY.segment;

/** Label UI — coincide con carpeta Cloudinary. */
export const BEETLES_DISPLAY_LABEL = 'Beetles (Coleoptera) Insects';

/** Beetles bajo Neotropical — foco primario _card/_video. */
export const NEOTROPICAL_BEETLES_ROOT = `${DEFAULT_ROOT}/${BEETLES_CATEGORY_SEGMENT}`;

/**
 * Beetles(Coleoptera) Insects bajo CADA REGION del rubro 1.
 * Path: `RUBROS/{dried}/{REGION …}/Beetles(Coleoptera) Insects`.
 * Carpetas REGION = GEOGRAPHIC_REGION_FOLDERS (exactas). Cada una: `_card` + `_video`.
 * Familias: Africa 12 · Australasian 13 · Neotropical 13 · Europe 13 · Nearctic 13.
 */
export const BEETLES_REGION_ROOTS = GEOGRAPHIC_REGION_FOLDERS.map((r) => ({
  id: r.id,
  regionFolder: r.folder,
  nodePath: `${driedSpecimenRegionRoot(r.folder)}/${BEETLES_CATEGORY_SEGMENT}`,
}));

/** Beetles bajo Africa (Afrotropical). */
export const AFRICA_BEETLES_ROOT = BEETLES_REGION_ROOTS.find(
  (r) => r.id === 'afrotropical',
)!.nodePath;

/**
 * Familias Beetles · REGION Africa (Afrotropical) — 12 carpetas.
 * Orden = lista usuario. Spelling carpeta: Cetonidae (no Cetoniidae).
 * Cada una: `_card` + `_video`.
 */
export const EXPECTED_AFRICA_BEETLES_FAMILIES = [
  'Buprestidae',
  'Cerambycidae',
  'Cetonidae',
  'Chrysomelidae',
  'Cicindelidae',
  'Curculionidae',
  'Dynastidae',
  'Elateridae',
  'Euchiridae',
  'Lucanidae',
  'Scarabaeidae',
  'Trictenotomidae',
] as const;

/** Alias pedido / docs — mismo array. */
export const EXPECTED_AFRICA_BEETLE_FAMILIES = EXPECTED_AFRICA_BEETLES_FAMILIES;

/** Beetles bajo Australasian Y Oriental. */
export const AUSTRALASIAN_BEETLES_ROOT = BEETLES_REGION_ROOTS.find(
  (r) => r.id === 'australasian-oriental',
)!.nodePath;

/**
 * Familias Beetles · REGION Australasian Y Oriental — 13 carpetas.
 * Orden = lista usuario. Incluye Carabidae. Cetonidae = spelling Africa.
 * Cada una: `_card` + `_video`.
 */
export const EXPECTED_AUSTRALASIAN_BEETLES_FAMILIES = [
  'Buprestidae',
  'Carabidae',
  'Cerambycidae',
  'Cetonidae',
  'Chrysomelidae',
  'Cicindelidae',
  'Curculionidae',
  'Dynastidae',
  'Elateridae',
  'Euchiridae',
  'Lucanidae',
  'Scarabaeidae',
  'Trictenotomidae',
] as const;

/** Alias pedido / docs — mismo array. */
export const EXPECTED_AUSTRALASIAN_BEETLE_FAMILIES =
  EXPECTED_AUSTRALASIAN_BEETLES_FAMILIES;

/**
 * Familias Beetles · REGION Neotropical — 13 carpetas.
 * Tiene Rutilidae; NO Carabidae. Cetonidae = spelling Africa.
 * Cada una: `_card` + `_video`.
 */
export const EXPECTED_NEOTROPICAL_BEETLES_FAMILIES = [
  'Buprestidae',
  'Cerambycidae',
  'Cetonidae',
  'Chrysomelidae',
  'Cicindelidae',
  'Curculionidae',
  'Dynastidae',
  'Elateridae',
  'Euchiridae',
  'Rutilidae',
  'Lucanidae',
  'Scarabaeidae',
  'Trictenotomidae',
] as const;

/** Beetles bajo Europe (Holarctic). */
export const EUROPE_BEETLES_ROOT = BEETLES_REGION_ROOTS.find(
  (r) => r.id === 'holarctic-europe',
)!.nodePath;

/**
 * Familias Beetles · REGION Europe (Holarctic) — 13 carpetas.
 * Mismo set nominal que Australasian; constante propia (no compartir array).
 * Cada una: `_card` + `_video`.
 */
export const EXPECTED_EUROPE_BEETLES_FAMILIES = [
  'Buprestidae',
  'Carabidae',
  'Cerambycidae',
  'Cetonidae',
  'Chrysomelidae',
  'Cicindelidae',
  'Curculionidae',
  'Dynastidae',
  'Elateridae',
  'Euchiridae',
  'Lucanidae',
  'Scarabaeidae',
  'Trictenotomidae',
] as const;

/** Beetles bajo North America (Nearctic). */
export const NEARCTIC_BEETLES_ROOT = BEETLES_REGION_ROOTS.find(
  (r) => r.id === 'nearctic',
)!.nodePath;

/**
 * Familias Beetles · REGION North America (Nearctic) — 13 carpetas.
 * Mismo set nominal que Europe/Australasian; constante propia.
 * Cada una: `_card` + `_video`.
 */
export const EXPECTED_NEARCTIC_BEETLES_FAMILIES = [
  'Buprestidae',
  'Carabidae',
  'Cerambycidae',
  'Cetonidae',
  'Chrysomelidae',
  'Cicindelidae',
  'Curculionidae',
  'Dynastidae',
  'Elateridae',
  'Euchiridae',
  'Lucanidae',
  'Scarabaeidae',
  'Trictenotomidae',
] as const;

/**
 * Familias Beetles esperadas por región (rubro 1) — 5/5 confirmadas.
 */
export const REGION_BEETLES_FAMILIES: Record<
  (typeof GEOGRAPHIC_REGION_FOLDERS)[number]['id'],
  readonly string[]
> = {
  afrotropical: EXPECTED_AFRICA_BEETLES_FAMILIES,
  'australasian-oriental': EXPECTED_AUSTRALASIAN_BEETLES_FAMILIES,
  neotropical: EXPECTED_NEOTROPICAL_BEETLES_FAMILIES,
  'holarctic-europe': EXPECTED_EUROPE_BEETLES_FAMILIES,
  nearctic: EXPECTED_NEARCTIC_BEETLES_FAMILIES,
};

/** Familias esperadas para Beetles en una REGION (o []). */
export function beetleFamiliesForRegion(
  regionId: string | null | undefined,
): readonly string[] {
  if (!regionId) return [];
  return (
    REGION_BEETLES_FAMILIES[
      regionId as (typeof GEOGRAPHIC_REGION_FOLDERS)[number]['id']
    ] ?? []
  );
}

/** Alias carpeta Cloudinary → ICZN cuando difiere (lectura sync/UI). */
export const BEETLE_FAMILY_TAXONOMY_ALIASES: Record<string, string> = {
  Cetonidae: 'Cetoniidae',
  Cetoniidae: 'Cetoniidae',
};

/**
 * Categoría 4 (1-based) — Moths. Neo 14 familias confirmadas; ya no es foco.
 */
export const MOTHS_CATEGORY =
  DRIED_SPECIMEN_CATEGORY_FOLDERS.find((c) => c.id === 'moths-lepidoptera-nocturne')!;

/** Carpeta Cloudinary exacta (Nocturne). */
export const MOTHS_CATEGORY_SEGMENT = MOTHS_CATEGORY.segment;

/** Label UI / usuario — “Nocturnas”; path Cloudinary sigue siendo Nocturne. */
export const MOTHS_DISPLAY_LABEL = 'Moths (Lepidoptera) Nocturnas';

/** Moths bajo Neotropical. */
export const NEOTROPICAL_MOTHS_ROOT = `${DEFAULT_ROOT}/${MOTHS_CATEGORY_SEGMENT}`;

/**
 * Moths(Lepidoptera) Nocturne bajo CADA REGION del rubro 1.
 * Path: `RUBROS/{dried}/{REGION …}/Moths(Lepidoptera) Nocturne`.
 * Cada una: `_card` + `_video`. Familias Neo 14; resto pendiente.
 */
export const MOTHS_REGION_ROOTS = GEOGRAPHIC_REGION_FOLDERS.map((r) => ({
  id: r.id,
  regionFolder: r.folder,
  nodePath: `${driedSpecimenRegionRoot(r.folder)}/${MOTHS_CATEGORY_SEGMENT}`,
}));

/**
 * Familias bajo Moths(Lepidoptera) Nocturne — REGION Neotropical (rubro 1).
 * Orden = lista usuario (dedupe Arctidae/Arctiidae → Arctiidae).
 * Spelling: ICZN estándar donde el usuario tipió mal (Hepialidae, Saturniidae,
 * Uraniidae); Castnia se conserva como escribió el usuario (género/carpeta).
 * Cada una: `_card` + `_video`.
 */
export const EXPECTED_NEOTROPICAL_MOTHS_FAMILIES = [
  'Arctiidae',
  'Castnia',
  'Hepialidae',
  'Noctuidae',
  'Saturniidae',
  'Sphingidae',
  'Uraniidae',
  'Geometridae',
  'Tortricidae',
  'Drepanidae',
  'Alucitidae',
  'Crambidae',
  'Notodontidae',
  'Limacodidae',
] as const;

/** Alias histórico / docs — mismo array. */
export const EXPECTED_NEOTROPICAL_MOTH_FAMILIES = EXPECTED_NEOTROPICAL_MOTHS_FAMILIES;

/** Familias Moths esperadas por región — solo Neotropical confirmada. */
export const REGION_MOTHS_FAMILIES: Partial<
  Record<(typeof GEOGRAPHIC_REGION_FOLDERS)[number]['id'], readonly string[]>
> = {
  neotropical: EXPECTED_NEOTROPICAL_MOTHS_FAMILIES,
};

/** Familias esperadas para Moths en una REGION (o [] si pendiente). */
export function mothFamiliesForRegion(
  regionId: string | null | undefined,
): readonly string[] {
  if (!regionId) return [];
  return (
    REGION_MOTHS_FAMILIES[
      regionId as (typeof GEOGRAPHIC_REGION_FOLDERS)[number]['id']
    ] ?? []
  );
}

/**
 * Índice 1-based en DRIED_SPECIMEN_CATEGORY_FOLDERS (Rare-Gynan = 1).
 * Avance usuario: 5ª categoría del rubro secos.
 */
export const CURRENT_CATEGORY_FOCUS_INDEX_1BASED = 1 as const;

/**
 * Foco admin actual: Rare -Gynan-Aberrations · × 5 REGIONs · _card/_video.
 * 3 subcarpetas (EXPECTED_RARE_SUBFOLDERS) ×5 · categoría + c/u → `_card`/`_video`.
 * Carpeta Cloudinary exacta: `Rare -Gynan-Aberrations`.
 */
export const CURRENT_CATEGORY_FOCUS = {
  index1Based: CURRENT_CATEGORY_FOCUS_INDEX_1BASED,
  /** Avance de trabajo: 5ª categoría nombrada por el usuario. */
  userSequence: 5 as const,
  id: RARE_GYNAN_CATEGORY.id,
  segment: RARE_GYNAN_CATEGORY_SEGMENT,
  displayLabel: RARE_GYNAN_DISPLAY_LABEL,
  rubroId: 'dried-specimens' as const,
  primaryRegionId: 'neotropical' as const,
  nodePath: NEOTROPICAL_RARE_GYNAN_ROOT,
  cardFolder: `${NEOTROPICAL_RARE_GYNAN_ROOT}/${NODE_MEDIA_SLOT.card}`,
  videoFolder: `${NEOTROPICAL_RARE_GYNAN_ROOT}/${NODE_MEDIA_SLOT.video}`,
  familiesPending: false,
  families: EXPECTED_RARE_SUBFOLDERS,
} as const;

export const KNOWN_ROOTS = {
  region: DEFAULT_ROOT,
  neotropical: DEFAULT_ROOT,
  afrotropical: driedSpecimenRegionRoot('REGION Africa (Afrotropical)'),
  'australasian-oriental': driedSpecimenRegionRoot(
    'REGION Australasian Y Oriental',
  ),
  'holarctic-europe': driedSpecimenRegionRoot('REGION Europe (Holarctic)'),
  nearctic: driedSpecimenRegionRoot('REGION North America (Nearctic)'),
  butterflies: BUTTERFLIES_ROOT,
  legacyNoCites: LEGACY_NO_CITES_ROOT,
  rubro: RUBROS_RUBRO_ROOT,
} as const;

/**
 * Categoría 5 (1-based) en DRIED_SPECIMEN_CATEGORY_FOLDERS — Butterflies.
 * Ya cableada × 5 REGIONs (familias por región).
 */
export const BUTTERFLIES_CATEGORY =
  DRIED_SPECIMEN_CATEGORY_FOLDERS.find(
    (c) => c.id === 'butterflies-lepidoptera-diurne',
  )!;

/** Carpeta Cloudinary exacta (mismo nombre en todas las REGIONs). */
export const BUTTERFLIES_CATEGORY_SEGMENT = BUTTERFLIES_CATEGORY.segment;

/** Label UI — coincide con carpeta Cloudinary (lepidoptera minúscula). */
export const BUTTERFLIES_DISPLAY_LABEL = 'Butterflies (lepidoptera) Diurne';

/**
 * Butterflies(lepidoptera) Diurne bajo CADA REGION del rubro 1.
 * Path: `RUBROS/{dried}/{REGION …}/Butterflies(lepidoptera) Diurne`.
 * Cada una: `_card` + `_video`. Familias: listas por REGION (5/5).
 */
export const BUTTERFLIES_REGION_ROOTS = GEOGRAPHIC_REGION_FOLDERS.map((r) => ({
  id: r.id,
  regionFolder: r.folder,
  nodePath: `${driedSpecimenRegionRoot(r.folder)}/${BUTTERFLIES_CATEGORY_SEGMENT}`,
}));

/** Región Africa — Butterflies Afrotropical. */
export const AFRICA_REGION_FOLDER =
  GEOGRAPHIC_REGION_FOLDERS.find((r) => r.id === 'afrotropical')!.folder;

export const AFRICA_ROOT = driedSpecimenRegionRoot(AFRICA_REGION_FOLDER);

/** Butterflies Diurne bajo Africa (Afrotropical). */
export const AFRICA_BUTTERFLIES_ROOT = `${AFRICA_ROOT}/${BUTTERFLIES_CATEGORY_SEGMENT}`;

/**
 * Familias Butterflies · REGION Africa (Afrotropical) — 5 carpetas.
 * Orden = prioridad de carga. Cada una: `_card` + `_video`.
 * NO reutilizar la lista de 17 Neotropical.
 */
export const EXPECTED_AFRICA_BUTTERFLY_FAMILIES = [
  'Danaidae',
  'Lycaenidae',
  'Nymphalidae',
  'Papilionidae',
  'Pieridae',
] as const;

/** Región Australasian Y Oriental — 2ª en orden. */
export const AUSTRALASIAN_REGION_FOLDER =
  GEOGRAPHIC_REGION_FOLDERS.find((r) => r.id === 'australasian-oriental')!.folder;

export const AUSTRALASIAN_ROOT = driedSpecimenRegionRoot(AUSTRALASIAN_REGION_FOLDER);

/** Butterflies Diurne bajo Australasian Y Oriental. */
export const AUSTRALASIAN_BUTTERFLIES_ROOT = `${AUSTRALASIAN_ROOT}/${BUTTERFLIES_CATEGORY_SEGMENT}`;

/**
 * Carpetas Butterflies · REGION Australasian Y Oriental — 9 nodos.
 * Incluye Ornithoptera / Troides (géneros birdwing tratados como carpetas).
 * Nombres exactos del usuario. Cada una: `_card` + `_video`.
 */
export const EXPECTED_AUSTRALASIAN_BUTTERFLY_FAMILIES = [
  'Amathusidae',
  'Danaidae',
  'Lycaenidae',
  'Nymphalidae',
  'Ornithoptera',
  'Papilionidae',
  'Pieridae',
  'Satyridae',
  'Troides',
] as const;

/**
 * Familias bajo Butterflies(lepidoptera) Diurne — REGION 3 Neotropical.
 * Nombres Cloudinary exactos (17 carpetas). Orden = lista usuario.
 * Hesperidae / Heliconidae / Ithomiidae = spelling Cloudinary (no ICZN).
 * Nymphalidae 1..6 = lotes distintos (no colapsar; no “Nymphaldiae”).
 * Cada una: `_card` + `_video`.
 */
export const EXPECTED_NEOTROPICAL_BUTTERFLY_FAMILIES = [
  'Brassolidae',
  'Danaidae',
  'Heliconidae',
  'Hesperidae',
  'Ithomiidae',
  'Lycaenidae',
  'Morphidae',
  'Nymphalidae 1',
  'Nymphalidae 2',
  'Nymphalidae 3',
  'Nymphalidae 4',
  'Nymphalidae 5',
  'Nymphalidae 6',
  'Papilionidae',
  'Pieridae',
  'Riodinidae',
  'Satyridae',
] as const;

/** Región Europe (Holarctic) — 4ª en orden. */
export const EUROPE_REGION_FOLDER =
  GEOGRAPHIC_REGION_FOLDERS.find((r) => r.id === 'holarctic-europe')!.folder;

export const EUROPE_ROOT = driedSpecimenRegionRoot(EUROPE_REGION_FOLDER);

/** Butterflies Diurne bajo Europe (Holarctic). */
export const EUROPE_BUTTERFLIES_ROOT = `${EUROPE_ROOT}/${BUTTERFLIES_CATEGORY_SEGMENT}`;

/**
 * Familias Butterflies · REGION Europe (Holarctic) — 5 carpetas.
 * Orden = lista usuario. Cada una: `_card` + `_video`.
 * NO reutilizar listas Africa / Neotropical / Australasian.
 */
export const EXPECTED_EUROPE_BUTTERFLY_FAMILIES = [
  'Lycaenidae',
  'Nymphalidae',
  'Papilionidae',
  'Pieridae',
  'Satyridae',
] as const;

/** Región North America (Nearctic) — 5ª en orden. */
export const NEARCTIC_REGION_FOLDER =
  GEOGRAPHIC_REGION_FOLDERS.find((r) => r.id === 'nearctic')!.folder;

export const NEARCTIC_ROOT = driedSpecimenRegionRoot(NEARCTIC_REGION_FOLDER);

/** Butterflies Diurne bajo North America (Nearctic). */
export const NEARCTIC_BUTTERFLIES_ROOT = `${NEARCTIC_ROOT}/${BUTTERFLIES_CATEGORY_SEGMENT}`;

/**
 * Familias Butterflies · REGION North America (Nearctic) — 5 carpetas.
 * Mismo set nominal que Europe; constantes/paths propios (no compartir array).
 * Orden = lista usuario. Cada una: `_card` + `_video`.
 */
export const EXPECTED_NEARCTIC_BUTTERFLY_FAMILIES = [
  'Lycaenidae',
  'Nymphalidae',
  'Papilionidae',
  'Pieridae',
  'Satyridae',
] as const;

/**
 * Familias / nodos Butterflies esperados por región (rubro 1).
 * Las 5 REGIONs tienen lista confirmada.
 */
export const REGION_BUTTERFLY_FAMILIES: Partial<
  Record<(typeof GEOGRAPHIC_REGION_FOLDERS)[number]['id'], readonly string[]>
> = {
  afrotropical: EXPECTED_AFRICA_BUTTERFLY_FAMILIES,
  'australasian-oriental': EXPECTED_AUSTRALASIAN_BUTTERFLY_FAMILIES,
  neotropical: EXPECTED_NEOTROPICAL_BUTTERFLY_FAMILIES,
  'holarctic-europe': EXPECTED_EUROPE_BUTTERFLY_FAMILIES,
  nearctic: EXPECTED_NEARCTIC_BUTTERFLY_FAMILIES,
};

/** Familias esperadas para Butterflies Diurne en una REGION (o []). */
export function butterflyFamiliesForRegion(
  regionId: string | null | undefined,
): readonly string[] {
  if (!regionId) return [];
  return REGION_BUTTERFLY_FAMILIES[
    regionId as (typeof GEOGRAPHIC_REGION_FOLDERS)[number]['id']
  ] ?? [];
}

/**
 * Alias carpeta Cloudinary → nombre ICZN / taxonomía cuando difiere.
 * Sync/UI pueden mapear en ambos sentidos.
 */
export const BUTTERFLY_FAMILY_TAXONOMY_ALIASES: Record<string, string> = {
  Hesperidae: 'Hesperiidae',
  Heliconidae: 'Heliconiidae',
  Hesperiidae: 'Hesperiidae',
  Heliconiidae: 'Heliconiidae',
};
