import { sql } from '@/lib/db';

export async function loadCatalogueSpecimens() {
  try {
    const rawData = await sql`
      SELECT 
        s.id,
        s.name,
        s.scientific_name AS "scientificName",
        LOWER(TRIM(s.family_id)) AS "familyId",
        LOWER(TRIM(s.category_id)) AS "categoryId",
        COALESCE(s.rubro_id, 'dried-specimens') AS "rubroId",
        COALESCE(s.region_id, 'neotropical') AS "regionId"
      FROM especies s
    `;

    return { specimens: rawData || [], error: null };
  } catch (err: any) {
    console.error('⚠️ Error cargando catálogo completo:', err.message);
    return { specimens: [], error: null };
  }
}
