import { loadUniversalCatalogueRows } from './catalogueDb';
import type { SpecimenView } from './view';
import { toSpecimenView } from './view';

export async function loadCatalogueSpecimens(): Promise<{
  specimens: SpecimenView[];
  error: string | null;
}> {
  try {
    const result = await loadUniversalCatalogueRows();
    const specimens = result.rows.map(toSpecimenView);

    if (specimens.length === 0) {
      return { specimens: [], error: result.error ?? 'Catálogo vacío' };
    }

    return { specimens, error: null };
  } catch (error: unknown) {
    console.error('Error al cargar catálogo:', error);
    const message = error instanceof Error ? error.message : 'Error en DB';
    return { specimens: [], error: message };
  }
}
