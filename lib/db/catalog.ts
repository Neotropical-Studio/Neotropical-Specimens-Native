import { sql } from './index';

export const dynamic = 'force-dynamic';

export async function getCatalogueCategories() {
  try {
    const categories = await sql`
      SELECT 
        LOWER(COALESCE("Categoría (por zona)", "Rubro", 'sin-categoria')) as id,
        COALESCE("Categoría (por zona)", "Rubro", 'Sin categoría') as nombre,
        LOWER(COALESCE("Categoría (por zona)", "Rubro", 'sin-categoria')) as slug,
        COUNT(*)::int as total_especimenes,
        COUNT(*)::int as count,
        MAX(COALESCE("Carpeta REGION Cloudinary", "Segmento Cloudinary", '')) as image,
        MAX(COALESCE("Carpeta REGION Cloudinary", "Segmento Cloudinary", '')) as imagen_url,
        MAX(COALESCE("Carpeta REGION Cloudinary", "Segmento Cloudinary", '')) as imagen
      FROM especies
      GROUP BY COALESCE("Categoría (por zona)", "Rubro", 'Sin categoría')
      ORDER BY nombre ASC;
    `;
    return categories;
  } catch (error) {
    console.error('Error al consultar categorías:', error);
    return [];
  }
}

export async function getCatalogueFamilies() {
  try {
    const families = await sql`
      SELECT 
        LOWER(COALESCE("Familia", "familia", "family", 'sin-familia')) as id,
        COALESCE("Familia", "familia", "family", 'Sin familia') as nombre,
        LOWER(COALESCE("Familia", "familia", "family", 'sin-familia')) as slug,
        COUNT(*)::int as total_especimenes,
        COUNT(*)::int as count,
        MAX(COALESCE("Carpeta REGION Cloudinary", "Segmento Cloudinary", '')) as image,
        MAX(COALESCE("Carpeta REGION Cloudinary", "Segmento Cloudinary", '')) as imagen_url,
        MAX(COALESCE("Carpeta REGION Cloudinary", "Segmento Cloudinary", '')) as imagen
      FROM especies
      GROUP BY COALESCE("Familia", "familia", "family", 'Sin familia')
      ORDER BY nombre ASC;
    `;
    return families;
  } catch (error) {
    console.error('Error al consultar familias:', error);
    return [];
  }
}
