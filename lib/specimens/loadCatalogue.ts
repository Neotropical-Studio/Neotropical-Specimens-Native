import { sql } from '@/lib/db';

export async function loadCatalogueSpecimens() {
  try {
    // Consultamos la metadata de PostgreSQL para listar todas las tablas existentes
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `;
    
    console.log('-------------------------------------------');
    console.log('📌 TABLAS ENCONTRADAS EN TU NEON DB:', tables.map((t: any) => t.table_name));
    console.log('-------------------------------------------');

    return { specimens: [], error: null };
  } catch (err: any) {
    console.error('Error al inspeccionar la DB:', err.message);
    return { specimens: [], error: null };
  }
}
