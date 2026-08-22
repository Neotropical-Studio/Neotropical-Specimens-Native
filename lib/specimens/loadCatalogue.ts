import { sql } from '@/lib/db';

export async function loadCatalogueSpecimens() {
  try {
    const rawData = await sql`SELECT * FROM especies;`;

    const mappedSpecimens = rawData.map((row: any) => {
      const rawCategory = row.category_id || row.categoria || row.category || '';
      const rawFamily = row.family_id || row.familia || row.family || '';
      
      return {
        id: String(row.id || row.codigo || Math.random()),
        name: row.name || row.especie || row.nombre || row.scientific_name || 'Especie sin nombre',
        scientificName: row.scientific_name || row.nombre_cientifico || row.name || '',
        // Asignación de fallback para asegurar que aparezcan en la interfaz
        categoryId: rawCategory ? String(rawCategory).toLowerCase().trim() : 'butterflies-lepidoptera-diurne',
        familyId: String(rawFamily).toLowerCase().trim(),
        rubroId: String(row.rubro_id || row.rubro || 'dried-specimens').toLowerCase().trim(),
        regionId: String(row.region_id || row.region || 'neotropical').toLowerCase().trim(),
      };
    });

    return { specimens: mappedSpecimens, error: null };
  } catch (err: any) {
    console.error('⚠️ Error al consultar la base de datos:', err.message);
    return { specimens: [], error: null };
  }
}
