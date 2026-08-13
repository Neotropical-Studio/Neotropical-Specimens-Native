// GET /api/admin/media-gallery
// Devuelve specimen_media enriquecido con taxonomía para filtros de clasificación.
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
  specimen_code?: string | null;
  species_name?: string | null;
  familia?: string | null;
  genero?: string | null;
  especie?: string | null;
  subespecie?: string | null;
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
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const db = getSupabaseAdmin();

    const { data: mediaRows, error: mediaError } = await db
      .from('specimen_media')
      .select('id, specimen_id, public_id, media_type, display_order, media_url, view')
      .order('display_order', { ascending: true })
      .limit(4000);

    if (mediaError) {
      // `view` puede no existir en schemas viejos
      const fallback = await db
        .from('specimen_media')
        .select('id, specimen_id, public_id, media_type, display_order, media_url')
        .order('display_order', { ascending: true })
        .limit(4000);
      if (fallback.error) {
        return NextResponse.json(
          { ok: false, error: fallback.error.message },
          { status: 500 },
        );
      }
      return enrichAndRespond(fallback.data ?? [], db);
    }

    return enrichAndRespond(mediaRows ?? [], db);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

async function enrichAndRespond(
  media: Array<{
    id: string;
    specimen_id: string | null;
    public_id: string;
    media_type: string;
    display_order: number | null;
    media_url?: string | null;
    view?: string | null;
  }>,
  db: ReturnType<typeof getSupabaseAdmin>,
) {
  try {
  const specimenIds = [...new Set(media.map((m) => m.specimen_id).filter(Boolean))] as string[];
  const bySpecimen = new Map<string, SpecimenLite>();

  if (specimenIds.length > 0) {
    const enriched = await db
      .from('specimens')
      .select(
        `
        id,
        specimen_code,
        species_name,
        familia,
        genero,
        especie,
        subespecie,
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
      // Sin specimen_code / subespecie en schemas viejos
      const soft = await db
        .from('specimens')
        .select(
          `
          id,
          species_name,
          familia,
          genero,
          especie,
          rubro,
          categoria
        `,
        )
        .in('id', specimenIds);
      if (soft.error) {
        return NextResponse.json({ ok: false, error: soft.error.message }, { status: 500 });
      }
      for (const row of (soft.data ?? []) as SpecimenLite[]) {
        bySpecimen.set(row.id, row);
      }
    } else {
      for (const row of (enriched.data ?? []) as SpecimenLite[]) {
        bySpecimen.set(row.id, row);
      }
    }
  }

  const items = media.map((row) => {
    const sp = row.specimen_id ? bySpecimen.get(row.specimen_id) : undefined;
    const tax = asTaxonomy(sp?.taxonomy);

    const family = str(tax?.family_name) ?? str(sp?.familia) ?? null;
    const genus = str(sp?.genero) ?? str(tax?.genus_name) ?? null;
    const speciesEpithet = str(sp?.especie) ?? null;
    const subspecies = str(sp?.subespecie) ?? null;
    const composedName = [genus, speciesEpithet, subspecies].filter(Boolean).join(' ');
    const species =
      str(tax?.species_name) ?? str(sp?.species_name) ?? (composedName || null);
    const rubro = str(sp?.rubro) ?? null;
    const category = str(sp?.categoria) ?? null;
    const kind = rubro ?? category;
    const code =
      str(sp?.specimen_code) ??
      (sp?.id ? `LEGACY-${sp.id.replace(/-/g, '').slice(0, 8).toUpperCase()}` : '');

    return {
      id: row.id,
      specimenId: row.specimen_id,
      publicId: row.public_id,
      mediaType: row.media_type,
      view: str(row.view) ?? null,
      displayOrder: row.display_order ?? 9,
      secureUrl: row.media_url ?? null,
      code,
      family,
      genus,
      speciesEpithet,
      subspecies,
      category,
      kind,
      species,
      commonName: null as string | null,
    };
  });

  return NextResponse.json({ ok: true, items, autoStudio: true, pageSizeDefault: 10 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
