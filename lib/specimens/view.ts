// ============================================================================
// Vista de espécimen — normaliza filas JSONB de `specimens` a una forma limpia
// consumible por la UI (server y client comparten SELECT + mapper).
// ============================================================================
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_ID,
  MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_VENTRAL_ID,
} from '@/lib/cloudinary/specimens';
import { resolveCloudinaryPublicId } from '@/lib/cloudinary/url';
import {
  isMorphoGodartyDidiusTingomarensis,
  MORPHO_GODARTY_NATIVE,
} from './native/morphoGodartyDidiusTingomarensis';
import { detectRubro, type InventoryRubroId } from './rubros';

/** Normaliza media_url / public_id a un public_id Cloudinary usable por la UI. */
function asMediaRef(value: string | null | undefined): string | null {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return null;
  const id = resolveCloudinaryPublicId(raw);
  return id.length > 0 ? id : raw;
}

// Relaciones reales confirmadas contra el schema en vivo de PostgREST:
// - `specimens.taxonomy_id` -> `taxonomy.id` (tabla `taxonomy`, singular).
// - `specimens.region_id`   -> `global_regions.id`.
// No existe ninguna tabla `locations` ni columna `location_id` en el
// proyecto de Supabase: nunca se debe intentar ese join (PostgREST
// respondería PGRST200, "Could not find a relationship...").
//
// `specimen_media.specimen_id` SÍ existe como columna, pero NO tiene ninguna
// Foreign Key declarada en Supabase (confirmado contra el schema en vivo), así
// que PostgREST tampoco puede incrustarla vía `specimen_media(*)` — también
// responde PGRST200. Por eso la multimedia se consulta aparte, de forma
// independiente, con `fetchSpecimenMedia()` + `attachMedia()` más abajo, en
// vez de depender del cache de relaciones de PostgREST.
export const SPECIMEN_SELECT =
  '*, taxonomy:taxonomy!taxonomy_id(*), region:global_regions!region_id(*)';

export interface MediaImage {
  view: string;      // dorsal, ventral, etiqueta…
  publicId: string;  // cloudinary_id
}

export interface SpecimenView {
  id: string;
  code: string;
  scientificName: string;
  commonName: string | null;
  order: string | null;
  family: string | null;
  genus: string | null;
  /** Epíteto específico (columna especie). */
  speciesEpithet: string | null;
  subspecies: string | null;
  regionName: string | null;
  regionCode: string | null;
  country: string | null;
  sex: string | null;
  grade: string | null;
  gradeName: string | null;
  wingspanMm: number | null;
  colors: string[];
  price: number | null;
  currency: string;
  stock: number;
  images: MediaImage[];
  primaryImage: string | null;    // Cloudinary public_id o URL (media_url / specimen_media)
  secondaryImage: string | null;  // WebP ventral (para hover)
  model3d: string | null;         // public_id del .glb
  video: string | null;           // public_id del video
  /** Versión CDN Cloudinary (node media overwrite) — opcional. */
  mediaVersion?: number | null;
  /** Rubro del inventario (1 de 4) detectado desde Cloudinary path / taxonomía. */
  rubroId: InventoryRubroId | null;
  rubroLabel: string | null;
  /** Categoría de merchandising / carpeta Cloudinary (ej. Butterflies Diurne). */
  categoria: string | null;
}

// Columnas reales de la tabla `taxonomy` (singular) en Supabase — confirmadas
// contra el schema en vivo de PostgREST. `rank_hierarchy` es texto plano, no
// un objeto JSON: no se debe tratar como {order, family, genus, species}.
export interface TaxonomyRow {
  id: string;
  species_id?: string | null;
  species_name?: string | null;
  author?: string | null;
  genus_name?: string | null;
  subfamily_name?: string | null;
  family_name?: string | null;
  order_name?: string | null;
  classification_type?: string | null;
  rank_hierarchy?: string | null;
}

interface MediaAsset {
  type?: string;
  view?: string;
  cloudinary_id?: string;
}

// Columnas reales de `global_regions` — confirmadas contra el schema en vivo
// de PostgREST. No existe tabla `locations`: la geolocalización del espécimen
// vive únicamente aquí, vía `specimens.region_id`.
export interface RegionRow {
  id: string;
  region_name?: string | null;
  country?: string | null;
  locality?: string | null;
  gps_coordinates?: string | null;
  altitude?: string | null;
  name?: string | null;
}

