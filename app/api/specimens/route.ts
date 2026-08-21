import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function GET() {
  try {
    const res = await pool.query('SELECT * FROM especies;');
    return NextResponse.json(res.rows);
  } catch {
    return NextResponse.json([]);
  }
}
