import { sql } from '@/lib/db';

export async function inspectTables() {
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `;
    console.log('📌 TABLAS EXISTENTES EN TU BASE DE DATOS:', tables.map(t => t.table_name));
  } catch (e: any) {
    console.error('Error inspeccionando tablas:', e.message);
  }
}
