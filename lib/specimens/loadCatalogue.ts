import { sql } from '@/lib/db';

export async function loadCatalogueSpecimens() {
  try {
    const rawData = await sql`SELECT * FROM especies LIMIT 2000;`;

    const mappedSpecimens = rawData.map((row: any) => ({
      id: row.id || row.codigo || row.code || String(Math.random()),
      name: row.name || row.especie || row.nombre || row.nombre_comun || row.scientific_name || 'Sin nombre',
      scientificName: row.scientific_name || row.nombre_cientifico || row.scientificname || row.name || '',
      familyId: String(row.family_id || row.familia || row.family || '').toLowerCase().trim(),
      categoryId: String(row.category_id || row.categoria || row.category || '').toLowerCase().trim(),
      rubroId: String(row.rubro_id || row.rubro || 'dried-specimens').toLowerCase().trim(),
      regionId: String(row.region_id || row.region || 'neotropical').toLowerCase().trim(),
    }));

    return { specimens: mappedSpecimens, error: null };
  } catch (err: any) {
    console.error('⚠️ Error al consultar la base de datos:', err.message);
    return { specimens: [], error: null };
  }
}
