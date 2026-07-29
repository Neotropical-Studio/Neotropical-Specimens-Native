// ============================================================================
// Vista de espécimen — normaliza filas JSONB de `specimens` a una forma limpia
// consumible por la UI (server y client comparten SELECT + mapper).
// ============================================================================
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveCloudinaryPublicId } from '@/lib/cloudinary/url';
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
  /** Rubro del inventario (1 de 4) detectado desde Cloudinary path / taxonomía. */
  rubroId: InventoryRubroId | null;
  rubroLabel: string | null;
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
// de PostgREST. Sin `storage_path`/`cdn_url`/`is_primary`/`metadata`: esos
// campos no existen en la tabla real.
export interface MediaRow {
  id: string;
  specimen_id?: string | null;
  media_type?: string | null;
  media_url?: string | null;
  public_id?: string | null;
  display_order?: number | null;
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

  const { data, error } = await supabase
    .from('specimen_media')
    .select('id, specimen_id, media_type, media_url, public_id, display_order')
    .in('specimen_id', ids)
    .order('display_order', { ascending: true });

  if (error || !data) return byId;

  for (const row of data as MediaRow[]) {
    if (!row.specimen_id) continue;
    const list = byId.get(row.specimen_id) ?? [];
    list.push(row);
    byId.set(row.specimen_id, list);
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
  // Columnas del esquema en vivo (mínimo confirmado):
  species_name?: string | null;
  media_url?: string | null;
  // Columnas opcionales de esquemas ampliados / admin:
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
  region?: RegionRow | null;
  // Poblado aparte por attachMedia() — nunca proviene de un embed de
  // PostgREST, ya que no hay FK entre `specimen_media` y `specimens`.
  specimen_media?: MediaRow[] | null;
  specimen_code?: string;
  pricing?: { retail_price?: number; currency?: string } | null;
  media_assets?: MediaAsset[] | null;
}

function scientificName(row: SpecimenRow): string {
  const t = row.taxonomy;
  const genus = str(t?.genus_name);
  const species = str(t?.species_name) ?? str(row.species_name);
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

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function toSpecimenView(row: SpecimenRow): SpecimenView {
  const attrs = row.attributes ?? {};
  const region = row.region;
  const media = Array.isArray(row.specimen_media) ? row.specimen_media : [];

  // `specimen_media` no tiene columna de ángulo/vista (ni metadata jsonb): el
  // orden real es sólo `display_order`, así que dorsal/ventral se resuelven
  // por posición (primero/segundo), no por etiqueta.
  const images: MediaImage[] = media
    .filter((m) => m.media_type === 'image' && (m.media_url || m.public_id))
    .map((m) => ({
      view: 'photo',
      publicId: asMediaRef(m.public_id) ?? asMediaRef(m.media_url) ?? '',
    }))
    .filter((m) => m.publicId.length > 0);

  const modelRow = media.find((m) => m.media_type === 'model' && (m.media_url || m.public_id));
  const videoRow = media.find((m) => m.media_type === 'video' && (m.media_url || m.public_id));
  const model = modelRow
    ? asMediaRef(modelRow.public_id) ?? asMediaRef(modelRow.media_url)
    : null;
  const video = videoRow
    ? asMediaRef(videoRow.public_id) ?? asMediaRef(videoRow.media_url)
    : null;

  const dorsal = images[0] ?? null;
  const ventral = images[1] ?? null;

  // Fuente de imagen: 1) specimen_media, 2) columna live `media_url`
  // (Cloudinary URL o public_id → siempre normalizado a public_id), 3) banner.
  const primaryImage =
    dorsal?.publicId ??
    asMediaRef(row.media_url) ??
    asMediaRef(row.origin_banner_url) ??
    null;

  const colors = Array.isArray(attrs.primary_colors)
    ? (attrs.primary_colors as unknown[]).filter((c): c is string => typeof c === 'string')
    : Array.isArray(attrs.color_palette)
      ? (attrs.color_palette as unknown[]).filter((c): c is string => typeof c === 'string')
      : [];

  const name = scientificName(row);
  // Inventario 100 % desde catálogo BD (taxonomía, origen, sexo, calidad, stock…).
  const order = str(row.taxonomy?.order_name) ?? str(row.metadata?.order) ?? null;
  const family = str(row.taxonomy?.family_name) ?? str(row.metadata?.family) ?? null;
  const genus = str(row.taxonomy?.genus_name) ?? str(row.metadata?.genus) ?? null;
  const rubro = detectRubro({
    mediaHint: primaryImage,
    order,
    family,
    genus,
    scientificName: name,
  });

  return {
    id: row.id,
    code: row.catalog_code ?? row.specimen_code ?? '—',
    scientificName: name,
    commonName: str(attrs.common_name) ?? str(row.metadata?.common_name) ?? null,
    order,
    family,
    genus,
    regionName:
      str(region?.locality) ??
      str(row.metadata?.region) ??
      str(region?.region_name) ??
      str(region?.name) ??
      null,
    regionCode: str(region?.country) ?? null,
    country:
      str(attrs.country_origin) ??
      (str(region?.country) === 'PE' ? 'Perú' : str(region?.country)) ??
      str(region?.locality),
    sex: str(attrs.sex) ?? str(attrs.sex_label) ?? str(row.attributes?.sex_type) ?? null,
    grade: str(attrs.grade_code) ?? str(attrs.quality) ?? str(row.attributes?.quality) ?? null,
    gradeName: str(attrs.grade_name) ?? str(attrs.quality_label),
    wingspanMm:
      num(attrs.wingspan_mm) ??
      num(Array.isArray(attrs.size_range_cm) ? attrs.size_range_cm[1] : undefined),
    colors,
    price: num(row.price_amount) ?? num(row.pricing?.retail_price),
    currency: row.currency ?? row.pricing?.currency ?? 'USD',
    stock: typeof row.stock === 'number' ? row.stock : 0,
    images,
    primaryImage,
    secondaryImage: ventral?.publicId ?? null,
    model3d: model,
    video,
    rubroId: rubro.id,
    rubroLabel: rubro.label,
  };
}

// Texto de búsqueda concatenado para el filtro rápido en cliente.
export function searchHaystack(s: SpecimenView): string {
  return [
    s.scientificName, s.commonName, s.family, s.genus, s.order,
    s.country, s.regionName, s.regionCode, s.code, s.grade, ...s.colors,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
