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
          c.imagen, 
          (SELECT e.imagen_url FROM especies e WHERE LOWER(e.categoria) = LOWER(c.nombre) OR e.categoria_id = c.id WHERE e.imagen_url IS NOT NULL AND e.imagen_url != '' LIMIT 1),
          (SELECT e.media_url FROM especies e WHERE LOWER(e.categoria) = LOWER(c.nombre) OR e.categoria_id = c.id WHERE e.media_url IS NOT NULL AND e.media_url != '' LIMIT 1),
          ''
        ) as imagen_url,
        COALESCE(
          c.imagen_url, 
          c.imagen, 
          (SELECT e.imagen_url FROM especies e WHERE LOWER(e.categoria) = LOWER(c.nombre) OR e.categoria_id = c.id WHERE e.imagen_url IS NOT NULL AND e.imagen_url != '' LIMIT 1),
          ''
        ) as imagen,
        COALESCE(
          c.imagen_url, 
          c.imagen, 
          (SELECT e.imagen_url FROM especies e WHERE LOWER(e.categoria) = LOWER(c.nombre) OR e.categoria_id = c.id WHERE e.imagen_url IS NOT NULL AND e.imagen_url != '' LIMIT 1),
          ''
        ) as image,
        GREATEST(
          (SELECT COUNT(*)::int FROM especies e WHERE e.categoria_id = c.id OR LOWER(e.categoria) = LOWER(c.nombre) OR LOWER(e.categoria) = LOWER(c.slug)),
          1
        ) as total_especimenes,
        GREATEST(
          (SELECT COUNT(*)::int FROM especies e WHERE e.categoria_id = c.id OR LOWER(e.categoria) = LOWER(c.nombre) OR LOWER(e.categoria) = LOWER(c.slug)),
          1
        ) as count
      FROM categorias c
      ORDER BY c.nombre ASC;
    `;
    return categories;
  } catch (error) {
    console.error('Error al cargar categorías:', error);
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
        COALESCE(
          f.imagen_url, 
          f.imagen, 
          (SELECT e.imagen_url FROM especies e WHERE LOWER(e.familia) = LOWER(f.nombre) OR e.familia_id = f.id WHERE e.imagen_url IS NOT NULL AND e.imagen_url != '' LIMIT 1),
          (SELECT e.media_url FROM especies e WHERE LOWER(e.familia) = LOWER(f.nombre) OR e.familia_id = f.id WHERE e.media_url IS NOT NULL AND e.media_url != '' LIMIT 1),
          ''
        ) as imagen_url,
        COALESCE(
          f.imagen_url, 
          f.imagen, 
          (SELECT e.imagen_url FROM especies e WHERE LOWER(e.familia) = LOWER(f.nombre) OR e.familia_id = f.id WHERE e.imagen_url IS NOT NULL AND e.imagen_url != '' LIMIT 1),
          ''
        ) as imagen,
        COALESCE(
          f.imagen_url, 
          f.imagen, 
          (SELECT e.imagen_url FROM especies e WHERE LOWER(e.familia) = LOWER(f.nombre) OR e.familia_id = f.id WHERE e.imagen_url IS NOT NULL AND e.imagen_url != '' LIMIT 1),
          ''
        ) as image,
        GREATEST(
          (SELECT COUNT(*)::int FROM especies e WHERE e.familia_id = f.id OR LOWER(e.familia) = LOWER(f.nombre) OR LOWER(e.familia) = LOWER(f.slug)),
          1
        ) as total_especimenes,
        GREATEST(
          (SELECT COUNT(*)::int FROM especies e WHERE e.familia_id = f.id OR LOWER(e.familia) = LOWER(f.nombre) OR LOWER(e.familia) = LOWER(f.slug)),
          1
        ) as count
      FROM familias f
      ORDER BY f.nombre ASC;
    `;
    return families;
  } catch (error) {
    console.error('Error al cargar familias:', error);
    return [];
  }
}
