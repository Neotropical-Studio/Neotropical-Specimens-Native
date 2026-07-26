// ============================================================================
// Mapeo puro Sanity → filas Supabase para `specimens`/`taxonomy`. Sin I/O: sólo
// transforma el documento (ya dereferenciado) a los shapes que leen
// lib/specimens/view.ts y lib/specimens/detail.ts. La orquestación (fetch a
// Sanity, resolución de FKs, upsert) vive en lib/sync/upsertSpecimen.ts.
// ============================================================================

// Linaje dereferenciado desde `genero` hacia arriba (Género→Subfamilia→
// Familia→Rubro) — común a `especie` y a la `especie` de una `subespecie`.
export interface SanityGeneroChain {
  name?: string | null;
  subfamilia?: {
    name?: string | null;
    familia?: {
      name?: string | null;
      rubro?: { name?: string | null } | null;
    } | null;
  } | null;
}

// specimen.taxon referencia `especie` o `subespecie` (ver sanity/schemas/
// specimen.ts) — el shape depende de _type: una `subespecie` cuelga de su
// propia `especie`, que a su vez cuelga de `genero`.
export interface SanityTaxonRef {
  _id?: string;
  _type?: string;             // 'especie' | 'subespecie'
  name?: string | null;
  genero?: SanityGeneroChain | null;
  especie?: { name?: string | null; genero?: SanityGeneroChain | null } | null;
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

// Construye rank_hierarchy siguiendo la cadena de referencias en vez de leer
// campos planos (ver migración de sanity/schemas/taxonomicNode.ts → cadena
// estricta Rubro→Familia→Subfamilia→Género→Especie→Subespecie).
//
// OJO: no hay campo "order" (orden biológico, p. ej. Lepidoptera) en la cadena
// nueva — "rubro" es el rubro comercial/museográfico (p. ej. Mariposas), un
// concepto distinto. lib/theme/taxon.ts y el badge de "orden" en la UI se
// quedan sin dato para specimens sincronizados por esta vía hasta que se
// decida si rubro sustituye a order en esos consumidores.
export function buildRankHierarchy(taxon: SanityTaxonRef | null | undefined): Record<string, string> {
  const rh: Record<string, string> = {};
  if (!taxon) return rh;

  const isSubspecies = taxon._type === 'subespecie';
  const especie = isSubspecies ? taxon.especie : null;
  const genero = isSubspecies ? especie?.genero : taxon.genero;

  const name = (v: string | null | undefined) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

  if (isSubspecies) {
    const subspecies = name(taxon.name);
    const species = name(especie?.name);
    if (subspecies) rh.subspecies = subspecies;
    if (species) rh.species = species;
  } else {
    const species = name(taxon.name);
    if (species) rh.species = species;
  }

  const genus = name(genero?.name);
  const subfamily = name(genero?.subfamilia?.name);
  const family = name(genero?.subfamilia?.familia?.name);
  const rubro = name(genero?.subfamilia?.familia?.rubro?.name);

  if (genus) rh.genus = genus;
  if (subfamily) rh.subfamily = subfamily;
  if (family) rh.family = family;
  if (rubro) rh.rubro = rubro;

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
