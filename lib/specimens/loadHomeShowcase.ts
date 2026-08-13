// Portada: inventario liviano (conteos + covers de categoría + pool hero).
// No descarga specimen_media de todo el catálogo — eso hundía el TTFB de /[lang].
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { loadCatalogPool } from '@/lib/specimens/catalog';
import {
  attachMedia,
  SPECIMEN_SELECT,
  toSpecimenView,
  type SpecimenRow,
  type SpecimenView,
} from '@/lib/specimens/view';
import { listNodeMediaInventoryEntries } from '@/lib/services/node-media-inventory';
import { isNodeMediaPublicId } from '@/lib/mirror/contract';

const HERO_POOL = 36;
const HOME_REVALIDATE_SECONDS = 45;

function nodeMediaPseudoViews(
  entries: Array<{ publicId: string; version: number | null }>,
): SpecimenView[] {
  return entries
    .filter((e) => isNodeMediaPublicId(e.publicId))
    .map((e, i) => ({
      id: `node-media:${i}:${e.publicId}`,
      code: '',
      scientificName: '',
      commonName: null,
      order: null,
      family: null,
      genus: null,
      speciesEpithet: null,
      subspecies: null,
      regionName: null,
      regionCode: null,
      country: null,
      sex: null,
      grade: null,
      gradeName: null,
      wingspanMm: null,
      colors: [],
      price: null,
      currency: 'USD',
      stock: 0,
      images: [{ view: 'node', publicId: e.publicId }],
      primaryImage: e.publicId,
      secondaryImage: null,
      model3d: null,
      video:
        e.publicId.includes('/_video/') || e.publicId.includes('/video/')
          ? e.publicId
          : null,
      mediaVersion: e.version,
      rubroId: null,
      rubroLabel: null,
      categoria: null,
    }));
}

async function loadHomeShowcaseUncached(): Promise<{
  specimens: SpecimenView[];
  error: string | null;
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !key) {
    return { specimens: [], error: 'Supabase no configurado' };
  }

  const supabase = createClient(url, key);

  try {
    const [inventoryRes, heroPool, nodeEntries] = await Promise.all([
      // Conteos / categorías: filas sin round-trip de specimen_media.
      supabase
        .from('specimens')
        .select(SPECIMEN_SELECT)
        .order('created_at', { ascending: false }),
      loadCatalogPool(supabase, HERO_POOL),
      listNodeMediaInventoryEntries().catch(
        () => [] as Array<{ publicId: string; version: number | null }>,
      ),
    ]);

    const inventoryRows = attachMedia(
      (inventoryRes.data ?? []) as SpecimenRow[],
      new Map(),
    ).map(toSpecimenView);

    const heroById = new Map(
      heroPool.map((row) => [row.id, toSpecimenView(row)] as const),
    );

    // Preferir media rica del pool hero cuando exista la misma ficha.
    const merged = inventoryRows.map((s) => heroById.get(s.id) ?? s);
    for (const hero of heroById.values()) {
      if (!merged.some((s) => s.id === hero.id)) merged.push(hero);
    }

    return {
      specimens: [...merged, ...nodeMediaPseudoViews(nodeEntries)],
      error: inventoryRes.error?.message ?? null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error cargando portada';
    return { specimens: [], error: message };
  }
}

/** Portada regenerativa con TTL corto (sigue vivo, sin bloquear cada request). */
export function loadHomeShowcaseSpecimens(): Promise<{
  specimens: SpecimenView[];
  error: string | null;
}> {
  const cached = unstable_cache(loadHomeShowcaseUncached, ['neo-home-showcase-v1'], {
    revalidate: HOME_REVALIDATE_SECONDS,
    tags: ['neo-home', 'neo-node-media'],
  });
  return cached();
}
