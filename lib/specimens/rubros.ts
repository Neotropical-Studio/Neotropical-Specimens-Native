// ============================================================================
// Los 4 rubros reales del inventario (espejo de las carpetas raíz bajo
// Cloudinary `RUBROS/…`). No son categorías inventadas: son las facetas
// físicas/museográficas con las que se organiza el catálogo en Cloudinary
// y, por extensión, en Supabase. El carrusel del escaparate reparte las
// fotos rotando entre estos 4, nunca inventando assets externos.
// ============================================================================

export const INVENTORY_RUBROS = [
  {
    id: 'dried-specimens',
    label: 'Especímenes secos biológicos',
    // Coincide con carpetas Cloudinary / paths / taxonomía de insectos.
    match: /especimen|specimen|insect|coleopter|lepidopter|morpho|nymphal|papilion|saturni|brassol|danaid/i,
  },
  {
    id: 'arthropods',
    label: 'Artrópodos',
    match: /arthropod|arhhropod|arachnid|crustace|scorpion|tarantul|mantodea|odonata/i,
  },
  {
    id: 'zoology-skeletons',
    label: 'Esqueletos de zoología',
    match: /esqueleto|skeleton|zoolog|bird|bat|amphibian|amphif|crusatac|mammal/i,
  },
  {
    id: 'dried-plants',
    label: 'Plantas secas no-CITES',
    match: /planta|plant|botanic|flora|herbari/i,
  },
] as const;

export type InventoryRubroId = (typeof INVENTORY_RUBROS)[number]['id'];

export interface RubroAware {
  id: string;
  primaryImage: string | null;
  family?: string | null;
  order?: string | null;
  genus?: string | null;
  scientificName?: string | null;
  rubroId?: InventoryRubroId | null;
  rubroLabel?: string | null;
}

/** Detecta el rubro de un espécimen a partir de su URL/public_id de Cloudinary
 *  y de su taxonomía. Preferencia: path de media → orden → familia → género. */
export function detectRubro(input: {
  mediaHint?: string | null;
  order?: string | null;
  family?: string | null;
  genus?: string | null;
  scientificName?: string | null;
}): { id: InventoryRubroId; label: string } {
  const haystack = [
    input.mediaHint,
    input.order,
    input.family,
    input.genus,
    input.scientificName,
  ]
    .filter(Boolean)
    .join(' ');

  for (const rubro of INVENTORY_RUBROS) {
    if (rubro.match.test(haystack)) {
      return { id: rubro.id, label: rubro.label };
    }
  }
  // Default: el rubro mayoritario del inventario (especímenes secos).
  return { id: 'dried-specimens', label: INVENTORY_RUBROS[0].label };
}

/**
 * Arma la playlist del carrusel: hasta `perRubro` especímenes CON imagen
 * por cada uno de los 4 rubros, intercalados (round-robin) para que la
 * rotación de 15s atraviese categorías distintas en vez de quedarse en un
 * solo lote de la misma familia.
 */
export function pickFeaturedAcrossRubros<T extends RubroAware>(
  specimens: T[],
  perRubro = 3,
): Array<T & { rubroId: InventoryRubroId; rubroLabel: string }> {
  const withImage = specimens.filter((s) => Boolean(s.primaryImage));
  const buckets = new Map<InventoryRubroId, Array<T & { rubroId: InventoryRubroId; rubroLabel: string }>>();
  for (const rubro of INVENTORY_RUBROS) buckets.set(rubro.id, []);

  for (const s of withImage) {
    const detected = detectRubro({
      mediaHint: s.primaryImage,
      order: s.order,
      family: s.family,
      genus: s.genus,
      scientificName: s.scientificName,
    });
    const list = buckets.get(detected.id)!;
    if (list.length < perRubro) {
      list.push({ ...s, rubroId: detected.id, rubroLabel: detected.label });
    }
  }

  const queues = INVENTORY_RUBROS.map((r) => [...(buckets.get(r.id) ?? [])]);
  const out: Array<T & { rubroId: InventoryRubroId; rubroLabel: string }> = [];
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const q of queues) {
      const next = q.shift();
      if (next) {
        out.push(next);
        progressed = true;
      }
    }
  }
  return out;
}
