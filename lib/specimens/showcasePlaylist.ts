// ============================================================================
// Playlist del visor camaleónico del hero.
// Preferencia: especímenes reales con foto, repartidos por rubro.
// Si el inventario está vacío o sin media → Morpho nativo (dorsal/ventral)
// para que la rotación nunca se apague detrás de un empty state.
//
// IMPORTANTE: no importar catalogueNav / mirror/contract aquí. Ese grafo es
// enorme y se ejecutaría en el SSR del Hero (client component). Un throw en
// ese path tumba toda la portada con "Application error".
// ============================================================================

import {
  MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_ID,
  MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_VENTRAL_ID,
  MORPHO_HERO_URL,
  MORPHO_VENTRAL_URL,
} from '@/lib/cloudinary/specimens';
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
    speciesEpithet: 'didius',
    subspecies: 'tingomarensis',
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

/**
 * Playlist del hero: inventario real por rubro → Morpho.
 * Nunca devuelve vacío ni lanza: el visor camaleónico siempre tiene qué rotar.
 */
export function buildShowcasePlaylist(
  specimens: SpecimenView[],
  perRubro = 3,
): ShowcaseSpecimen[] {
  try {
    const list = Array.isArray(specimens) ? specimens.filter(Boolean) : [];
    const fromInventory = pickFeaturedAcrossRubros(list, perRubro);
    if (fromInventory.length >= 2) return fromInventory;

    const seen = new Set(fromInventory.map((s) => s.id));
    const merged: ShowcaseSpecimen[] = [...fromInventory];

    for (const seed of morphoShowcaseSeeds()) {
      if (seen.has(seed.id)) continue;
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
  } catch {
    return morphoShowcaseSeeds();
  }
}
