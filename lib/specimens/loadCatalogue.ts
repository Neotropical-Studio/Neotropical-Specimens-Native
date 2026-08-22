import { sql } from '@/lib/db';

export async function loadCatalogueSpecimens() {
  try {
    // Intentamos consultar la tabla en español 'especies' o 'especimenes', y si no existe 'species'
    let data: any[] = [];

    try {
      data = await sql`SELECT * FROM especies;`;
    } catch {
      try {
        data = await sql`SELECT * FROM especimenes;`;
      } catch {
        try {
          data = await sql`SELECT * FROM species;`;
        } catch {
          try {
            data = await sql`SELECT * FROM specimens;`;
          } catch (e) {
            console.warn('⚠️ No se encontró la tabla de especies. Revisa los nombres en Neon.');
          }
        }
      }
    }

    return { specimens: data || [], error: null };
  } catch (err: any) {
    console.error('Error al cargar catálogo:', err.message);
    return { specimens: [], error: null };
  }
}
