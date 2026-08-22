import { sql } from '@/lib/db';

export async function loadCatalogueSpecimens() {
  try {
    const rawData = await sql`SELECT * FROM especies;`;

    const mappedSpecimens = rawData.map((row: any) => {
      const rawCat = String(row.category_id || '').toLowerCase().trim();
      const rawFamily = String(row.family_id || row.familia || row.family || '').toLowerCase().trim();

      return {
        id: String(row.id || row.codigo || Math.random()),
        name: row.name || row.especie || row.nombre || row.scientific_name || 'Especie',
        scientificName: row.scientific_name || row.nombre_cientifico || row.name || '',
        familyId: rawFamily || 'morphidae',
        categoryId: rawCat || 'butterflies-lepidoptera-diurne',
        rubroId: 'dried-specimens',
        regionId: 'neotropical',
      };
    });

    return { specimens: mappedSpecimens, error: null };
  } catch (err: any) {
    console.error('⚠️ Error al consultar la base de datos:', err.message);
    return { specimens: [], error: null };
  }
}
