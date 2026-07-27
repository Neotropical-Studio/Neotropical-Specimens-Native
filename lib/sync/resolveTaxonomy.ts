import type { SupabaseClient } from '@supabase/supabase-js';

export const TAXON_PROJECTION = '';

export async function createFreeTaxonomy(
  db: SupabaseClient,
  categoryId: string,
  values: { family?: string; subfamily?: string; genus?: string; species?: string },
): Promise<string> {
  const rankHierarchy = {
    family: values.family ?? null,
    subfamily: values.subfamily ?? null,
    genus: values.genus ?? null,
    species: values.species ?? null,
  };

  const { data, error } = await db
    .from('taxonomy')
    .insert({ category_id: categoryId, rank_hierarchy: rankHierarchy, sanity_id: null })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}
