import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function GET() {
  try {
    const res = await pool.query('SELECT * FROM especies;');
    if (res.rows.length === 0) {
      console.error('La consulta de especímenes no devolvió datos.');
      return NextResponse.json([]);
    }
    return NextResponse.json(res.rows);
  } catch (error) {
    console.error('Error al consultar especímenes:', error);
    return NextResponse.json([]);
  }
}
