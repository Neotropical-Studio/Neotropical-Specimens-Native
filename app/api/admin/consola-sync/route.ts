// GET /api/admin/consola-sync
// Alimenta la Consola Maestra: specimens + taxonomy / columnas planas LIVE.
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

  const { data, error } = await db
    .from('specimens')
    .select(
      `
      id,
      species_name,
      media_url,
      cloudinary_public_id,
      status,
      familia,
      genero,
      created_at,
      taxonomy (
        family_name,
        genus_name
      )
    `,
    )
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows: ConsolaRow[] = (data ?? []).map((s) => {
    const tax = s.taxonomy as TaxEmbed;
    const statusRaw = String(s.status ?? '').toUpperCase();
    const status: ConsolaRow['status'] =
      statusRaw.includes('OUT') || statusRaw === 'AGOTADO' || statusRaw === '0'
        ? 'OUT'
        : statusRaw === 'DRAFT' || statusRaw === 'PENDING' || statusRaw === 'PENDIENTE'
          ? 'PENDIENTE'
          : 'APROBADO';

    const fullId = String(s.id);
    const media =
      (s.cloudinary_public_id ? String(s.cloudinary_public_id) : null) ??
      (s.media_url ? String(s.media_url) : null);

    return {
      id: fullId.slice(0, 8).toUpperCase(),
      fullId,
      name: String(s.species_name ?? '—'),
      stock: status === 'OUT' ? 0 : status === 'PENDIENTE' ? '—' : 'OK',
      status,
      family: (tax?.family_name as string | null) ?? (s.familia as string | null) ?? null,
      genus: (tax?.genus_name as string | null) ?? (s.genero as string | null) ?? null,
      mediaUrl: media,
    };
  });

  return NextResponse.json({
    ok: true,
    count: rows.length,
    rows,
    syncedAt: new Date().toISOString(),
  });
}
