import { sql } from '@/lib/db';

export async function loadCatalogueSpecimens() {
  try {
    // Consultamos tus tablas reales 'especies' y 'specimens'
    let speciesData: any[] = [];
    
    try {
      speciesData = await sql`SELECT * FROM especies;`;
    } catch {
      speciesData = await sql`SELECT * FROM specimens;`;
    }

    return { specimens: speciesData || [], error: null };
  } catch (err: any) {
    console.error('Error al cargar especies:', err.message);
    return { specimens: [], error: null };
  }
}
