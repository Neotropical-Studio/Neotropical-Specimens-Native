import { sql } from '@/lib/db';

export async function loadCatalogueSpecimens() {
  try {
    const rawData = await sql`
      SELECT 
        e.id,
        COALESCE(e.id::text, '') as code,
        COALESCE(NULLIF(TRIM(e.rubro_id), ''), 'dried-specimens') as rubro_id,
        COALESCE(NULLIF(TRIM(e.region_id), ''), 'neotropical') as region_id,
        COALESCE(NULLIF(TRIM(e.category_id), ''), 'butterflies-lepidoptera-diurne') as category_id,
        COALESCE(NULLIF(TRIM(e.familia_id), ''), 'sin-familia') as family_id,
        COALESCE(NULLIF(TRIM(e."Especie"), ''), NULLIF(TRIM(e.especie), ''), 'Especie no identificada') as species_name,
        COALESCE(NULLIF(TRIM(e."Nombre científico"), ''), NULLIF(TRIM(e.nombre_cientifico), ''), '') as scientific_name,
        COALESCE(NULLIF(TRIM(e."Nombre Común"), ''), NULLIF(TRIM(e.nombre_comun), ''), '') as common_name,
        COALESCE(NULLIF(TRIM(e."Familia"), ''), NULLIF(TRIM(e.familia), ''), 'Sin Familia') as family,
        COALESCE(NULLIF(TRIM(e."Carpeta REGION Cloudinary"), ''), NULLIF(TRIM(e."Segmento Cloudinary"), ''), '') as cover_public_id,
        COALESCE(NULLIF(TRIM(e."Carpeta REGION Cloudinary"), ''), NULLIF(TRIM(e."Segmento Cloudinary"), ''), '') as video_public_id,
        COALESCE(e."Precio regular", e.precio, 0) as price
      FROM especies e;
    `;

    return { specimens: rawData, error: null };
  } catch (error: any) {
    console.error('Error al cargar catálogo:', error);
    return { specimens: [], error: error?.message || 'Error al conectar con la base de datos' };
  }
}
