import { loadUniversalCatalogueRows } from './catalogueDb';
import { toSpecimenView, type SpecimenRow } from './view';

export const dynamic = 'force-dynamic';

export interface CatalogRowsResult {
  rows: SpecimenRow[];
  error: string | null;
}

export async function loadCatalogRows(_client?: unknown): Promise<CatalogRowsResult> {
  try {
    const { rows, error } = await loadUniversalCatalogueRows();
    if (rows.length === 0) {
      return { rows: [], error: error ?? 'Catálogo vacío' };
    }
    return { rows, error };
  } catch (error) {
    console.error('Error al cargar filas del catálogo desde Neon:', error);
    return { rows: [], error: error instanceof Error ? error.message : 'Error en Neon DB' };
  }
}

export async function loadCatalogRowById(
  _client: unknown,
  id: string,
): Promise<{ row: SpecimenRow | null; error: string | null }> {
  try {
    const result = await loadUniversalCatalogueRows();
    const row = result.rows.find((item) => item.id === id || item.catalog_code === id) ?? null;
    if (!row) {
      console.error(`No se encontró el espécimen ${id} en Neon.`);
      return { row: null, error: 'Espécimen no encontrado' };
    }
    return { row, error: null };
  } catch (error) {
    console.error(`Error al cargar el espécimen ${id} desde Neon:`, error);
    return { row: null, error: error instanceof Error ? error.message : 'Error en Neon DB' };
  }
}

export async function loadCatalogPool(
  _client: unknown,
  limit: number,
): Promise<SpecimenRow[]> {
  try {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
    const { rows } = await loadUniversalCatalogueRows();
    const limited = rows.slice(0, safeLimit);
    if (limited.length === 0) console.error('La consulta del grupo de catálogo no devolvió datos.');
    return limited;
  } catch (error) {
    console.error('Error al cargar el grupo de catálogo desde Neon:', error);
    return [];
  }
}

export async function getCatalogueCategories(rubroSlug?: string, regionSlug?: string) {
  try {
    const { rows } = await loadUniversalCatalogueRows();
    const groups = new Map<string, { id: string; nombre: string; name: string; slug: string; total_especimenes: number; count: number; image: string; imagen_url: string }>();
    for (const specimen of rows.map(toSpecimenView)) {
      const label = specimen.categoria ?? specimen.rubroLabel ?? 'Sin categoría';
      const id = label.toLowerCase();
      const current = groups.get(id) ?? { id, nombre: label, name: label, slug: id.replace(/\s+/g, '-'), total_especimenes: 0, count: 0, image: specimen.primaryImage ?? '', imagen_url: specimen.primaryImage ?? '' };
      current.count += 1;
      current.total_especimenes = current.count;
      groups.set(id, current);
    }
    return [...groups.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return [];
  }
}

export async function getCatalogueFamilies(categorySlug?: string) {
  try {
    const { rows } = await loadUniversalCatalogueRows();
    const groups = new Map<string, { id: string; nombre: string; name: string; slug: string; total_especimenes: number; count: number; image: string; imagen_url: string }>();
    for (const specimen of rows.map(toSpecimenView)) {
      const label = specimen.family ?? 'Sin familia';
      const id = label.toLowerCase();
      const current = groups.get(id) ?? { id, nombre: label, name: label, slug: id.replace(/\s+/g, '-'), total_especimenes: 0, count: 0, image: specimen.primaryImage ?? '', imagen_url: specimen.primaryImage ?? '' };
      current.count += 1;
      current.total_especimenes = current.count;
      groups.set(id, current);
    }
    return [...groups.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  } catch (error) {
    console.error('Error al obtener familias:', error);
    return [];
  }
}
