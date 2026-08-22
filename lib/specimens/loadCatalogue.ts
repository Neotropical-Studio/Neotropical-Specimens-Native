import { sql } from '@/lib/db';

export async function loadCatalogueSpecimens() {
  try {
    const rawData = await sql`SELECT * FROM especies;`;

    const mappedSpecimens = rawData.map((row: any) => ({
      id: String(row.id || row.codigo || Math.random()),
      name: row.name || row.especie || row.nombre || row.scientific_name || 'Especie',
      scientificName: row.scientific_name || row.nombre_cientifico || row.name || '',
      familyId: String(row.family_id || row.familia || row.family || '').toLowerCase().trim(),
      categoryId: String(row.category_id || 'butterflies-lepidoptera-diurne').toLowerCase().trim(),
      rubroId: String(row.rubro_id || 'dried-specimens').toLowerCase().trim(),
      regionId: String(row.region_id || 'neotropical').toLowerCase().trim(),
    }));

    return { specimens: mappedSpecimens, error: null };
  } catch (err: any) {
    console.error('⚠️ Error al consultar la base de datos:', err.message);
    return { specimens: [], error: null };
  }
}
