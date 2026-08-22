import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const regions = await sql`SELECT * FROM regions`;
    const categories = await sql`SELECT * FROM categories`;
    const families = await sql`SELECT * FROM families`;
    const species = await sql`SELECT * FROM species`;

    return NextResponse.json({ regions, categories, families, species });
  } catch (error) {
    console.error('Error al consultar Neon DB:', error);
    return NextResponse.json({ error: 'Error al conectar con Neon DB' }, { status: 500 });
  }
}
