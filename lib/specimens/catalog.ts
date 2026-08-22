import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function getCatalogueCategories() {
  try {
    const categories = await sql`
      SELECT 
        c.id, 
        c.nombre, 
        c.slug, 
        COALESCE(
          c.imagen_url, 
          (SELECT e."Carpeta REGION Cloudinary" FROM especies e WHERE LOWER(e."Rubro") LIKE '%secos%' OR LOWER(e."Categoría (por zona)") = LOWER(c.nombre) LIMIT 1),
          ''
        ) as image,
        (
          SELECT COUNT(*)::int 
          FROM especies e 
          WHERE LOWER(e."Rubro") LIKE '%secos%' OR LOWER(e."Categoría (por zona)") = LOWER(c.nombre)
        ) as count
      FROM categorias c;
    `;
    return categories;
  } catch (error) {
    return [];
  }
}
