// GET /api/catalog/specimens/[id] — ficha dinámica (Morpho con fallback nativo).
import { NextResponse } from 'next/server';
import {
  buildMorphoGodartyDetailView,
  getSpecimenById,
} from '@/lib/specimens/detail';
import {
  isMorphoGodartyDidiusTingomarensis,
  MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_SPECIMEN_ID,
} from '@/lib/specimens/native/morphoGodartyDidiusTingomarensis';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const lang = new URL(request.url).searchParams.get('lang')?.trim() || 'es';

  const specimen =
    (await getSpecimenById(id, lang)) ??
    (id === MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_SPECIMEN_ID ||
    isMorphoGodartyDidiusTingomarensis({ id })
      ? buildMorphoGodartyDetailView()
      : null);

  if (!specimen) {
    return NextResponse.json({ specimen: null, error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json(
    { specimen },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}
