// GET /api/admin/taxon-search?rank=familia|subfamilia|genero|especie&q=...&parentId=...
// Autocompletado taxonómico (Sección 1) contra la cadena estricta de Sanity
// (Rubro→Familia→Subfamilia→Género→Especie), usando sanityPreview (drafts
// incluidos) para que un taxón recién creado pero aún no publicado ya sea
// seleccionable desde el panel, sin obligar a publicar primero en el Studio.
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth/admin';
import { sanityPreview } from '@/lib/sanity/client';

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

  const parentField = PARENT_FIELD[rank];
  if (!parentField) {
    return NextResponse.json({ error: 'rank inválido' }, { status: 400 });
  }
  if (!q) return NextResponse.json({ results: [] });

  const filters = ['_type == $rank', 'name match $q + "*"'];
  if (parentId) filters.push(`${parentField}._ref == $parentId`);

  const query = `*[${filters.join(' && ')}] | order(name)[0...20]{ _id, name, "parentId": ${parentField}._ref }`;

  try {
    const results = await sanityPreview.fetch(query, { rank, q, parentId });
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message, results: [] }, { status: 502 });
  }
}
