// ============================================================================
// Heurística de clasificación taxonómica para el árbol de carpetas de
// Cloudinary. No asume nombres de carpeta fijos (evita repetir el error de
// "inventar" rutas que no existen, igual que con el esquema de Supabase):
// se apoya en las reglas de nomenclatura zoológica (ICZN), que son estables
// sin importar cómo esté organizado literalmente cada folder:
//   - Familia   → sufijo obligatorio "-idae"  (Nymphalidae, Papilionidae...)
//   - Subfamilia→ sufijo obligatorio "-inae"  (Morphinae, Charaxinae...) —
//                 OPCIONAL: la cuenta real de Cloudinary tiene familias
//                 clásicas (MORPHIDAE, BRASSOLIDAE, DANAIDAE...) colgando
//                 directo del catálogo, sin subcarpeta -inae debajo.
//   - Tribu     → sufijo obligatorio "-ini"   (no tiene columna propia; se
//                 atraviesa pero no se persiste)
//   - Género    → palabra capitalizada sin esos sufijos (Morpho, Caligo...)
//   - Especie    → epíteto en minúsculas (helenor, peleides...)
//   - Subespecie → segundo epíteto anidado bajo la especie — OPCIONAL.
//   - Región    → carpeta que empieza con "region"/"región" (como en el
//                 ejemplo real "REGION Central South America Neotropical")
//
// Obligatorio sin excepción: región → familia → género → especie. Subfamilia
// y subespecie son las dos únicas ramas opcionales de la cadena (ver
// `resolveTaxonomyCascade` en supabase-upsert.ts para cómo se enlaza el
// género directo a su familia cuando no hay subfamilia real).
//
// Carpetas que no calzan con ninguna regla (p.ej. "catálogos") se reportan
// como `unclassified` en vez de forzarlas a alguna categoría: es preferible
// dejarlas fuera del sync a clasificar mal un espécimen real.
// ============================================================================

import type {
  ClassifiedLeaf,
  CloudinaryResourceInfo,
  CompleteTaxonContext,
  DiscoveryReport,
  FolderNode,
  SegmentClassification,
  SpecimenGroup,
  TaxonContext,
  UnclassifiedFolder,
} from './types';

const REGION_PREFIX_RE = /^regi[oó]n[\s_-]+(.+)$/i;
const FAMILY_SUFFIX_RE = /^[a-z]+idae$/i;
const SUBFAMILY_SUFFIX_RE = /^[a-z]+inae$/i;
const TRIBE_SUFFIX_RE = /^[a-z]+ini$/i;
const CAPITALIZED_WORD_RE = /^[A-ZÀ-Ý][a-zà-ÿ]+$/;
const LOWERCASE_WORD_RE = /^[a-zà-ÿ]+$/;

