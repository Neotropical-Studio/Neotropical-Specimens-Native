import { sql } from '@/lib/db';

export async function loadCatalogueSpecimens() {
  try {
    const rawData = await sql`SELECT * FROM especies;`;

    const mappedSpecimens = rawData.map((row: any) => {
      // Normalizamos el slug de la categoría
      let rawCat = String(row.category_id || row.categoria || row.category || '').toLowerCase().trim();
      
      // Si está vacía o no coincide, asignamos la categoría principal de mariposas
      if (!rawCat || rawCat === 'null' || rawCat === 'undefined') {
        rawCat = 'butterflies-lepidoptera-diurne';
      }

      return {
        id: String(row.id || row.codigo || Math.random()),
        name: row.name || row.especie || row.nombre || row.scientific_name || 'Especie',
        scientificName: row.scientific_name || row.nombre_cientifico || row.name || '',
        familyId: String(row.family_id || row.familia || row.family || 'morphidae').toLowerCase().trim(),
        categoryId: rawCat,
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
