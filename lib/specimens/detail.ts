// ============================================================================
// Vista de detalle de espécimen (página /[lang]/product/[id]). Extiende la
// vista base con los campos que necesita la ficha: subfamilia, GPS, las cuatro
// tomas (dorsal/ventral/lateral/macro), precio mayorista y contenido localizado.
// Todo proviene de JSONB — sin literales de negocio en el código.
// ============================================================================
import { createClient } from '@supabase/supabase-js';
import {
  MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_ID,
  MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_VENTRAL_ID,
} from '@/lib/cloudinary/specimens';
import { loadCatalogRowById } from './catalog';
import {
  isMorphoGodartyDidiusTingomarensis,
  MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_SPECIMEN_ID,
  MORPHO_GODARTY_NATIVE,
} from './native/morphoGodartyDidiusTingomarensis';
import {
  toSpecimenView,
  type SpecimenRow,
  type SpecimenView,
} from './view';

export interface SpecimenViews {
  dorsal: string | null;
  ventral: string | null;
  lateral: string | null;
  macro: string | null;
}

export interface SpecimenDetailView extends SpecimenView {
  subfamily: string | null;
  gpsCoordinates: string | null;
  description: string | null;
  wholesalePrice: number | null;
  wholesaleMinQty: number | null;
  views: SpecimenViews;
  // Override camaleónico opcional (colores hex) para la paleta taxonómica.
  themeOverride: Record<string, unknown> | null;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null;
}
function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

// Contenido localizado del espécimen: attributes.i18n[lang] con fallback a la
// subetiqueta primaria y luego al valor base del atributo.
function makeLocalizer(attrs: Record<string, unknown>, lang: string) {
  const i18n = (attrs.i18n as Record<string, Record<string, unknown>> | undefined) ?? {};
  const base = lang.split('-')[0].toLowerCase();
  const exact = i18n[lang];
  const near = i18n[base] ?? Object.entries(i18n).find(([k]) => k.split('-')[0].toLowerCase() === base)?.[1];
  return (field: string): string | null =>
    str(exact?.[field]) ?? str(near?.[field]) ?? str(attrs[field]);
}

export function toSpecimenDetail(row: SpecimenRow, lang: string): SpecimenDetailView {
  const base = toSpecimenView(row);
  const attrs = row.attributes ?? {};
  const pricing = row.pricing ?? {};
  const localize = makeLocalizer(attrs, lang);

  const byView = (name: string): string | null =>
    base.images.find((i) => i.view === name)?.publicId ?? null;

  const views: SpecimenViews = {
    dorsal: byView('dorsal') ?? base.primaryImage,
    ventral: byView('ventral') ?? base.secondaryImage,
    lateral: byView('lateral'),
    macro: byView('macro'),
  };

  const native = isMorphoGodartyDidiusTingomarensis({
    id: base.id,
    scientificName: base.scientificName,
    speciesName: row.species_name,
  })
    ? MORPHO_GODARTY_NATIVE
    : null;

  // Con perfil nativo, la ficha usa esos valores de forma exclusiva (sin
  // mezclar familia/GPS/precios de otras especies ni del row incompleto).
  const mapped: SpecimenDetailView = {
    ...base,
    scientificName: native?.scientificName ?? base.scientificName,
    commonName: native?.commonName ?? localize('common_name') ?? base.commonName,
    order: native?.order ?? base.order,
    family: native?.family ?? base.family,
    genus: native?.genus ?? base.genus,
    subfamily: native?.subfamily ?? str(row.taxonomy?.subfamily_name),
    sex: native?.sex ?? str(attrs.sex) ?? str(row.attributes?.sex_type) ?? base.sex,
    grade: native?.grade ?? base.grade,
    gradeName: native ? native.gradeName : base.gradeName,
    colors: native ? [...native.colors] : base.colors,
    regionCode: native?.regionCode ?? base.regionCode,
    country: native?.country ?? base.country,
    regionName: native?.regionName ?? base.regionName,
    code: native?.catalogCode ?? base.code,
    currency: native?.currency ?? base.currency,
    price: native?.price ?? base.price,
    stock: native?.stock ?? base.stock,
    gpsCoordinates:
      native?.gpsCoordinates ??
      str(attrs.gps_coordinates) ??
      str(attrs.gps) ??
      str(row.region?.gps_coordinates) ??
      null,
    description: native?.description ?? localize('description'),
    wholesalePrice:
      native?.wholesalePrice ?? num((pricing as Record<string, unknown>).wholesale_price),
    wholesaleMinQty:
      native?.wholesaleMinQty ?? num((pricing as Record<string, unknown>).wholesale_min_qty),
    views,
    themeOverride:
      (attrs.theme as Record<string, unknown>) ??
      (attrs.themeConfig as Record<string, unknown>) ??
      null,
  };

  return native ? sealMorphoDetailView(mapped) : mapped;
}