function titleCase(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function lowerCase(word: string): string {
  return word.toLowerCase();
}

export function classifySegment(rawSegment: string): SegmentClassification {
  const raw = rawSegment;
  const segment = rawSegment.trim().replace(/\s+/g, ' ');

  const regionMatch = segment.match(REGION_PREFIX_RE);
  if (regionMatch) {
    return { kind: 'region', value: regionMatch[1].trim(), raw };
  }

  const tokens = segment.split(/[\s_]+/).filter(Boolean);

  // Carpetas reales tipo "NYMPHALIDAE 1" / "NYMPHALIDAE VARIADOS" (lotes de
  // subida de una misma familia, no un nivel taxonómico nuevo): si el PRIMER
  // token ya es -idae/-inae por sí solo, se usa ese token como nombre y el
  // resto se descarta como etiqueta de lote — nunca se inventa un nivel a
  // partir del sufijo numérico/"VARIADOS".
  if (tokens.length > 1) {
    if (FAMILY_SUFFIX_RE.test(tokens[0])) return { kind: 'family', value: titleCase(tokens[0]), raw };
    if (SUBFAMILY_SUFFIX_RE.test(tokens[0])) return { kind: 'subfamily', value: titleCase(tokens[0]), raw };
  }

  if (tokens.length === 1) {
    const word = tokens[0];
    if (FAMILY_SUFFIX_RE.test(word)) return { kind: 'family', value: titleCase(word), raw };
    if (SUBFAMILY_SUFFIX_RE.test(word)) return { kind: 'subfamily', value: titleCase(word), raw };
    if (TRIBE_SUFFIX_RE.test(word)) return { kind: 'tribe', value: titleCase(word), raw };
    if (CAPITALIZED_WORD_RE.test(word)) return { kind: 'genus', value: titleCase(word), raw };
    if (LOWERCASE_WORD_RE.test(word)) return { kind: 'species', value: lowerCase(word), raw };
    return { kind: 'unknown', value: segment, raw };
  }

  if (tokens.length === 2 && CAPITALIZED_WORD_RE.test(tokens[0]) && LOWERCASE_WORD_RE.test(tokens[1])) {
    return { kind: 'binomial', value: `${titleCase(tokens[0])}|${lowerCase(tokens[1])}`, raw };
  }

  if (
    tokens.length === 3 &&
    CAPITALIZED_WORD_RE.test(tokens[0]) &&
    LOWERCASE_WORD_RE.test(tokens[1]) &&
    LOWERCASE_WORD_RE.test(tokens[2])
  ) {
    return {
      kind: 'trinomial',
      value: `${titleCase(tokens[0])}|${lowerCase(tokens[1])}|${lowerCase(tokens[2])}`,
      raw,
    };
  }

  return { kind: 'unknown', value: segment, raw };
}

const VIEW_TOKEN_RE =
  /^(dorsal|ventral|dorso|habitus|label|etiqueta|detail|detalle|macro|frontal|posterior|frente|reverso|anverso|superior|inferior|closeup|close-up|cover|portada|main|principal)$/i;
const SEX_TOKEN_RE = /^(m|f|male|female|macho|hembra)$/i;

function groupKeyFor(publicId: string): string {
  const basename = publicId.split('/').pop() ?? publicId;
  const tokens = basename.split(/[_\-\s]+/).filter(Boolean);
  const kept = tokens.filter((t) => !VIEW_TOKEN_RE.test(t) && !SEX_TOKEN_RE.test(t) && !/^\d+$/.test(t));
  const key = (kept.length > 0 ? kept : tokens).join('_').toLowerCase();
  return key || basename.toLowerCase();
}

/**
 * Agrupa los assets de una carpeta hoja en "especímenes": fotos que
 * comparten el mismo nombre base salvo por un sufijo de vista
 * (dorsal/ventral/label/...) o un índice numérico se consideran el mismo
 * individuo físico. Si no hay patrón reconocible, cada archivo es su propio
 * espécimen (comportamiento seguro por defecto: nunca fusiona de más).
 */
export function groupResourcesIntoSpecimens(resources: CloudinaryResourceInfo[]): SpecimenGroup[] {
  const byKey = new Map<string, CloudinaryResourceInfo[]>();
  for (const resource of resources) {
    const key = groupKeyFor(resource.publicId);
    const list = byKey.get(key) ?? [];
    list.push(resource);
    byKey.set(key, list);
  }
  return Array.from(byKey.entries()).map(([groupKey, groupResources]) => ({
    groupKey,
    resources: groupResources.sort((a, b) => a.publicId.localeCompare(b.publicId)),
  }));
}

function applyClassification(ctx: TaxonContext, classification: SegmentClassification): TaxonContext {
  const next = { ...ctx };
  switch (classification.kind) {
    case 'region':
      next.regionName = classification.value;
      break;
    case 'family':
      next.familyName = classification.value;
      break;
    case 'subfamily':
      next.subfamilyName = classification.value;
      break;
    case 'tribe':
      // Sin columna propia en el esquema actual: se atraviesa sin persistir.
      break;
    case 'genus':
      next.genusName = classification.value;
      break;
    case 'binomial': {
      const [genus, species] = classification.value.split('|');
      next.genusName = genus;
      next.speciesName = species;
      break;
    }
    case 'trinomial': {
      const [genus, species, subspecies] = classification.value.split('|');
      next.genusName = genus;
      next.speciesName = species;
      next.subspeciesName = subspecies;
      break;
    }
    case 'species':
      if (!next.genusName) break; // epíteto suelto sin género conocido: no se puede anclar, se ignora aquí.
      if (!next.speciesName) next.speciesName = classification.value;
      else next.subspeciesName = classification.value; // segundo epíteto anidado → subespecie.
      break;
    case 'unknown':
      break;
  }
  return next;
}

const REQUIRED_LEVELS: { key: keyof TaxonContext; label: string }[] = [
  { key: 'regionName', label: 'región' },
  { key: 'familyName', label: 'familia (sufijo -idae)' },
  { key: 'genusName', label: 'género' },
  { key: 'speciesName', label: 'especie' },
];

/**
 * Valida el mínimo genealógico obligatorio: región → familia → género →
 * especie (nada de niveles sueltos). Subfamilia y subespecie son opcionales
 * — la estructura real de Cloudinary no siempre tiene una subcarpeta -inae
 * bajo la familia (p.ej. MORPHIDAE, BRASSOLIDAE cuelgan directo del
 * catálogo, sin subfamilia). Si falta algún nivel obligatorio, devuelve la
 * lista de niveles ausentes en vez de adivinar o dejar huecos — el llamador
 * decide qué hacer (reportar en `unclassified`).
 */
export function missingRequiredLevels(ctx: TaxonContext): string[] {
  return REQUIRED_LEVELS.filter((level) => !ctx[level.key]).map((level) => level.label);
}

function isCompleteContext(ctx: TaxonContext): ctx is CompleteTaxonContext {
  return missingRequiredLevels(ctx).length === 0;
}

export function classifyTree(nodes: FolderNode[]): DiscoveryReport {
  const leaves: ClassifiedLeaf[] = [];
  const unclassified: UnclassifiedFolder[] = [];
  const regionsFound = new Set<string>();

  function walk(node: FolderNode, ctx: TaxonContext) {
    const classification = classifySegment(node.name);
    const nextCtx = applyClassification(ctx, classification);
    if (nextCtx.regionName) regionsFound.add(nextCtx.regionName);

    if (node.resources.length > 0) {
      if (isCompleteContext(nextCtx)) {
        leaves.push({
          folderPath: node.path,
          context: nextCtx,
          specimenGroups: groupResourcesIntoSpecimens(node.resources),
        });
      } else {
        const missing = missingRequiredLevels(nextCtx);
        unclassified.push({
          folderPath: node.path,
          reason:
            classification.kind === 'unknown' && missing.length === REQUIRED_LEVELS.length
              ? `Carpeta "${node.name}" no coincide con ninguna convención taxonómica reconocida (región/familia/género/especie).`
              : `Cadena genealógica incompleta — faltan: ${missing.join(', ')}. Ningún nivel obligatorio puede quedar suelto; revisa la estructura de carpetas hasta aquí.`,
          resourceCount: node.resources.length,
        });
      }
    }

    for (const child of node.children) walk(child, nextCtx);
  }

  for (const root of nodes) walk(root, {});

  return { leaves, unclassified, regionsFound };
}
