// ============================================================================
// Los 3 rubros del storefront = los 3 hijos exactos de Cloudinary `RUBROS/`.
// No inventar un 4º. Slugs estables para rutas web; `folder` = segmento Cloudinary.
//
//   dried-specimens      → ESPECIMENS SECOS BIOLOGICOS Y INSECTOS COLEOPTEROS  Y ARHHROPODS
//   zoology-skeletons    → ESQUELETOS DE ZOOLOGIA , BIRS, BATS,AMPHIBIANS,CRUSATACEOS
//   dry-plants-no-cites  → PLANTAS SECAS NO-CITES
//
// Artrópodos / Insects(arthropoda) = categoría bajo dried-specimens, no rubro.
// ============================================================================

import {
  RUBRO_FOLDER,
  RUBRO_FOLDER_PLANTS,
  RUBRO_FOLDER_SKELETONS,
} from '@/scripts/sync-cloudinary/roots';

export const INVENTORY_RUBROS = [
  {
    id: 'dried-specimens',
    label: 'Especímenes secos biológicos',
    folder: RUBRO_FOLDER,
    // Paths Cloudinary + taxonomía; Insects(arthropoda) vive bajo este rubro.
    match:
      /especimen|specimen|insect|coleopter|lepidopter|morpho|nymphal|papilion|saturni|brassol|danaid|arthropod|arhhropod|arachnid|crustace|scorpion|tarantul|mantodea|odonata/i,
  },
  {
    id: 'zoology-skeletons',
    label: 'Esqueletos de zoología',
    folder: RUBRO_FOLDER_SKELETONS,
    match: /esqueleto|skeleton|zoolog|birs|bird|bat|amphibian|amphif|crusatac|mammal/i,
  },
  {
    id: 'dry-plants-no-cites',
    label: 'Plantas secas no-CITES',
    folder: RUBRO_FOLDER_PLANTS,
    match: /planta|plant|botanic|flora|herbari|no-cites|nocites/i,
  },
] as const;

export type InventoryRubroId = (typeof INVENTORY_RUBROS)[number]['id'];

/** Hub `/[lang]/catalogue` = exactamente estos 3. */
export const STOREFRONT_RUBROS = INVENTORY_RUBROS;

/** Alias legacy → id canónico (inventario / carrito antiguos). */
const LEGACY_RUBRO_ID: Record<string, InventoryRubroId> = {
  arthropods: 'dried-specimens',
  'dried-plants': 'dry-plants-no-cites',
};

export function canonicalizeRubroId(id: string | null | undefined): InventoryRubroId | null {
  if (!id) return null;
  if (LEGACY_RUBRO_ID[id]) return LEGACY_RUBRO_ID[id];
  return INVENTORY_RUBROS.some((r) => r.id === id) ? (id as InventoryRubroId) : null;
}

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

/** Detecta el rubro: primero por segmento de carpeta Cloudinary en el path, luego regex. */
export function detectRubro(input: {
  mediaHint?: string | null;
  order?: string | null;
  family?: string | null;
  genus?: string | null;
  scientificName?: string | null;
}): { id: InventoryRubroId; label: string } {
  const hint = input.mediaHint ?? '';
  for (const rubro of INVENTORY_RUBROS) {
    if (hint.includes(rubro.folder)) {
      return { id: rubro.id, label: rubro.label };
    }
  }

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
  return { id: 'dried-specimens', label: INVENTORY_RUBROS[0].label };
}

/**
 * Playlist del carrusel: hasta `perRubro` con imagen por cada uno de los 3
 * rubros, intercalados (round-robin).
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
