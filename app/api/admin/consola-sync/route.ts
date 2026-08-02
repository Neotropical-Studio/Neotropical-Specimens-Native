// GET /api/admin/consola-sync
// Consola Maestra DASHBOARD: specimens con taxonomía para filtros + paginación.
import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth/admin';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'nodejs';
export const revalidate = 0;

export type ConsolaRow = {
  id: string;
  fullId: string;
  code: string;
  name: string;
  stock: number | string;
  status: 'APROBADO' | 'PENDIENTE' | 'OUT';
  rubro: string | null;
  category: string | null;
  family: string | null;
  subfamily: string | null;
  genus: string | null;
  species: string | null;
  subspecies: string | null;
  mediaUrl: string | null;
};

type TaxEmbed = {
  family_name?: string | null;
  genus_name?: string | null;
  species_name?: string | null;
} | null;

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function alpha(a: string, b: string) {
  return a.localeCompare(b, 'es', { sensitivity: 'base', numeric: true });
}

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let db;
  try {
    db = getSupabaseAdmin();
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : 'Missing SUPABASE_SERVICE_ROLE_KEY on Vercel Production',
        rows: [],
      },
      { status: 503 },
    );
  }

  const fullSelect = await db
    .from('specimens')
    .select(
      `
      id,
      specimen_code,
      species_name,
      media_url,
      cloudinary_public_id,
      status,
      rubro,
      categoria,
      familia,
      subfamilia,
      genero,
      especie,
      subespecie,
      created_at,
      taxonomy (
        family_name,
        genus_name,
        species_name
      )
    `,
    )
    .order('familia', { ascending: true })
    .order('genero', { ascending: true })
    .order('especie', { ascending: true })
    .limit(2000);

  type SoftRow = Record<string, unknown>;

  let data: SoftRow[] | null = (fullSelect.data as SoftRow[] | null) ?? null;
  let error = fullSelect.error;

  if (error) {
    const soft = await db
      .from('specimens')
      .select(
        `
        id,
        species_name,
        media_url,
        cloudinary_public_id,
        status,
        rubro,
        categoria,
        familia,
        genero,
        especie,
        created_at
      `,
      )
      .order('created_at', { ascending: false })
      .limit(2000);
    data = (soft.data as SoftRow[] | null) ?? null;
    error = soft.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message, rows: [] }, { status: 500 });
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

    const genus = str(tax?.genus_name) ?? str(s.genero);
    const speciesEpithet = str(s.especie);
    const subspecies = str(s.subespecie);
    const family = str(tax?.family_name) ?? str(s.familia);
    const composed = [genus, speciesEpithet, subspecies].filter(Boolean).join(' ');
    const name =
      str(tax?.species_name) ?? str(s.species_name) ?? (composed || '—');
    const code = str(s.specimen_code) ?? fullId.slice(0, 8).toUpperCase();

    return {
      id: code.slice(0, 12).toUpperCase(),
      fullId,
      code,
      name,
      stock: status === 'OUT' ? 0 : status === 'PENDIENTE' ? '—' : 'OK',
      status,
      rubro: str(s.rubro),
      category: str(s.categoria),
      family,
      subfamily: str(s.subfamilia),
      genus,
      species: speciesEpithet ?? name,
      subspecies,
      mediaUrl: media,
    };
  });

  rows.sort((a, b) => {
    const byFam = alpha(a.family ?? '', b.family ?? '');
    if (byFam !== 0) return byFam;
    const byGen = alpha(a.genus ?? '', b.genus ?? '');
    if (byGen !== 0) return byGen;
    const bySp = alpha(a.species ?? a.name, b.species ?? b.name);
    if (bySp !== 0) return bySp;
    return alpha(a.subspecies ?? '', b.subspecies ?? '');
  });

  return NextResponse.json({
    ok: true,
    count: rows.length,
    rows,
    pageSizeDefault: 10,
    syncedAt: new Date().toISOString(),
  });
}