// Columnas reales de `specimen_media` — confirmadas contra el schema en vivo
// de PostgREST. `view`/`label` son opcionales (sección C / 0009); si no
// existen, el fetch las omite vía soft fallback.
export interface MediaRow {
  id: string;
  specimen_id?: string | null;
  media_type?: string | null;
  media_url?: string | null;
  public_id?: string | null;
  display_order?: number | null;
  /** Ángulo opcional: cover | dorsal | ventral | … */
  view?: string | null;
  label?: string | null;
}

// Consulta independiente de multimedia por lote de specimen_id. No usa embed
// de PostgREST (no hay FK configurada), sino un `IN` directo sobre la propia
// tabla, así que nunca depende del cache de relaciones del schema.
export async function fetchSpecimenMedia(
  supabase: SupabaseClient,
  specimenIds: string[],
): Promise<Map<string, MediaRow[]>> {
  const byId = new Map<string, MediaRow[]>();
  const ids = [...new Set(specimenIds.filter(Boolean))];
  if (ids.length === 0) return byId;

  try {
    const full = await supabase
      .from('specimen_media')
      .select('id, specimen_id, media_type, media_url, public_id, display_order, view, label')
      .in('specimen_id', ids)
      .order('display_order', { ascending: true });

    let rows: MediaRow[] = [];
    if (!full.error && full.data) {
      rows = full.data as MediaRow[];
    } else {
      // Fallback si view/label aún no existen en live
      const core = await supabase
        .from('specimen_media')
        .select('id, specimen_id, media_type, media_url, public_id, display_order')
        .in('specimen_id', ids)
        .order('display_order', { ascending: true });
      if (core.error || !core.data) {
        console.error('Error al consultar multimedia de especímenes:', core.error);
        return byId;
      }
      rows = core.data as MediaRow[];
    }

    if (rows.length === 0) {
      console.error('La consulta de multimedia no devolvió datos.');
      return byId;
    }

    for (const row of rows) {
      if (!row.specimen_id) continue;
      const list = byId.get(row.specimen_id) ?? [];
      list.push(row);
      byId.set(row.specimen_id, list);
    }
  } catch (error) {
    console.error('Error inesperado al consultar multimedia de especímenes:', error);
  }
  return byId;
}

// Adjunta la multimedia ya cargada (fetchSpecimenMedia) a cada fila de
// specimens, sin tocar ninguna otra columna.
export function attachMedia<T extends { id: string }>(
  rows: T[],
  mediaById: Map<string, MediaRow[]>,
): (T & { specimen_media: MediaRow[] })[] {
  return rows.map((row) => ({ ...row, specimen_media: mediaById.get(row.id) ?? [] }));
}

export interface SpecimenRow {
  id: string;
  // Columnas del esquema en vivo (plano confirmado Jul 2026):
  species_name?: string | null;
  author?: string | null;
  media_url?: string | null;
  cloudinary_public_id?: string | null;
  taxonomy_id?: string | null;
  region_id?: string | null;
  rubro?: string | null;
  region?: string | RegionRow | null;
  categoria?: string | null;
  familia?: string | null;
  subfamilia?: string | null;
  genero?: string | null;
  especie?: string | null;
  subespecie?: string | null;
  gps?: string | null;
  origen?: string | null;
  localidad?: string | null;
  sexo?: string | null;
  calidad?: string | null;
  color_dominante?: string | null;
  dimensiones?: string | null;
  peso_gramos?: number | null;
  precio_menor?: number | null;
  precio_mayor?: number | null;
  status?: string | null;
  // Columnas opcionales post-migración admin (pueden no existir):
  catalog_code?: string;
  title?: string | null;
  description?: string | null;
  stock?: number;
  price_amount?: number | null;
  currency?: string | null;
  attributes?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  origin_flag_url?: string | null;
  origin_banner_url?: string | null;
  taxonomy?: TaxonomyRow | null;
  // Join global_regions (cuando region es objeto embebido):
  // Poblado aparte por attachMedia() — nunca proviene de un embed de
  // PostgREST, ya que no hay FK entre `specimen_media` y `specimens`.
  specimen_media?: MediaRow[] | null;
  specimen_code?: string;
  pricing?: { retail_price?: number; currency?: string } | null;
  media_assets?: MediaAsset[] | null;
}

function regionEmbed(row: SpecimenRow): RegionRow | null {
  return row.region && typeof row.region === 'object' ? (row.region as RegionRow) : null;
}

function scientificName(row: SpecimenRow): string {
  const t = row.taxonomy;
  const flat = [str(row.genero), str(row.especie)].filter(Boolean).join(' ');
  const genus = str(t?.genus_name) ?? str(row.genero);
  const species = str(t?.species_name) ?? str(row.species_name) ?? str(row.especie) ?? (flat || null);
  if (species) {
    return genus && !species.toLowerCase().startsWith(genus.toLowerCase())
      ? `${genus} ${species}`
      : species;
  }
  return genus ?? str(row.attributes?.scientific_name) ?? '—';
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null;
}

