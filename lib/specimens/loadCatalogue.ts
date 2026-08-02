// Carga SSR del inventario para páginas de navegación del catálogo.
import { createClient } from '@supabase/supabase-js';
import { loadCatalogRows } from '@/lib/specimens/catalog';
import { toSpecimenView, type SpecimenView } from '@/lib/specimens/view';
import { listNodeMediaInventoryPublicIds } from '@/lib/services/node-media-inventory';
import { isNodeMediaPublicId } from '@/lib/mirror/contract';

/** Filas sintéticas: solo aportan public_ids de `_card`/`_video` al inventario de media. */
function nodeMediaPseudoViews(publicIds: string[]): SpecimenView[] {
  return publicIds.filter(isNodeMediaPublicId).map((pid, i) => ({
    id: `node-media:${i}:${pid}`,
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
    images: [{ view: 'node', publicId: pid }],
    primaryImage: pid,
    secondaryImage: null,
    model3d: null,
    video: pid.includes('/_video/') || pid.includes('/video/') ? pid : null,
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
    const [{ rows, error }, nodeIds] = await Promise.all([
      loadCatalogRows(createClient(url, key)),
      listNodeMediaInventoryPublicIds().catch(() => [] as string[]),
    ]);
    const specimens = [
      ...rows.map((row) => toSpecimenView(row)),
      ...nodeMediaPseudoViews(nodeIds),
    ];
    return { specimens, error };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error cargando catálogo';
    return { specimens: [], error: message };
  }
}
