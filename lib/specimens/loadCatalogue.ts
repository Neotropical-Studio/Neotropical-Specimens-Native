import { sql } from '@/lib/db';

export async function loadCatalogueSpecimens() {
  try {
    const rawData = await sql`
      SELECT 
        e.id,
        COALESCE((to_jsonb(e)->>'code')::text, e.id::text) as code,
        COALESCE((to_jsonb(e)->>'rubro_id')::text, 'dried-specimens') as rubro_id,
        COALESCE((to_jsonb(e)->>'region_id')::text, 'neotropical') as region_id,
        LOWER(
          REPLACE(
            REPLACE(
              COALESCE(
                (to_jsonb(e)->>'category_id')::text,
                (to_jsonb(e)->>'Categoría (por zona)')::text,
                (to_jsonb(e)->>'Rubro')::text,
                'butterflies-lepidoptera-diurne'
              ),
            ' ', '-'),
          '(', '')
        ) as category_id,
        LOWER(
          REPLACE(
            COALESCE(
              (to_jsonb(e)->>'familia_id')::text,
              (to_jsonb(e)->>'Familia')::text,
              (to_jsonb(e)->>'familia')::text,
              (to_jsonb(e)->>'family')::text,
              'sin-familia'
            ),
          ' ', '-')
        ) as family_id,
        COALESCE((to_jsonb(e)->>'Especie')::text, (to_jsonb(e)->>'especie')::text, 'Especie') as species_name,
        COALESCE((to_jsonb(e)->>'Nombre científico')::text, (to_jsonb(e)->>'nombre_cientifico')::text, '') as scientific_name,
        COALESCE((to_jsonb(e)->>'Nombre Común')::text, (to_jsonb(e)->>'nombre_comun')::text, '') as common_name,
        COALESCE((to_jsonb(e)->>'Familia')::text, (to_jsonb(e)->>'familia')::text, 'Sin Familia') as family,
        COALESCE((to_jsonb(e)->>'Carpeta REGION Cloudinary')::text, (to_jsonb(e)->>'Segmento Cloudinary')::text, '') as cover_public_id,
        COALESCE((to_jsonb(e)->>'Carpeta REGION Cloudinary')::text, (to_jsonb(e)->>'Segmento Cloudinary')::text, '') as video_public_id,
        0 as price
      FROM especies e;
    `;

    return { specimens: rawData, error: null };
  } catch (error: any) {
    console.error('Error al cargar catálogo:', error);
    return { specimens: [], error: error?.message || 'Error al conectar con la base de datos' };
  }
}