/**
 * Extracts the base sex code (M / F / P / U) from metadata.sexo strings
 * like "3M", "M", "F", "3P", "U", handling quantity prefixes written by
 * ingest_csv.py.
 */
function extractSexBase(v: unknown): string | null {
  if (typeof v !== 'string' || !v) return null;
  const m = v.match(/^\d*([MFPU])$/i);
  return m ? m[1].toUpperCase() : null;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function toSpecimenView(row: SpecimenRow): SpecimenView {
  const attrs = row.attributes ?? {};
  const regionObj = regionEmbed(row);
  const regionText = typeof row.region === 'string' ? row.region : null;
  const media = Array.isArray(row.specimen_media) ? row.specimen_media : [];

  // Orden canónico de fotos: cover → dorsal → ventral (por `view` si existe;
  // si no, por display_order: 0 cover, 1 dorsal, 2 ventral).
  const imageRows = media
    .filter((m) => {
      const t = (m.media_type ?? '').toLowerCase();
      return (t === 'image' || t === 'photo_webp' || !t) && (m.media_url || m.public_id);
    })
    .sort((a, b) => (a.display_order ?? 99) - (b.display_order ?? 99));

  const viewName = (m: MediaRow, index: number): string => {
    const v = (m.view ?? '').toLowerCase();
    if (v === 'cover' || v === 'principal') return 'cover';
    if (v === 'dorsal' || v === 'ventral' || v === 'lateral' || v === 'macro') return v;
    if (m.display_order === 0) return 'cover';
    if (m.display_order === 1) return 'dorsal';
    if (m.display_order === 2) return 'ventral';
    // Sin view: primer no-cover → dorsal, segundo → ventral
    const nonCover = imageRows.filter((r) => {
      const rv = (r.view ?? '').toLowerCase();
      return rv !== 'cover' && rv !== 'principal' && r.display_order !== 0;
    });
    const idx = nonCover.indexOf(m);
    if (idx === 0) return 'dorsal';
    if (idx === 1) return 'ventral';
    return index === 0 ? 'dorsal' : index === 1 ? 'ventral' : 'photo';
  };

  const images: MediaImage[] = imageRows
    .map((m, i) => ({
      view: viewName(m, i),
      publicId: asMediaRef(m.public_id) ?? asMediaRef(m.media_url) ?? '',
    }))
    .filter((m) => m.publicId.length > 0);

  const modelRow = media.find((m) => {
    const t = (m.media_type ?? '').toLowerCase();
    return (t === 'model' || t === 'model_3d_glb') && (m.media_url || m.public_id);
  });
  const videoRow = media.find((m) => {
    const t = (m.media_type ?? '').toLowerCase();
    return (t === 'video' || t === 'video_mp4') && (m.media_url || m.public_id);
  });
  const model = modelRow
    ? asMediaRef(modelRow.public_id) ?? asMediaRef(modelRow.media_url)
    : null;
  const video = videoRow
    ? asMediaRef(videoRow.public_id) ?? asMediaRef(videoRow.media_url)
    : null;

  const coverImg = images.find((i) => i.view === 'cover') ?? null;
  const dorsal = images.find((i) => i.view === 'dorsal') ?? images.find((i) => i.view !== 'cover') ?? null;
  const ventral =
    images.find((i) => i.view === 'ventral') ??
    images.filter((i) => i.view !== 'cover' && i !== dorsal)[0] ??
    null;

  const name = scientificName(row);
  // Perfil nativo SOLO para Morpho godarty didius tingomarensis (nunca otras especies).
  const native = isMorphoGodartyDidiusTingomarensis({
    id: row.id,
    scientificName: name,
    speciesName: row.species_name,
  })
    ? MORPHO_GODARTY_NATIVE
    : null;

  // Cover preferido: cloudinary_public_id / media_url → cover slot → dorsal.
  // Morpho nativo: nunca dejar primaryImage vacío (el hero depende de media).
  const primaryImage =
    asMediaRef(row.cloudinary_public_id) ??
    asMediaRef(row.media_url) ??
    coverImg?.publicId ??
    dorsal?.publicId ??
    asMediaRef(row.origin_banner_url) ??
    (native ? MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_ID : null);

  const colors = Array.isArray(attrs.primary_colors)
    ? (attrs.primary_colors as unknown[]).filter((c): c is string => typeof c === 'string')
    : Array.isArray(attrs.color_palette)
      ? (attrs.color_palette as unknown[]).filter((c): c is string => typeof c === 'string')
      : str(row.color_dominante)
        ? [row.color_dominante as string]
        : [];

  const order = native?.order ?? str(row.taxonomy?.order_name) ?? str(row.metadata?.order) ?? null;
  const family =
    native?.family ??
    str(row.taxonomy?.family_name) ??
    str(row.familia) ??
    str(row.metadata?.family) ??
    null;
  const genus =
    native?.genus ?? str(row.taxonomy?.genus_name) ?? str(row.genero) ?? str(row.metadata?.genus) ?? null;
  const speciesEpithet = str(row.especie) ?? str(row.metadata?.especie) ?? null;
  const subspecies = str(row.subespecie) ?? str(row.metadata?.subespecie) ?? null;
  const rubro = detectRubro({
    mediaHint: primaryImage ?? str(row.rubro),
    order,
    family,
    genus,
    scientificName: native?.scientificName ?? name,
  });

  const resolvedColors = native?.colors
    ? [...native.colors]
    : colors.length > 0
      ? colors
      : [];

  const statusLower = (str(row.status) ?? '').toLowerCase();
  const stockFromStatus =
    statusLower.includes('out') || statusLower === 'agotado' || statusLower === '0'
      ? 0
      : statusLower === 'draft' || statusLower === 'pending'
        ? 0
        : 1;

  return {
    id: row.id,
    code:
      native?.catalogCode ??
      row.catalog_code ??
      row.specimen_code ??
      `LEGACY-${row.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
    scientificName: native?.scientificName ?? name,
    commonName:
      native?.commonName ?? str(attrs.common_name) ?? str(row.metadata?.common_name) ?? null,
    order,
    family,
    genus,
    speciesEpithet,
    subspecies,
    regionName:
      native?.regionName ??
      str(regionObj?.region_name) ??
      str(regionObj?.name) ??
      regionText ??
      str(row.metadata?.region) ??
      str(row.localidad) ??
      str(regionObj?.locality) ??
      null,
    regionCode:
      native?.regionCode ??
      regionText ??
      str(regionObj?.region_name) ??
      str(regionObj?.name) ??
      str(regionObj?.country) ??
      null,
    country:
      native?.country ??
      str(row.origen) ??
      str(attrs.country_origin) ??
      (str(regionObj?.country) === 'PE' ? 'Perú' : str(regionObj?.country)) ??
      str(regionObj?.locality),
    sex:
      native?.sex ??
      extractSexBase(row.sexo) ??
      str(row.sexo) ??
      str(attrs.sex) ??
      str(attrs.sex_label) ??
      str(row.attributes?.sex_type) ??
      extractSexBase(row.metadata?.sexo) ??
      null,
    grade:
      native?.grade ??
      str(row.calidad) ??
      str(attrs.grade_code) ??
      str(attrs.quality) ??
      str(row.attributes?.quality) ??
      str(row.metadata?.calidad_db) ??
      null,
    gradeName:
      native ? native.gradeName : str(attrs.grade_name) ?? str(attrs.quality_label) ?? str(row.calidad),
    wingspanMm:
      num(attrs.wingspan_mm) ??
      num(Array.isArray(attrs.size_range_cm) ? attrs.size_range_cm[1] : undefined),
    colors: resolvedColors,
    price:
      native?.price ??
      num(row.precio_menor) ??
      num(row.price_amount) ??
      num(row.pricing?.retail_price) ??
      (typeof row.metadata?.precio === 'number' ? row.metadata.precio : null) ??
      null,
    currency: native?.currency ?? row.currency ?? row.pricing?.currency ?? 'USD',
    stock:
      native?.stock ??
      (typeof row.stock === 'number'
        ? row.stock
        : row.metadata?.out_of_stock === true
          ? 0
          : stockFromStatus),
    images,
    primaryImage,
    secondaryImage:
      ventral?.publicId ?? (native ? MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_VENTRAL_ID : null),
    model3d: model,
    video,
    rubroId: rubro.id,
    rubroLabel: rubro.label ?? str(row.rubro),
    categoria: str(row.categoria),
  };
}

// Texto de búsqueda concatenado para el filtro rápido en cliente.
export function searchHaystack(s: SpecimenView): string {
  return [
    s.scientificName, s.commonName, s.family, s.genus, s.order,
    s.country, s.regionName, s.regionCode, s.code, s.grade, s.sex,
    s.rubroLabel, ...s.colors,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
