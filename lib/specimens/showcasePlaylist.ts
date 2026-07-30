// ============================================================================
// Playlist del visor camaleónico del hero.
// Preferencia: especímenes reales con foto, repartidos por rubro.
// Si el inventario está vacío o sin media → covers de nodos de catálogo
// (cuando existan) + Morpho nativo (dorsal/ventral) para que la rotación
// nunca se apague detrás de un empty state.
// ============================================================================

import {
  MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_ID,
  MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_VENTRAL_ID,
  MORPHO_HERO_URL,
  MORPHO_VENTRAL_URL,
} from '@/lib/cloudinary/specimens';
import { buildRubroNodes } from './catalogueNav';
import {
  MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_SPECIMEN_ID,
  MORPHO_GODARTY_NATIVE,
} from './native/morphoGodartyDidiusTingomarensis';
import { INVENTORY_RUBROS, pickFeaturedAcrossRubros, type InventoryRubroId } from './rubros';
import type { SpecimenView } from './view';

export type ShowcaseSpecimen = SpecimenView & {
  rubroId: InventoryRubroId;
  rubroLabel: string;
};

function morphoBase(): SpecimenView {
  const n = MORPHO_GODARTY_NATIVE;
  return {
    id: MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_SPECIMEN_ID,
    code: n.catalogCode,
    scientificName: n.scientificName,
    commonName: n.commonName,
    order: n.order,
    family: n.family,
    genus: n.genus,
    regionName: n.regionName,
    regionCode: n.regionCode,
    country: n.country,
    sex: n.sex,
    grade: n.grade,
    gradeName: n.gradeName,
    wingspanMm: null,
    colors: [...n.colors],
    price: n.price,
    currency: n.currency,
    stock: n.stock,
    images: [
      { view: 'dorsal', publicId: MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_ID },
      { view: 'ventral', publicId: MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_VENTRAL_ID },
    ],
    primaryImage: MORPHO_HERO_URL,
    secondaryImage: MORPHO_VENTRAL_URL,
    model3d: null,
    video: null,
    rubroId: 'dried-specimens',
    rubroLabel: INVENTORY_RUBROS[0].label,
    categoria: 'Butterflies(lepidoptera) Diurne',
  };
}

/** Semillas Morpho (dorsal + ventral) — siempre disponibles offline. */
export function morphoShowcaseSeeds(): ShowcaseSpecimen[] {
  const base = morphoBase();
  const dried = INVENTORY_RUBROS[0];
  return [
    {
      ...base,
      rubroId: dried.id,
      rubroLabel: dried.label,
      primaryImage: MORPHO_HERO_URL,
    },
    {
      ...base,
      id: `${MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_SPECIMEN_ID}:ventral`,
      rubroId: dried.id,
      rubroLabel: dried.label,
      primaryImage: MORPHO_VENTRAL_URL,
      secondaryImage: MORPHO_HERO_URL,
      scientificName: `${base.scientificName} · ventral`,
    },
  ];
}

/** Covers `_card` de nodos rubro presentes en el inventario sincronizado. */
function catalogueNodeSlides(specimens: SpecimenView[]): ShowcaseSpecimen[] {
  const nodes = buildRubroNodes(specimens);
  const out: ShowcaseSpecimen[] = [];
  for (const node of nodes) {
    if (!node.coverPublicId) continue;
    const rubro = INVENTORY_RUBROS.find((r) => r.id === node.id);
    if (!rubro) continue;
    out.push({
      id: `catalogue-node:${node.id}`,
      code: `RUBRO-${node.id}`,
      scientificName: node.label,
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
      images: [{ view: 'cover', publicId: node.coverPublicId }],
      primaryImage: node.coverPublicId,
      secondaryImage: null,
      model3d: null,
      video: node.videoPublicId,
      rubroId: rubro.id,
      rubroLabel: rubro.label,
      categoria: null,
    });
  }
  return out;
}

/**
 * Playlist del hero: inventario real por rubro → covers de catálogo → Morpho.
 * Nunca devuelve vacío: el visor camaleónico siempre tiene qué rotar.
 */
export function buildShowcasePlaylist(
  specimens: SpecimenView[],
  perRubro = 3,
): ShowcaseSpecimen[] {
  const fromInventory = pickFeaturedAcrossRubros(specimens, perRubro);
  if (fromInventory.length >= 2) return fromInventory;

  const seen = new Set(fromInventory.map((s) => s.id));
  const merged: ShowcaseSpecimen[] = [...fromInventory];

  for (const slide of catalogueNodeSlides(specimens)) {
    if (seen.has(slide.id)) continue;
    seen.add(slide.id);
    merged.push(slide);
  }
  if (merged.length >= 2) return merged;

  for (const seed of morphoShowcaseSeeds()) {
    if (seen.has(seed.id)) continue;
    // Si ya hay Morpho dorsal en inventario, no duplicar el mismo asset.
    if (
      seed.id === MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_SPECIMEN_ID &&
      merged.some((s) => s.id === MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_SPECIMEN_ID)
    ) {
      continue;
    }
    seen.add(seed.id);
    merged.push(seed);
  }

  return merged.length > 0 ? merged : morphoShowcaseSeeds();
}
