import { sql } from '@/lib/db';

export async function loadCatalogueSpecimens() {
  try {
    const rawData = await sql`
      SELECT 
        e.id,
        COALESCE(NULLIF(TRIM(e.code), ''), e.id::text) as code,
        COALESCE(NULLIF(TRIM(e.rubro_id), ''), 'dried-specimens') as rubro_id,
        COALESCE(NULLIF(TRIM(e.region_id), ''), 'neotropical') as region_id,
        LOWER(
          REPLACE(
            REPLACE(
              COALESCE(
                NULLIF(TRIM(e.category_id), ''), 
                NULLIF(TRIM(e."Categoría (por zona)"), ''), 
                NULLIF(TRIM(e."Rubro"), ''), 
                'butterflies-lepidoptera-diurne'
              ),
            ' ', '-'),
          '(', '')
        ) as category_id,
        LOWER(
          REPLACE(
            COALESCE(
              NULLIF(TRIM(e.familia_id), ''), 
              NULLIF(TRIM(e."Familia"), ''), 
              NULLIF(TRIM(e.familia), ''), 
              NULLIF(TRIM(e.family), ''), 
              'sin-familia'
            ),
          ' ', '-')
        ) as family_id,
        COALESCE(NULLIF(TRIM(e."Especie"), ''), NULLIF(TRIM(e.especie), ''), NULLIF(TRIM(e.species_name), ''), 'Especie no identificada') as species_name,
        COALESCE(NULLIF(TRIM(e."Nombre científico"), ''), NULLIF(TRIM(e.nombre_cientifico), ''), NULLIF(TRIM(e.scientific_name), ''), 'Sin nombre científico') as scientific_name,
        COALESCE(NULLIF(TRIM(e."Nombre Común"), ''), NULLIF(TRIM(e.nombre_comun), ''), 'Sin nombre común') as common_name,
        COALESCE(NULLIF(TRIM(e."Familia"), ''), NULLIF(TRIM(e.familia), ''), NULLIF(TRIM(e.family), ''), 'Sin Familia') as family,
        COALESCE(NULLIF(TRIM(e."Carpeta REGION Cloudinary"), ''), NULLIF(TRIM(e."Segmento Cloudinary"), ''), NULLIF(TRIM(e.media_url), ''), '') as cover_public_id,
        COALESCE(NULLIF(TRIM(e."Carpeta REGION Cloudinary"), ''), NULLIF(TRIM(e."Segmento Cloudinary"), ''), NULLIF(TRIM(e.media_url), ''), '') as video_public_id,
        COALESCE(e."Precio regular", e.precio, e.price, 0) as price
      FROM especies e;
    `;

    return { specimens: rawData, error: null };
  } catch (error: any) {
    console.error('Error al cargar catálogo:', error);
    return { specimens: [], error: error?.message || 'Error al conectar con la base de datos' };
  }
}
