// ============================================================================
// Orquestación del sync Sanity → Supabase para un espécimen: dereferencia el
// documento en Sanity, resuelve las FKs (categoría/región/taxonomía) y hace
// upsert en `specimens`/`taxonomy`. Ancla cada fila a su documento de origen
// vía `sanity_id` (migración 0002) para que updates/deletes sean idempotentes.
//
// Se llama desde app/api/sync/specimens/route.ts (invocado por n8n luego de
// que app/api/webhooks/sanity relaya el evento crudo).
// ============================================================================
import { sanity } from '@/lib/sanity/client';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { isWithinSpecimenFolder, SPECIMEN_KIND_FOLDERS, type SpecimenKind } from '@/lib/cloudinary/paths';
import {
  buildAttributes,
  buildMediaAssets,
  buildPricing,
  buildRankHierarchy,
  type SanitySpecimenDoc,
} from './mapSpecimen';

export interface SyncResult {
  action: 'upserted' | 'deleted';
  specimenId?: string;
  warnings: string[];
}

// Fragmento reutilizable: Género→Subfamilia→Familia→Rubro. Se usa tanto para
// una `especie` (su propio `genero`) como para una `subespecie` (el `genero`
// de SU `especie`) — ver buildRankHierarchy en lib/sync/mapSpecimen.ts.
const GENERO_CHAIN = `name, "subfamilia": subfamilia->{ name, "familia": familia->{ name, "rubro": rubro->{ name } } }`;

const SPECIMEN_PROJECTION = `{
  _id, _type, specimenCode, category, region, specimenKind,
  retailPrice, wholesalePrice, wholesaleMinQty, currency, stock,
  sex, gradeCode, gradeName, wingspanMm, primaryColors, countryOrigin, gpsCoordinates,
  commonNames, description, themePrimary, themeAccent, themeSurface, media,
  "taxon": taxon->{
    "_id": _id, _type, name,
    "genero": genero->{ ${GENERO_CHAIN} },
    "especie": especie->{ name, "genero": genero->{ ${GENERO_CHAIN} } }
  }
}`;

function stripDraft(id: string): string {
  return id.replace(/^drafts\./, '');
}

async function resolveCategoryId(
  db: ReturnType<typeof getSupabaseAdmin>,
  slug: string | null | undefined,
  warnings: string[],
): Promise<string | null> {
  if (!slug) return null;
  const { data, error } = await db.from('categories').select('id').eq('slug', slug).maybeSingle();
  if (error) throw error;
  if (!data) {
    warnings.push(`categories: no existe slug "${slug}" — se sincroniza sin categoría`);
    return null;
  }
  return data.id as string;
}

async function resolveRegionId(
  db: ReturnType<typeof getSupabaseAdmin>,
  code: string | null | undefined,
  warnings: string[],
): Promise<string | null> {
  if (!code) return null;
  const { data, error } = await db.from('global_regions').select('id').eq('code', code).maybeSingle();
  if (error) throw error;
  if (!data) {
    warnings.push(`global_regions: no existe code "${code}" — se sincroniza sin región`);
    return null;
  }
  return data.id as string;
}

// Defensa en profundidad: el Studio ya valida esto por campo, pero el sync no
// debería confiar únicamente en la validación de un editor humano — un doc
// publicado sin pasar por el Studio (import masivo, API directa) podría traer
// media fuera de su carpeta y servir fotos de otro rubro/región.
function checkMediaFolders(doc: SanitySpecimenDoc, warnings: string[]): void {
  const kind = doc.specimenKind as SpecimenKind | undefined;
  if (!kind || !(kind in SPECIMEN_KIND_FOLDERS) || !doc.region) return;

  for (const item of doc.media ?? []) {
    if (item?.cloudinaryId && !isWithinSpecimenFolder(item.cloudinaryId, kind, doc.region)) {
      warnings.push(
        `media "${item.cloudinaryId}" no vive bajo la carpeta esperada para ${kind}/${doc.region}`,
      );
    }
  }
}

async function resolveTaxonomyId(
  db: ReturnType<typeof getSupabaseAdmin>,
  taxon: SanitySpecimenDoc['taxon'],
  categoryId: string | null,
  warnings: string[],
): Promise<string | null> {
  if (!taxon?._id) {
    warnings.push('taxon: el espécimen no referencia un taxonomicNode');
    return null;
  }

  const rankHierarchy = buildRankHierarchy(taxon);
  if (!Object.keys(rankHierarchy).length) {
    warnings.push(`taxon (${taxon._id}): rank_hierarchy vacío — revisa el nodo en Sanity`);
    return null;
  }

  const taxonSanityId = stripDraft(taxon._id);
  const row = { category_id: categoryId, rank_hierarchy: rankHierarchy, sanity_id: taxonSanityId };

  const { data, error } = await db
    .from('taxonomy')
    .upsert(row, { onConflict: 'sanity_id' })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

// Único punto de entrada: dereferencia el doc en Sanity y decide upsert/delete
// según exista o no — así el endpoint no depende de que n8n reporte bien el
// tipo de operación (create/update/delete), que es la parte frágil del evento.
export async function syncSpecimenFromSanity(rawId: string): Promise<SyncResult> {
  const id = stripDraft(rawId);
  const db = getSupabaseAdmin();
  const warnings: string[] = [];

  const doc = await sanity.fetch<SanitySpecimenDoc | null>(
    `*[_id == $id && _type == "specimen"][0] ${SPECIMEN_PROJECTION}`,
    { id },
  );

  if (!doc) {
    const { error } = await db.from('specimens').delete().eq('sanity_id', id);
    if (error) throw error;
    return { action: 'deleted', warnings };
  }

  if (!doc.specimenCode) {
    throw new Error(`specimen ${id}: falta specimenCode, no se puede sincronizar`);
  }

  const categoryId = await resolveCategoryId(db, doc.category, warnings);
  const regionId = await resolveRegionId(db, doc.region, warnings);
  const taxonomyId = await resolveTaxonomyId(db, doc.taxon, categoryId, warnings);
  checkMediaFolders(doc, warnings);

  const row = {
    sanity_id: id,
    specimen_code: doc.specimenCode,
    global_region_id: regionId,
    taxonomy_id: taxonomyId,
    pricing: buildPricing(doc),
    stock: typeof doc.stock === 'number' ? doc.stock : 1,
    attributes: buildAttributes(doc),
    media_assets: buildMediaAssets(doc),
  };

  const { data, error } = await db
    .from('specimens')
    .upsert(row, { onConflict: 'sanity_id' })
    .select('id')
    .single();

  if (error) throw error;
  return { action: 'upserted', specimenId: data.id as string, warnings };
}
