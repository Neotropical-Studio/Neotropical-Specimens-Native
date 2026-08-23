import { sql } from '@/lib/db';
import type { SpecimenRow } from './view';

export const dynamic = 'force-dynamic';

export interface CatalogRowsResult {
  rows: SpecimenRow[];
  error: string | null;
}

export async function loadCatalogRows(_client?: unknown): Promise<CatalogRowsResult> {
  try {
    const rows = (await sql`SELECT * FROM especies ORDER BY id ASC;`) as SpecimenRow[];
    if (rows.length === 0) {
      console.error('La consulta del catálogo no devolvió especímenes.');
      return { rows: [], error: 'Catálogo vacío' };
    }
    return { rows, error: null };
  } catch (error) {
    console.error('Error al cargar filas del catálogo desde Neon:', error);
    return { rows: [], error: error instanceof Error ? error.message : 'Error en Neon DB' };
  }
}

export async function loadCatalogRowById(
  _client: unknown,
  id: string,
): Promise<{ row: SpecimenRow | null; error: string | null }> {
  try {
    const rows = (await sql`SELECT * FROM especies WHERE id = ${id} LIMIT 1;`) as SpecimenRow[];
    if (rows.length === 0) {
      console.error(`No se encontró el espécimen ${id} en Neon.`);
      return { row: null, error: 'Espécimen no encontrado' };
    }
    return { row: rows[0], error: null };
  } catch (error) {
    console.error(`Error al cargar el espécimen ${id} desde Neon:`, error);
    return { row: null, error: error instanceof Error ? error.message : 'Error en Neon DB' };
  }
}

export async function loadCatalogPool(
  _client: unknown,
  limit: number,
): Promise<SpecimenRow[]> {
  try {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
    const rows = (await sql`SELECT * FROM especies ORDER BY id ASC LIMIT ${safeLimit};`) as SpecimenRow[];
    if (rows.length === 0) console.error('La consulta del grupo de catálogo no devolvió datos.');
    return rows;
  } catch (error) {
    console.error('Error al cargar el grupo de catálogo desde Neon:', error);
    return [];
  }
}

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
