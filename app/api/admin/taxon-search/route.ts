// GET /api/admin/taxon-search?rank=familia|subfamilia|genero|especie&q=...&parentId=...
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth/admin';

export const runtime = 'nodejs';

const PARENT_FIELD: Record<string, string> = {
  familia: 'rubro',
  subfamilia: 'familia',
  genero: 'subfamilia',
  especie: 'genero',
};

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const rank = searchParams.get('rank') ?? '';
    const q = (searchParams.get('q') ?? '').trim();
    const parentId = searchParams.get('parentId') ?? '';

    // Placeholder: rank/parentId reserved for future taxon index wiring.
    void PARENT_FIELD;
    void rank;
    void parentId;

    if (!q) return NextResponse.json({ ok: true, results: [] });

    return NextResponse.json({ ok: true, results: [] });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
