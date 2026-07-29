// GET /api/catalog/specimens — inventario vivo (todas las especies/mariposas).
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { loadCatalogRows } from '@/lib/specimens/catalog';
import { toSpecimenView } from '@/lib/specimens/view';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !key) {
    return NextResponse.json(
      { specimens: [], error: 'Supabase no configurado' },
      { status: 503 },
    );
  }

  const supabase = createClient(url, key);
  const { rows, error } = await loadCatalogRows(supabase);
  const specimens = rows.map(toSpecimenView);

  return NextResponse.json(
    { specimens, count: specimens.length, error },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}
