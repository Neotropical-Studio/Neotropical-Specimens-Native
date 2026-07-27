// ============================================================================
// Resolución de taxonomía Sanity → Supabase, extraída de upsertSpecimen.ts
// para compartirla con el panel admin (Sección 1: autocompletado taxonómico).
// Un espécimen creado en el panel que referencia un taxón YA existente en
// Sanity debe reutilizar la MISMA fila de `taxonomy` (por sanity_id) que
// tocaría un sync posterior — nunca duplicarla.
// ============================================================================
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { buildRankHierarchy, type SanityTaxonRef } from './mapSpecimen';

// Género→Subfamilia→Familia→Rubro dereferenciado — común a `especie` y a la
// `especie` de una `subespecie`.
export const GENERO_CHAIN = `name, "subfamilia": subfamilia->{ name, "familia": familia->{ name, "rubro": rubro->{ name } } }`;

// Proyección GROQ para dereferenciar un taxon (especie|subespecie) hasta
// rubro — reutilizada por el sync (specimen.taxon) y por el panel admin
// (lib/sync/resolveTaxonomy.ts + app/admin/especimenes/actions.ts).
export const TAXON_PROJECTION = `{
  "_id": _id, _type, name,
  "genero": genero->{ ${GENERO_CHAIN} },
  "especie": especie->{ name, "genero": genero->{ ${GENERO_CHAIN} } }
}`;

function stripDraft(id: string): string {
  return id.replace(/^drafts\./, '');
}

export async function resolveTaxonomyId(
  db: ReturnType<typeof getSupabaseAdmin>,
  taxon: SanityTaxonRef | null | undefined,
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

// Camino alterno para un taxón escrito a mano en el panel admin (sin
// contraparte en Sanity todavía): crea una fila Supabase-only (sanity_id
// null), consistente con rank_hierarchy ya descrito como "espejo
// desnormalizado" en vez de fuente estricta.
export async function createFreeTaxonomy(
  db: ReturnType<typeof getSupabaseAdmin>,
  categoryId: string | null,
  rankHierarchy: Record<string, string | null | undefined>,
): Promise<string> {
  const cleaned = Object.fromEntries(
    Object.entries(rankHierarchy).filter(([, v]) => typeof v === 'string' && v.trim()),
  );

  const { data, error } = await db
    .from('taxonomy')
    .insert({ category_id: categoryId, rank_hierarchy: cleaned, sanity_id: null })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}
