import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { CloudinaryResourceInfo, CompleteTaxonContext, SpecimenGroup } from './types';

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.');
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

async function upsertOne<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  row: T,
  onConflict: string,
): Promise<string> {
  const { data, error } = await supabase.from(table).upsert(row, { onConflict }).select('id').single();
  if (error) throw new Error(`upsert ${table} (${JSON.stringify(row)}): ${error.message}`);
  return (data as { id: string }).id;
}

// ============================================================================
// Cascada genealógica obligatoria — cada paso EXIGE en su firma el id del
// padre ya resuelto (nada de `string | null`): es imposible en TypeScript
// llamar a upsertGenero() sin un subfamiliaId real, ni a upsertEspecie() sin
// un generoId real. Así el compilador impide que un nivel quede suelto.
// ============================================================================

/** Paso 0 (independiente de la cadena, pero requerido antes del espécimen final): región de Cloudinary. */
export async function upsertRegion(supabase: SupabaseClient, regionName: string): Promise<string> {
  return upsertOne(supabase, 'global_regions', { region_name: regionName }, 'region_name');
}

/** Paso 1: Familia — raíz de la cadena. */
export async function upsertFamilia(supabase: SupabaseClient, familyName: string): Promise<string> {
  return upsertOne(supabase, 'families', { family_name: familyName }, 'family_name');
}

/** Paso 2: Subfamilia — vinculada estrictamente al id de su Familia. */
export async function upsertSubfamilia(
  supabase: SupabaseClient,
  subfamilyName: string,
  familiaId: string,
): Promise<string> {
  return upsertOne(
    supabase,
    'subfamilies',
    { subfamily_name: subfamilyName, family_id: familiaId },
    'subfamily_name',
  );
}

/**
 * Paso 3: Género — vinculado a su Subfamilia si la carpeta la trae, o
 * directo a su Familia cuando no hay subfamilia real (rama opcional; ver
 * migración 0006_genera_optional_subfamily.sql — `genera` exige al menos
 * uno de subfamily_id/family_id, nunca ambos null). Nunca queda suelto.
 */
export async function upsertGenero(
  supabase: SupabaseClient,
  genusName: string,
  parent: { subfamiliaId: string } | { familiaId: string },
): Promise<string> {
  const row =
    'subfamiliaId' in parent
      ? { genus_name: genusName, subfamily_id: parent.subfamiliaId }
      : { genus_name: genusName, family_id: parent.familiaId };
  return upsertOne(supabase, 'genera', row, 'genus_name');
}

/** Paso 4: Especie — vinculada estrictamente al id de su Género (y a la región donde fue registrada). */
export async function upsertEspecie(
  supabase: SupabaseClient,
  generoId: string,
  speciesName: string,
  regionId: string,
): Promise<string> {
  return upsertOne(
    supabase,
    'species',
    { genus_id: generoId, species_name: speciesName, region_id: regionId },
    'genus_id,species_name',
  );
}

/** Paso 5: Subespecie — vinculada estrictamente al id de su Especie. Único nivel opcional de la cadena. */
export async function upsertSubespecie(
  supabase: SupabaseClient,
  especieId: string,
  subspeciesName: string,
): Promise<string> {
  return upsertOne(
    supabase,
    'subspecies',
    { species_id: especieId, subspecies_name: subspeciesName },
    'species_id,subspecies_name',
  );
}

/**
 * Fila denormalizada en `taxonomy` — es la tabla que `specimens.taxonomy_id`
 * referencia de verdad. `species_name` aquí es el nombre científico completo
 * (binomial o trinomial) y funciona como el "scientific_name" único del
 * catálogo; `species_id` ancla siempre a la Especie (nunca a la Subespecie
 * directamente, porque `taxonomy` no tiene columna subspecies_id: la
 * distinción subespecie/especie vive en `classification_type` + el nombre
 * completo en `species_name`).
 */
export async function upsertFilaTaxonomia(
  supabase: SupabaseClient,
  params: {
    especieId: string;
    scientificName: string;
    genusName: string;
    subfamilyName?: string;
    familyName: string;
    orderName?: string;
    classificationType: 'species' | 'subspecies';
  },
): Promise<string> {
  const rankHierarchy = [params.familyName, params.subfamilyName, params.genusName, params.scientificName]
    .filter((part): part is string => Boolean(part))
    .join(' > ');
  return upsertOne(
    supabase,
    'taxonomy',
    {
      species_id: params.especieId,
      species_name: params.scientificName,
      genus_name: params.genusName,
      subfamily_name: params.subfamilyName ?? null,
      family_name: params.familyName,
      order_name: params.orderName ?? null,
      classification_type: params.classificationType,
      rank_hierarchy: rankHierarchy,
    },
    'species_name',
  );
}

/** Paso 6a: Espécimen — apunta a su fila de taxonomía y a su región de Cloudinary. */
export async function upsertEspecimen(
  supabase: SupabaseClient,
  params: {
    scientificName: string;
    taxonomiaId: string;
    regionId: string;
    coverMediaUrl: string | null;
  },
): Promise<string> {
  return upsertOne(
    supabase,
    'specimens',
    {
      species_name: params.scientificName,
      taxonomy_id: params.taxonomiaId,
      region_id: params.regionId,
      media_url: params.coverMediaUrl,
    },
    'media_url',
  );
}

/** Paso 6b: Multimedia del espécimen (una o más fotos/videos por individuo). */
export async function upsertMultimediaEspecimen(
  supabase: SupabaseClient,
  especimenId: string,
  resource: CloudinaryResourceInfo,
  displayOrder: number,
): Promise<void> {
  const { error } = await supabase.from('specimen_media').upsert(
    {
      specimen_id: especimenId,
      media_type: resource.resourceType === 'video' ? 'video' : 'image',
      media_url: resource.secureUrl,
      public_id: resource.publicId,
      display_order: displayOrder,
    },
    { onConflict: 'media_url' },
  );
  if (error) throw new Error(`upsert specimen_media (${resource.publicId}): ${error.message}`);
}

