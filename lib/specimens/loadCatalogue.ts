import { sql } from '@/lib/db';

export async function loadCatalogueSpecimens() {
  try {
    const rawData = await sql`SELECT * FROM especies;`;

    const mappedSpecimens = rawData.map((row: any) => ({
      id: String(row.id || row.codigo || Math.random()),
      name: row.name || row.especie || row.nombre || row.scientific_name || 'Especie',
      scientificName: row.scientific_name || row.nombre_cientifico || row.name || '',
      familyId: String(row.family_id || row.familia || row.family || 'morphidae').toLowerCase().trim(),
      categoryId: String(row.category_id || row.categoria || 'butterflies-lepidoptera-diurne').toLowerCase().trim(),
      // Forzamos el ID exacto que usa el filtro visual del frontend
      rubroId: 'dried-specimens',
      regionId: String(row.region_id || row.region || 'neotropical').toLowerCase().trim(),
    }));

    return { specimens: mappedSpecimens, error: null };
  } catch (err: any) {
    console.error('⚠️ Error al consultar la base de datos:', err.message);
    return { specimens: [], error: null };
  }
}
