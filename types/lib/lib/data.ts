import { query } from './db';
import { CollectionStats, CategorySummary, Specimen } from '@/types/specimen';

// Obtiene los contadores globales dinámicamente desde tu tabla en Neon
export async function getCollectionStats(): Promise<CollectionStats> {
  try {
    const rows = await query<any>(`
      SELECT 
        COUNT(*)::int AS total_specimens,
        COUNT(DISTINCT family)::int AS total_families,
        COUNT(DISTINCT region)::int AS total_regions
      FROM especies;
    `);

    return {
      total_specimens: rows[0]?.total_specimens || 0,
      total_families: rows[0]?.total_families || 0,
      total_regions: rows[0]?.total_regions || 0,
    };
  } catch (error) {
    console.error('Error fetching collection stats:', error);
    return { total_specimens: 0, total_families: 0, total_regions: 0 };
  }
}

// Obtiene el resumen agrupado por categoría
export async function getCategoriesSummary(): Promise<CategorySummary[]> {
  try {
    const rows = await query<any>(`
      SELECT 
        COALESCE(categoria, 'General') AS category,
        COUNT(*)::int AS total_items,
        COUNT(*)::int AS total_stock
      FROM especies
      GROUP BY categoria
      ORDER BY total_items DESC;
    `);

    return rows;
  } catch (error) {
    console.error('Error fetching categories summary:', error);
    return [];
  }
}

// Obtiene la lista completa de especímenes
export async function getSpecimens(category?: string): Promise<Specimen[]> {
  try {
    let sql = `
      SELECT 
        id,
        COALESCE(especie, nombre, 'Desconocido') AS scientific_name,
        NULL AS common_name,
        COALESCE(family, 'Desconocida') AS family,
        COALESCE(categoria, 'General') AS category,
        COALESCE(region, 'Neotropical') AS region,
        'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?q=80&w=800&auto=format&fit=crop' AS image_url,
        1 AS stock,
        'active' AS status,
        NOW() AS created_at
      FROM especies
    `;
    const params: any[] = [];

    if (category) {
      sql += ` WHERE categoria = $1`;
      params.push(category);
    }

    sql += ` ORDER BY id DESC;`;

    const rawRows = await query<any>(sql, params);
    return rawRows as Specimen[];
  } catch (error) {
    console.error('Error fetching specimens:', error);
    return [];
  }
}