/** Ficha Morpho 100 % completa (sin depender de Supabase ni de props vacías). */
export function buildMorphoGodartyDetailView(): SpecimenDetailView {
  const n = MORPHO_GODARTY_NATIVE;
  const mediaId = MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_ID;
  const ventralId = MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_VENTRAL_ID;
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
      { view: 'dorsal', publicId: mediaId },
      { view: 'ventral', publicId: ventralId },
    ],
    primaryImage: mediaId,
    secondaryImage: ventralId,
    model3d: null,
    video: null,
    rubroId: 'dried-specimens',
    rubroLabel: 'Espécimenes secos biológicos',
    subfamily: n.subfamily,
    gpsCoordinates: n.gpsCoordinates,
    description: n.description,
    wholesalePrice: n.wholesalePrice,
    wholesaleMinQty: n.wholesaleMinQty,
    views: {
      dorsal: mediaId,
      ventral: ventralId,
      lateral: null,
      macro: null,
    },
    themeOverride: null,
  };
}

/**
 * Sella la ficha Morpho: cualquier campo vacío/roto se rellena con el perfil
 * nativo. Conserva media real si ya vino del catálogo.
 */
export function sealMorphoDetailView(view: SpecimenDetailView): SpecimenDetailView {
  if (
    !isMorphoGodartyDidiusTingomarensis({
      id: view.id,
      scientificName: view.scientificName,
    })
  ) {
    return view;
  }
  const n = MORPHO_GODARTY_NATIVE;
  const primary = view.primaryImage ?? MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_ID;
  const ventral =
    view.views.ventral ??
    view.secondaryImage ??
    MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_VENTRAL_ID;
  const hasVentralImage = view.images.some(
    (img) => img.publicId === ventral || img.view === 'ventral',
  );
  return {
    ...view,
    code: n.catalogCode,
    scientificName: n.scientificName,
    commonName: n.commonName,
    order: n.order,
    family: n.family,
    genus: n.genus,
    subfamily: n.subfamily,
    regionName: n.regionName,
    regionCode: n.regionCode,
    country: n.country,
    sex: n.sex,
    grade: n.grade,
    gradeName: n.gradeName,
    colors: [...n.colors],
    price: n.price,
    currency: n.currency,
    stock: n.stock,
    gpsCoordinates: n.gpsCoordinates,
    description: n.description,
    wholesalePrice: n.wholesalePrice,
    wholesaleMinQty: n.wholesaleMinQty,
    primaryImage: primary,
    secondaryImage: ventral,
    images: hasVentralImage
      ? view.images
      : [
          ...view.images,
          { view: 'ventral', publicId: ventral },
        ],
    views: {
      dorsal: view.views.dorsal ?? primary,
      ventral,
      lateral: view.views.lateral,
      macro: view.views.macro,
    },
  };
}

// Carga un espécimen por id. Si es Morpho y Supabase falla/demora/vacío,
// entrega de inmediato la ficha nativa completa (sin huecos en la UI).
export async function getSpecimenById(id: string, lang: string): Promise<SpecimenDetailView | null> {
  const morphoFallback =
    id === MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_SPECIMEN_ID
      ? buildMorphoGodartyDetailView()
      : null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !key) return morphoFallback;

  try {
    const supabase = createClient(url, key);
    const { row } = await loadCatalogRowById(supabase, id);
    if (!row) return morphoFallback;
    return toSpecimenDetail(row, lang);
  } catch {
    return morphoFallback;
  }
}
