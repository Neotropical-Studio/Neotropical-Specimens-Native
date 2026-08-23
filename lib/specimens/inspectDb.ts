import { sql } from '@/lib/db';

export async function inspectTables() {
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `;
    if (tables.length === 0) {
      console.error('La inspección no encontró tablas públicas.');
      return [];
    }
    console.log('📌 TABLAS EXISTENTES EN TU BASE DE DATOS:', tables.map(t => t.table_name));
    return tables;
  } catch (error: unknown) {
    console.error('Error inspeccionando tablas:', error);
    return [];
  }
}
