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
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const rank = searchParams.get('rank') ?? '';
  const q = (searchParams.get('q') ?? '').trim();
  const parentId = searchParams.get('parentId') ?? '';

  if (!q) return NextResponse.json({ results: [] });

  return NextResponse.json({ results: [] });
}
