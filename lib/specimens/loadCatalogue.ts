import { sql } from '@/lib/db';

export async function loadCatalogueSpecimens() {
  try {
    const specimens = await sql`
      SELECT 
        id,
        code,
        species_name as "speciesName",
        scientific_name as "scientificName",
        common_name as "commonName",
        family,
        family_id as "family_id",
        category_id,
        region_id,
        rubro_id,
        country,
        cover_public_id as "coverPublicId",
        video_public_id as "videoPublicId",
        price
      FROM especies_clean;
    `;

    return { specimens, error: null };
  } catch (error: any) {
    console.error('Error al cargar catálogo:', error);
    return { specimens: [], error: error?.message || 'Error en DB' };
  }
}
