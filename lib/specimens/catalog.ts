// ============================================================================
// Carga dinámica del catálogo desde Supabase (specimens + taxonomy + region +
// specimen_media). Una sola ruta para SSR, API y sync en cliente — sin listas
// estáticas ni perfiles hardcodeados como fuente de inventario.
// ============================================================================
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  attachMedia,
  fetchSpecimenMedia,
  SPECIMEN_SELECT,
  type SpecimenRow,
} from './view';

export type CatalogSpecimenRow = SpecimenRow & { specimen_media: import('./view').MediaRow[] };

/** Inventario completo ordenado por alta (más reciente primero). */
export async function loadCatalogRows(
  supabase: SupabaseClient,
): Promise<{ rows: CatalogSpecimenRow[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('specimens')
      .select(SPECIMEN_SELECT)
      .order('created_at', { ascending: false });

    const rows = (data ?? []) as SpecimenRow[];
    const mediaById = await fetchSpecimenMedia(
      supabase,
      rows.map((r) => r.id).filter(Boolean),
    );

    return {
      rows: attachMedia(rows, mediaById),
      error: error?.message ?? null,
    };
  } catch (err) {
    // Red / PostgREST caído: nunca tumbar SSR de la portada.
    const message = err instanceof Error ? err.message : 'Error cargando inventario';
    return { rows: [], error: message };
  }
}

/** Una ficha por id, con multimedia adjunta. */
export async function loadCatalogRowById(
  supabase: SupabaseClient,
  id: string,
): Promise<{ row: CatalogSpecimenRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from('specimens')
    .select(SPECIMEN_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) return { row: null, error: error.message };
  if (!data) return { row: null, error: null };

  const mediaById = await fetchSpecimenMedia(supabase, [id]);
  const [row] = attachMedia([data as SpecimenRow], mediaById);
  return { row, error: null };
}

/** Pool para recomendaciones / vitrinas relacionadas. */
export async function loadCatalogPool(
  supabase: SupabaseClient,
  limit: number,
): Promise<CatalogSpecimenRow[]> {
  const { data } = await supabase
    .from('specimens')
    .select(SPECIMEN_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as SpecimenRow[];
  if (rows.length === 0) return [];
  const mediaById = await fetchSpecimenMedia(
    supabase,
    rows.map((r) => r.id),
  );
  return attachMedia(rows, mediaById);
}
