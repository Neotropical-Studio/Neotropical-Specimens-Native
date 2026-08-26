import { query } from './db';
import { CollectionStats, CategorySummary, Specimen } from '@/types/specimen';

// Obtiene los contadores globales dinámicamente
export async function getCollectionStats(): Promise<CollectionStats> {
  try {
    const rows = await query<CollectionStats>(`
      SELECT 
        COUNT(*)::int AS total_specimens,
        COUNT(DISTINCT family)::int AS total_families,
        COUNT(DISTINCT region)::int AS total_regions
      FROM specimens
      WHERE status = 'active';
    `);

    return rows[0] || { total_specimens: 0, total_families: 0, total_regions: 0 };
  } catch (error) {
    console.error('Error fetching collection stats:', error);
    return { total_specimens: 0, total_families: 0, total_regions: 0 };
  }
}

// Obtiene el conteo dinámico por rubros/categorías
export async function getCategoriesSummary(): Promise<CategorySummary[]> {
  try {
    const rows = await query<CategorySummary>(`
      SELECT 
        category,
        COUNT(*)::int AS total_items,
        COALESCE(SUM(stock), 0)::int AS total_stock
      FROM specimens
      WHERE status = 'active'
      GROUP BY category
      ORDER BY total_items DESC;
    `);

    return rows;
  } catch (error) {
    console.error('Error fetching categories summary:', error);
    return [];
  }
}

// Obtiene la lista completa de especímenes activos
export async function getSpecimens(category?: string): Promise<Specimen[]> {
  try {
    let sql = `
      SELECT 
        id,
        scientific_name,
        common_name,
        family,
        category,
        region,
        image_url,
        stock,
        status,
        created_at
      FROM specimens
      WHERE status = 'active'
    `;
    const params: any[] = [];

    if (category) {
      sql += ` AND category = $1`;
      params.push(category);
    }

    sql += ` ORDER BY created_at DESC;`;

    return await query<Specimen>(sql, params);
  } catch (error) {
    console.error('Error fetching specimens:', error);
    return [];
  }
}