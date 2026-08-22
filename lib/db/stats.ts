import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function getHomeStats() {
  try {
    const [specimens, families, regions, countries] = await Promise.all([
      sql`SELECT COUNT(*)::int as total FROM especies;`,
      sql`SELECT COUNT(*)::int as total FROM familias;`,
      sql`SELECT COUNT(*)::int as total FROM regiones;`,
      sql`SELECT COUNT(DISTINCT pais_origen)::int as total FROM especies WHERE pais_origen IS NOT NULL AND pais_origen != '';`
    ]);

    return {
      specimens: specimens[0]?.total || 0,
      families: families[0]?.total || 0,
      regions: regions[0]?.total || 0,
      countries: countries[0]?.total || 0,
    };
  } catch (error) {
    return { specimens: 0, families: 0, regions: 0, countries: 0 };
  }
}
