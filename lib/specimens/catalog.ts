import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function getSpecimensCatalogue(params?: any) {
  try {
    const data = await sql`
      SELECT 
        e.id,
        COALESCE(e."Especie", e.especie, e.species_name, 'Sin nombre') as name,
        COALESCE(e."Nombre científico", e.nombre_cientifico, e.scientific_name, '') as scientific_name,
        COALESCE(e."Nombre Común", e.nombre_comun, '') as common_name,
        COALESCE(e."Familia", e.familia, e.family, '') as family,
        COALESCE(e."Categoría (por zona)", e."Rubro", e.category_id, '') as category,
        COALESCE(e."Carpeta REGION Cloudinary", e."Segmento Cloudinary", '') as media_url,
        COALESCE(e."Precio regular", e.precio, e.price, 0) as price
      FROM especies e
      ORDER BY e.id DESC;
    `;
    return data;
  } catch (error) {
    console.error('Error al obtener especímenes desde especies:', error);
    return [];
  }
}

export async function getCategoriesWithCounts() {
  try {
    const categories = await sql`
      SELECT 
        LOWER(COALESCE("Categoría (por zona)", "Rubro", 'sin-categoria')) as id,
        COALESCE("Categoría (por zona)", "Rubro", 'Sin categoría') as name,
        COALESCE("Categoría (por zona)", "Rubro", 'Sin categoría') as nombre,
        LOWER(COALESCE("Categoría (por zona)", "Rubro", 'sin-categoria')) as slug,
        COUNT(*)::int as count,
        COUNT(*)::int as total_especimenes,
        MAX(COALESCE("Carpeta REGION Cloudinary", "Segmento Cloudinary", '')) as image,
        MAX(COALESCE("Carpeta REGION Cloudinary", "Segmento Cloudinary", '')) as media_url
      FROM especies
      GROUP BY COALESCE("Categoría (por zona)", "Rubro", 'Sin categoría')
      ORDER BY name ASC;
    `;
    return categories;
  } catch (error) {
    console.error('Error en categorías:', error);
    return [];
  }
}

export async function getFamiliesWithCounts() {
  try {
    const families = await sql`
      SELECT 
        LOWER(COALESCE("Familia", "familia", "family", 'sin-familia')) as id,
        COALESCE("Familia", "familia", "family", 'Sin familia') as name,
        COALESCE("Familia", "familia", "family", 'Sin familia') as nombre,
        LOWER(COALESCE("Familia", "familia", "family", 'sin-familia')) as slug,
        COUNT(*)::int as count,
        COUNT(*)::int as total_especimenes,
        MAX(COALESCE("Carpeta REGION Cloudinary", "Segmento Cloudinary", '')) as image,
        MAX(COALESCE("Carpeta REGION Cloudinary", "Segmento Cloudinary", '')) as media_url
      FROM especies
      GROUP BY COALESCE("Familia", "familia", "family", 'Sin familia')
      ORDER BY name ASC;
    `;
    return families;
  } catch (error) {
    console.error('Error en familias:', error);
    return [];
  }
}
