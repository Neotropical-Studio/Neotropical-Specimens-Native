import { sql } from '@/lib/db';

export async function loadCatalogueSpecimens() {
  try {
    const species = await sql`
      SELECT 
        s.id, 
        s.name, 
        s.scientific_name AS "scientificName",
        s.family_id AS "familyId",
        f.name AS "familyName",
        f.category_id AS "categoryId",
        c.name AS "categoryName",
        c.region_id AS "regionId"
      FROM species s
      LEFT JOIN families f ON s.family_id = f.id
      LEFT JOIN categories c ON f.category_id = c.id
    `;
    return { specimens: species || [], error: null };
  } catch (err: any) {
    console.error('⚠️ Error al consultar Neon DB:', err.message);
    // Retornamos sin arrojar el mensaje de error a la UI
    return { specimens: [], error: null };
  }
}
