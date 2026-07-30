// Carga SSR del inventario para páginas de navegación del catálogo.
import { createClient } from '@supabase/supabase-js';
import { loadCatalogRows } from '@/lib/specimens/catalog';
import { toSpecimenView, type SpecimenView } from '@/lib/specimens/view';

export async function loadCatalogueSpecimens(): Promise<{
  specimens: SpecimenView[];
  error: string | null;
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !key) {
    return { specimens: [], error: 'Supabase no configurado' };
  }
  try {
    const { rows, error } = await loadCatalogRows(createClient(url, key));
    return {
      specimens: rows.map((row) => toSpecimenView(row)),
      error,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error cargando catálogo';
    return { specimens: [], error: message };
  }
}
