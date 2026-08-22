import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function getCatalogueCategories(rubroSlug?: string, regionSlug?: string) {
  try {
    const categories = await sql`
      SELECT 
        LOWER(COALESCE("Categoría (por zona)", "Rubro", 'sin-categoria')) as id,
        COALESCE("Categoría (por zona)", "Rubro", 'Sin categoría') as nombre,
        COALESCE("Categoría (por zona)", "Rubro", 'Sin categoría') as name,
        LOWER(REPLACE(REPLACE(COALESCE("Categoría (por zona)", "Rubro", 'sin-categoria'), ' ', '-'), '(', '')) as slug,
        COUNT(*)::int as total_especimenes,
        COUNT(*)::int as count,
        MAX(COALESCE("Carpeta REGION Cloudinary", "Segmento Cloudinary", '')) as image,
        MAX(COALESCE("Carpeta REGION Cloudinary", "Segmento Cloudinary", '')) as imagen_url
      FROM especies
      WHERE 
        ('dried-specimens' = 'dried-specimens' OR LOWER("Rubro") LIKE '%secos%')
      GROUP BY COALESCE("Categoría (por zona)", "Rubro", 'Sin categoría')
      ORDER BY nombre ASC;
    `;
    return categories;
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return [];
  }
}

export async function getCatalogueFamilies(categorySlug?: string) {
  try {
    const families = await sql`
      SELECT 
        LOWER(COALESCE("Familia", "familia", "family", 'sin-familia')) as id,
        COALESCE("Familia", "familia", "family", 'Sin familia') as nombre,
        COALESCE("Familia", "familia", "family", 'Sin familia') as name,
        LOWER(REPLACE(COALESCE("Familia", "familia", "family", 'sin-familia'), ' ', '-')) as slug,
        COUNT(*)::int as total_especimenes,
        COUNT(*)::int as count,
        MAX(COALESCE("Carpeta REGION Cloudinary", "Segmento Cloudinary", '')) as image,
        MAX(COALESCE("Carpeta REGION Cloudinary", "Segmento Cloudinary", '')) as imagen_url
      FROM especies
      GROUP BY COALESCE("Familia", "familia", "family", 'Sin familia')
      ORDER BY nombre ASC;
    `;
    return families;
  } catch (error) {
    console.error('Error al obtener familias:', error);
    return [];
  }
}
