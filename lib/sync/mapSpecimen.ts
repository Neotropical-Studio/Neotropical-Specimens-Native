// ============================================================================
// Mapeo puro Sanity → filas Supabase para `specimens`/`taxonomy`. Sin I/O: sólo
// transforma el documento (ya dereferenciado) a los shapes que leen
// lib/specimens/view.ts y lib/specimens/detail.ts. La orquestación (fetch a
// Sanity, resolución de FKs, upsert) vive en lib/sync/upsertSpecimen.ts.
// ============================================================================

export interface SanityTaxonRef {
  _id?: string;
  order?: string | null;
  family?: string | null;
  subfamily?: string | null;
  genus?: string | null;
  species?: string | null;
  subspecies?: string | null;
}

export interface SanityMediaItem {
  type: 'photo_webp' | 'model_3d_glb' | 'video_mp4';
  view?: string | null;
  cloudinaryId: string;
}

export interface SanitySpecimenDoc {
  _id: string;
  _type: string;
  specimenCode: string;
  category?: string | null;
  region?: string | null;
  specimenKind?: string | null;
  retailPrice?: number | null;
  wholesalePrice?: number | null;
  wholesaleMinQty?: number | null;
  currency?: string | null;
  stock?: number | null;
  sex?: string | null;
  gradeCode?: string | null;
  gradeName?: string | null;
  wingspanMm?: number | null;
  primaryColors?: string[] | null;
  countryOrigin?: string | null;
  gpsCoordinates?: string | null;
  commonNames?: { es?: string; en?: string } | null;
  description?: { es?: string; en?: string } | null;
  themePrimary?: string | null;
  themeAccent?: string | null;
  themeSurface?: string | null;
  media?: SanityMediaItem[] | null;
  taxon?: SanityTaxonRef | null;
}

const RANK_KEYS = ['order', 'family', 'subfamily', 'genus', 'species', 'subspecies'] as const;

// Sólo incluye rangos con valor real: rank_hierarchy no debe cargar claves vacías.
export function buildRankHierarchy(taxon: SanityTaxonRef | null | undefined): Record<string, string> {
  const rh: Record<string, string> = {};
  for (const key of RANK_KEYS) {
    const value = taxon?.[key];
    if (typeof value === 'string' && value.trim()) rh[key] = value.trim();
  }
  return rh;
}

export function buildPricing(doc: SanitySpecimenDoc): Record<string, unknown> {
  const pricing: Record<string, unknown> = { currency: doc.currency ?? 'USD' };
  if (typeof doc.retailPrice === 'number') pricing.retail_price = doc.retailPrice;
  if (typeof doc.wholesalePrice === 'number') pricing.wholesale_price = doc.wholesalePrice;
  if (typeof doc.wholesaleMinQty === 'number') pricing.wholesale_min_qty = doc.wholesaleMinQty;
  return pricing;
}

export function buildMediaAssets(doc: SanitySpecimenDoc): Array<Record<string, unknown>> {
  return (doc.media ?? [])
    .filter((m) => m?.cloudinaryId)
    .map((m) => ({
      type: m.type,
      ...(m.view ? { view: m.view } : {}),
      cloudinary_id: m.cloudinaryId,
    }));
}

// Localización: attrs.i18n[lang].{common_name,description} con fallback al
// valor base (attrs.common_name / attrs.description) — ver makeLocalizer en
// lib/specimens/detail.ts.
export function buildAttributes(doc: SanitySpecimenDoc): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};

  const commonName = doc.commonNames?.es ?? doc.commonNames?.en ?? null;
  if (commonName) attrs.common_name = commonName;

  const description = doc.description?.es ?? doc.description?.en ?? null;
  if (description) attrs.description = description;

  const i18n: Record<string, Record<string, string>> = {};
  if (doc.commonNames?.es || doc.description?.es) {
    i18n.es = {
      ...(doc.commonNames?.es ? { common_name: doc.commonNames.es } : {}),
      ...(doc.description?.es ? { description: doc.description.es } : {}),
    };
  }
  if (doc.commonNames?.en || doc.description?.en) {
    i18n.en = {
      ...(doc.commonNames?.en ? { common_name: doc.commonNames.en } : {}),
      ...(doc.description?.en ? { description: doc.description.en } : {}),
    };
  }
  if (Object.keys(i18n).length) attrs.i18n = i18n;

  if (doc.countryOrigin) attrs.country_origin = doc.countryOrigin;
  if (doc.sex) attrs.sex = doc.sex;
  if (doc.gradeCode) attrs.grade_code = doc.gradeCode;
  if (doc.gradeName) attrs.grade_name = doc.gradeName;
  if (typeof doc.wingspanMm === 'number') attrs.wingspan_mm = doc.wingspanMm;
  if (doc.primaryColors?.length) attrs.primary_colors = doc.primaryColors;
  if (doc.gpsCoordinates) attrs.gps_coordinates = doc.gpsCoordinates;

  if (doc.themePrimary || doc.themeAccent || doc.themeSurface) {
    attrs.theme = {
      ...(doc.themePrimary ? { primary: doc.themePrimary } : {}),
      ...(doc.themeAccent ? { accent: doc.themeAccent } : {}),
      ...(doc.themeSurface ? { surface: doc.themeSurface } : {}),
    };
  }

  return attrs;
}
