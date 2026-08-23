import 'server-only';
import { loadCatalogRowById } from './catalog';
import { toSpecimenDetail, type SpecimenDetailView } from './detail';

export async function getSpecimenById(
  id: string,
  lang: string,
): Promise<SpecimenDetailView | null> {
  try {
    const { row } = await loadCatalogRowById(undefined, id);
    return row ? toSpecimenDetail(row, lang) : null;
  } catch (error) {
    console.error(`Error al cargar el espécimen ${id} desde Neon:`, error);
    return null;
  }
}