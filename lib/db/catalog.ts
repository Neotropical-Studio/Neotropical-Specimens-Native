import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function getCatalogueCategories() {
  try {
    const categories = await sql`
      SELECT 
        c.id, 
        c.nombre, 
        c.slug, 
        COALESCE(c.imagen_url, c.imagen, '') as imagen_url,
        COALESCE(c.imagen_url, c.imagen, '') as imagen,
        COALESCE(c.imagen_url, c.imagen, '') as image,
        (
          SELECT COUNT(*)::int 
          FROM especies e 
          WHERE e.categoria_id = c.id OR LOWER(e.categoria) = LOWER(c.nombre)
        ) as total_especimenes,
        (
          SELECT COUNT(*)::int 
          FROM especies e 
          WHERE e.categoria_id = c.id OR LOWER(e.categoria) = LOWER(c.nombre)
        ) as count
      FROM categorias c
      ORDER BY c.nombre ASC;
    `;
    return categories;
  } catch (error) {
    return [];
  }
}

export async function getCatalogueFamilies() {
  try {
    const families = await sql`
      SELECT 
        f.id, 
        f.nombre, 
        f.slug, 
        COALESCE(f.imagen_url, f.imagen, '') as imagen_url,
        COALESCE(f.imagen_url, f.imagen, '') as imagen,
        COALESCE(f.imagen_url, f.imagen, '') as image,
        (
          SELECT COUNT(*)::int 
          FROM especies e 
          WHERE e.familia_id = f.id OR LOWER(e.familia) = LOWER(f.nombre)
        ) as total_especimenes,
        (
          SELECT COUNT(*)::int 
          FROM especies e 
          WHERE e.familia_id = f.id OR LOWER(e.familia) = LOWER(f.nombre)
        ) as count
      FROM familias f
      ORDER BY f.nombre ASC;
    `;
    return families;
  } catch (error) {
    return [];
  }
}
