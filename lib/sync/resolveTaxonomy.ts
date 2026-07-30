import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Inserta fila en `taxonomy` con columnas LIVE (sin category_id / sanity_id).
 * rank_hierarchy es texto plano en live.
 * `order` = orden biológico (Lepidoptera…), no pedido e-commerce.
 */
export async function createFreeTaxonomy(
  db: SupabaseClient,
  _categoryId: string,
  values: {
    order?: string;
    family?: string;
    subfamily?: string;
    genus?: string;
    species?: string;
  },
): Promise<string> {
  const parts = [values.order, values.family, values.subfamily, values.genus, values.species].filter(
    (p): p is string => Boolean(p && p.trim()),
  );

  const { data, error } = await db
    .from('taxonomy')
    .insert({
      species_name: values.species?.trim() || null,
      genus_name: values.genus?.trim() || null,
      subfamily_name: values.subfamily?.trim() || null,
      family_name: values.family?.trim() || null,
      order_name: values.order?.trim() || null,
      rank_hierarchy: parts.join(' > ') || null,
    })
    .select('id')
    .single();

  if (error) {
    // Fallback si order_name no existe en algún entorno antiguo
    if (/order_name|column .* does not exist|Could not find/i.test(error.message)) {
      const { data: d2, error: e2 } = await db
        .from('taxonomy')
        .insert({
          species_name: values.species?.trim() || null,
          genus_name: values.genus?.trim() || null,
          subfamily_name: values.subfamily?.trim() || null,
          family_name: values.family?.trim() || null,
          rank_hierarchy: parts.join(' > ') || null,
        })
        .select('id')
        .single();
      if (e2) throw e2;
      return d2.id as string;
    }
    throw error;
  }
  return data.id as string;
}