interface ResolvedCascadeIds {
  regionId: string;
  familiaId: string;
  subfamiliaId: string | null;
  generoId: string;
  especieId: string;
  subespecieId: string | null;
}

const cache = {
  regiones: new Map<string, string>(),
  familias: new Map<string, string>(),
  subfamilias: new Map<string, string>(),
  generos: new Map<string, string>(),
  especies: new Map<string, string>(),
};

export function resetUpsertCache(): void {
  cache.regiones.clear();
  cache.familias.clear();
  cache.subfamilias.clear();
  cache.generos.clear();
  cache.especies.clear();
}

/**
 * Resuelve TODA la cadena genealógica en orden estricto de padre a hijo,
 * cacheando en memoria por corrida para no re-consultar lo ya resuelto.
 * `ctx` ya viene validado (ver `missingRequiredLevels` en classifier.ts):
 * región/familia/género/especie siempre presentes. Subfamilia y subespecie
 * son las dos ramas opcionales — si `ctx.subfamilyName` falta, el género se
 * enlaza DIRECTO a la familia (`genera.family_id`, ver migración
 * 0006_genera_optional_subfamily.sql) en vez de inventar una subfamilia que
 * no existe en Cloudinary.
 */
export async function resolveTaxonomyCascade(
  supabase: SupabaseClient,
  ctx: CompleteTaxonContext,
): Promise<ResolvedCascadeIds> {
  // 0. Región (independiente, pero necesaria antes del paso 4 y del espécimen).
  let regionId = cache.regiones.get(ctx.regionName);
  if (!regionId) {
    regionId = await upsertRegion(supabase, ctx.regionName);
    cache.regiones.set(ctx.regionName, regionId);
  }

  // 1. Familia.
  let familiaId = cache.familias.get(ctx.familyName);
  if (!familiaId) {
    familiaId = await upsertFamilia(supabase, ctx.familyName);
    cache.familias.set(ctx.familyName, familiaId);
  }

  // 2. Subfamilia — opcional. Sólo se crea/busca si la carpeta la trae.
  let subfamiliaId: string | null = null;
  if (ctx.subfamilyName) {
    const subfamiliaCacheKey = `${familiaId}:${ctx.subfamilyName}`;
    subfamiliaId = cache.subfamilias.get(subfamiliaCacheKey) ?? null;
    if (!subfamiliaId) {
      subfamiliaId = await upsertSubfamilia(supabase, ctx.subfamilyName, familiaId);
      cache.subfamilias.set(subfamiliaCacheKey, subfamiliaId);
    }
  }

  // 3. Género — enlaza a la subfamilia si existe, si no, directo a la familia.
  const generoCacheKey = `${subfamiliaId ?? `family:${familiaId}`}:${ctx.genusName}`;
  let generoId = cache.generos.get(generoCacheKey);
  if (!generoId) {
    generoId = await upsertGenero(
      supabase,
      ctx.genusName,
      subfamiliaId ? { subfamiliaId } : { familiaId },
    );
    cache.generos.set(generoCacheKey, generoId);
  }

  // 4. Especie — exige generoId ya resuelto (+ región).
  const especieCacheKey = `${generoId}:${ctx.speciesName}`;
  let especieId = cache.especies.get(especieCacheKey);
  if (!especieId) {
    especieId = await upsertEspecie(supabase, generoId, ctx.speciesName, regionId);
    cache.especies.set(especieCacheKey, especieId);
  }

  // 5. Subespecie — exige especieId ya resuelto. Rama opcional.
  let subespecieId: string | null = null;
  if (ctx.subspeciesName) {
    subespecieId = await upsertSubespecie(supabase, especieId, ctx.subspeciesName);
  }

  return { regionId, familiaId, subfamiliaId, generoId, especieId, subespecieId };
}

export function buildScientificName(ctx: CompleteTaxonContext): string {
  return ctx.subspeciesName ? `${ctx.genusName} ${ctx.speciesName} ${ctx.subspeciesName}` : `${ctx.genusName} ${ctx.speciesName}`;
}

/** Paso 6 completo: resuelve la cascada 1→5, upsertea la fila de taxonomía, el espécimen y su multimedia. */
export async function syncSpecimenGroup(
  supabase: SupabaseClient,
  ctx: CompleteTaxonContext,
  group: SpecimenGroup,
): Promise<{ specimenId: string; mediaCount: number }> {
  const ids = await resolveTaxonomyCascade(supabase, ctx);
  const scientificName = buildScientificName(ctx);

  const taxonomiaId = await upsertFilaTaxonomia(supabase, {
    especieId: ids.especieId,
    scientificName,
    genusName: ctx.genusName,
    subfamilyName: ctx.subfamilyName,
    familyName: ctx.familyName,
    orderName: ctx.orderName,
    classificationType: ctx.subspeciesName ? 'subspecies' : 'species',
  });

  const sortedResources = [...group.resources].sort((a, b) => a.publicId.localeCompare(b.publicId));
  const coverMediaUrl = sortedResources[0]?.secureUrl ?? null;

  const specimenId = await upsertEspecimen(supabase, {
    scientificName,
    taxonomiaId,
    regionId: ids.regionId,
    coverMediaUrl,
  });

  let displayOrder = 0;
  for (const resource of sortedResources) {
    await upsertMultimediaEspecimen(supabase, specimenId, resource, displayOrder);
    displayOrder += 1;
  }

  return { specimenId, mediaCount: sortedResources.length };
}
