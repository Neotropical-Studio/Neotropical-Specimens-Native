// GET /api/admin/consola-sync
// Alimenta la Consola Maestra V2: specimens + taxonomy (columnas reales).
import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth/admin';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'nodejs';
export const revalidate = 0;

export type ConsolaRow = {
  id: string;
  fullId: string;
  name: string;
  stock: number | string;
  status: 'APROBADO' | 'PENDIENTE' | 'OUT';
  family: string | null;
  genus: string | null;
  mediaUrl: string | null;
};

type TaxEmbed = {
  family_name?: string | null;
  genus_name?: string | null;
} | null;

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const db = getSupabaseAdmin();

  // Intentar con stock_status (migración 0008); fallback sin esa columna
  let raw: Array<Record<string, unknown>> = [];
  let errorMsg: string | null = null;

  const withStock = await db
    .from('specimens')
    .select(`
      id,
      species_name,
      media_url,
      stock_status,
      created_at,
      taxonomy (
        family_name,
        genus_name,
        subfamily_name
      )
    `)
    .order('created_at', { ascending: false })
    .limit(500);

  if (withStock.error) {
    const fallback = await db
      .from('specimens')
      .select(`
        id,
        species_name,
        media_url,
        created_at,
        taxonomy (
          family_name,
          genus_name,
          subfamily_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(500);

    if (fallback.error) {
      return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    }
    raw = (fallback.data ?? []) as Array<Record<string, unknown>>;
    errorMsg = withStock.error.message.includes('stock_status')
      ? null
      : withStock.error.message;
  } else {
    raw = (withStock.data ?? []) as Array<Record<string, unknown>>;
  }

  const rows: ConsolaRow[] = raw.map((s) => {
    const tax = s.taxonomy as TaxEmbed;
    const stockStatus = String(s.stock_status ?? 'IN_STOCK');
    const status: ConsolaRow['status'] =
      stockStatus === 'PENDING'
        ? 'PENDIENTE'
        : stockStatus === 'OUT_OF_STOCK'
          ? 'OUT'
          : 'APROBADO';

    const fullId = String(s.id);

    return {
      id: fullId.slice(0, 8).toUpperCase(),
      fullId,
      name: String(s.species_name ?? '—'),
      stock:
        stockStatus === 'OUT_OF_STOCK'
          ? 0
          : stockStatus === 'PENDING'
            ? '—'
            : 'OK',
      status,
      family: tax?.family_name ?? null,
      genus: tax?.genus_name ?? null,
      mediaUrl: s.media_url ? String(s.media_url) : null,
    };
  });

  return NextResponse.json({
    ok: true,
    count: rows.length,
    rows,
    syncedAt: new Date().toISOString(),
    warning: errorMsg,
  });
}
