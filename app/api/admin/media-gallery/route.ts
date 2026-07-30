// GET /api/admin/media-gallery
// Devuelve specimen_media enriquecido con datos del espécimen (columnas LIVE).
import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth/admin';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'nodejs';
export const revalidate = 0;

type TaxonomyLite = {
  family_name?: string | null;
  genus_name?: string | null;
  species_name?: string | null;
};

type SpecimenLite = {
  id: string;
  species_name?: string | null;
  familia?: string | null;
  genero?: string | null;
  especie?: string | null;
  rubro?: string | null;
  categoria?: string | null;
  taxonomy?: TaxonomyLite | TaxonomyLite[] | null;
};

function asTaxonomy(raw: SpecimenLite['taxonomy']): TaxonomyLite | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const db = getSupabaseAdmin();

  const { data: mediaRows, error: mediaError } = await db
    .from('specimen_media')
    .select('id, specimen_id, public_id, media_type, display_order, media_url')
    .order('display_order', { ascending: true })
    .limit(2000);

  if (mediaError) return NextResponse.json({ error: mediaError.message }, { status: 500 });

  const media = mediaRows ?? [];
  const specimenIds = [...new Set(media.map((m) => m.specimen_id).filter(Boolean))] as string[];

  const bySpecimen = new Map<string, SpecimenLite>();

  if (specimenIds.length > 0) {
    const enriched = await db
      .from('specimens')
      .select(
        `
        id,
        species_name,
        familia,
        genero,
        especie,
        rubro,
        categoria,
        taxonomy:taxonomy!taxonomy_id (
          family_name,
          genus_name,
          species_name
        )
      `,
      )
      .in('id', specimenIds);

    if (enriched.error) {
      return NextResponse.json({ error: enriched.error.message }, { status: 500 });
    }
    for (const row of (enriched.data ?? []) as SpecimenLite[]) {
      bySpecimen.set(row.id, row);
    }
  }

  const items = media.map((row) => {
    const sp = row.specimen_id ? bySpecimen.get(row.specimen_id) : undefined;
    const tax = asTaxonomy(sp?.taxonomy);

    const family = str(tax?.family_name) ?? str(sp?.familia) ?? null;
    const composedName = [str(sp?.genero) ?? str(tax?.genus_name), str(sp?.especie)]
      .filter(Boolean)
      .join(' ');
    const species =
      str(tax?.species_name) ?? str(sp?.species_name) ?? (composedName || null);
    const kind = str(sp?.rubro) ?? str(sp?.categoria) ?? null;
    const code = sp?.id
      ? `LEGACY-${sp.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`
      : '';

    return {
      id: row.id,
      specimenId: row.specimen_id,
      publicId: row.public_id,
      mediaType: row.media_type,
      view: null as string | null,
      displayOrder: row.display_order ?? 9,
      secureUrl: row.media_url ?? null,
      code,
      family,
      kind,
      species,
      commonName: null as string | null,
    };
  });

  return NextResponse.json({ items });
}
