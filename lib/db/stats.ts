import { sql } from './index';

export const dynamic = 'force-dynamic';

export async function getHomeStats() {
  try {
    const [specimens, families, regions, countries] = await Promise.all([
      sql`SELECT COUNT(*)::int as total FROM especies;`,
      sql`SELECT COUNT(DISTINCT COALESCE("Familia", "familia", "family"))::int as total FROM especies;`,
      sql`SELECT COUNT(DISTINCT COALESCE("region", "Región geográfica"))::int as total FROM especies;`,
      sql`SELECT COUNT(DISTINCT COALESCE("País", "pais_origen"))::int as total FROM especies;`
    ]);

    return {
      specimens: specimens[0]?.total || 0,
      families: families[0]?.total || 0,
      regions: regions[0]?.total || 0,
      countries: countries[0]?.total || 0,
    };
  } catch (error) {
    console.error('Error al consultar estadísticas:', error);
    return { specimens: 0, families: 0, regions: 0, countries: 0 };
  }
}
