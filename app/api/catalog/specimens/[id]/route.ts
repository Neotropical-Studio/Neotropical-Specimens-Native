// GET /api/catalog/specimens/[id] — ficha dinámica de un espécimen (atributos + media).
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { loadCatalogRowById } from '@/lib/specimens/catalog';
import { toSpecimenDetail } from '@/lib/specimens/detail';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !key) {
    return NextResponse.json({ specimen: null, error: 'Supabase no configurado' }, { status: 503 });
  }

  const lang =
    new URL(request.url).searchParams.get('lang')?.trim() || 'es';

  const supabase = createClient(url, key);
  const { row, error } = await loadCatalogRowById(supabase, id);
  if (error) {
    return NextResponse.json({ specimen: null, error }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ specimen: null, error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json(
    { specimen: toSpecimenDetail(row, lang) },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}
