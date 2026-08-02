// Carga SSR del inventario para páginas de navegación del catálogo.
import { createClient } from '@supabase/supabase-js';
import { loadCatalogRows } from '@/lib/specimens/catalog';
import { toSpecimenView, type SpecimenView } from '@/lib/specimens/view';
import { listNodeMediaInventoryEntries } from '@/lib/services/node-media-inventory';
import { isNodeMediaPublicId } from '@/lib/mirror/contract';

/** Filas sintéticas: solo aportan public_ids de `_card`/`_video` al inventario de media. */
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

export async function loadCatalogueSpecimens(): Promise<{
  specimens: SpecimenView[];
  error: string | null;
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !key) {
    return { specimens: [], error: 'Supabase no configurado' };
  }
  try {
    const [{ rows, error }, nodeEntries] = await Promise.all([
      loadCatalogRows(createClient(url, key)),
      listNodeMediaInventoryEntries().catch(
        () => [] as Array<{ publicId: string; version: number | null }>,
      ),
    ]);
    const specimens = [
      ...rows.map((row) => toSpecimenView(row)),
      ...nodeMediaPseudoViews(nodeEntries),
    ];
    return { specimens, error };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error cargando catálogo';
    return { specimens: [], error: message };
  }
}
