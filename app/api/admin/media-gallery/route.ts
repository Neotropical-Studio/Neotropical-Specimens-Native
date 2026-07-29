// GET /api/admin/media-gallery
// Devuelve todos los specimen_media enriquecidos con datos del espécimen:
// family, kind (rubro), species name, common name, code.
// Usado por MediaGallery en la sección Multimedia del admin.
import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth/admin';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export const runtime  = 'nodejs';
export const revalidate = 0;

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from('specimen_media')
    .select(`
      id,
      specimen_id,
      public_id,
      media_type,
      view,
      display_order,
      media_url,
      specimens (
        id,
        specimen_code,
        metadata,
        attributes
      )
    `)
    .order('display_order', { ascending: true })
    .limit(2000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Flatten and enrich
  const items = (data ?? []).map((row) => {
    const sp = (row as any).specimens as any;
    const meta   = sp?.metadata   ?? {};
    const attrs  = sp?.attributes ?? {};

    const code        = sp?.specimen_code ?? meta?.code ?? '';
    const family      = meta?.family_name   ?? attrs?.family   ?? null;
    const kind        = meta?.rubro         ?? attrs?.kind      ?? null;
    const species     = meta?.nombre_cientifico ?? attrs?.scientific_name ?? null;
    const commonName  = meta?.nombre_comun      ?? attrs?.common_name     ?? null;

    return {
      id:           row.id,
      specimenId:   row.specimen_id,
      publicId:     row.public_id,
      mediaType:    row.media_type,
      view:         row.view ?? null,
      displayOrder: row.display_order ?? 9,
      secureUrl:    row.media_url ?? null,
      code,
      family,
      kind,
      species,
      commonName,
    };
  });

  return NextResponse.json({ items });
}
