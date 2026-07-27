// ============================================================================
// Vista de espécimen — normaliza filas JSONB de `specimens` a una forma limpia
// consumible por la UI (server y client comparten SELECT + mapper).
// ============================================================================

export const SPECIMEN_SELECT =
  '*, taxonomies:taxonomies!taxonomy_id(*), locations:locations!location_id(*), specimen_media(*)';

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
  primaryImage: string | null;    // WebP dorsal (o el primero disponible)
  secondaryImage: string | null;  // WebP ventral (para hover)
  model3d: string | null;         // public_id del .glb
  video: string | null;           // public_id del video
}

interface RankHierarchy {
  order?: string;
  family?: string;
  subfamily?: string;
  genus?: string;
  species?: string;
  subspecies?: string | null;
}

interface MediaAsset {
  type?: string;
  view?: string;
  cloudinary_id?: string;
}

export interface SpecimenRow {
  id: string;
  catalog_code: string;
  title: string | null;
  description: string | null;
  stock: number;
  price_amount: number | null;
  currency: string | null;
  attributes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  origin_flag_url: string | null;
  origin_banner_url: string | null;
  taxonomies?: { name?: string | null; scientific_name?: string | null; rank?: string | null; slug?: string | null; path?: string | null; metadata?: Record<string, unknown> | null } | null;
  locations?: { name?: string | null; slug?: string | null; country_code?: string | null; latitude?: number | null; longitude?: number | null; altitude_m?: number | null; metadata?: Record<string, unknown> | null } | null;
  specimen_media?: Array<{
    media_type?: string | null;
    storage_path?: string | null;
    cdn_url?: string | null;
    thumbnail_url?: string | null;
    is_primary?: boolean | null;
    sort_order?: number | null;
    is_public?: boolean | null;
    is_active?: boolean | null;
    metadata?: Record<string, unknown> | null;
  }> | null;
  specimen_code?: string;
  pricing?: { retail_price?: number; currency?: string } | null;
  media_assets?: MediaAsset[] | null;
  taxonomy?: { rank_hierarchy: RankHierarchy } | null;
  global_regions?: { name: string; region_name?: string | null } | null;
}

function scientificName(rh: RankHierarchy | undefined, row: SpecimenRow): string {
  if (rh) {
    const sp = rh.species?.startsWith(rh.genus ?? '\0') ? rh.species : [rh.genus, rh.species].filter(Boolean).join(' ');
    return [sp, rh.subspecies].filter(Boolean).join(' ') || rh.genus || '—';
  }
  const taxonomy = row.taxonomies;
  return str(taxonomy?.scientific_name) ?? str(taxonomy?.name) ?? str(row.attributes?.scientific_name) ?? '—';
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function toSpecimenView(row: SpecimenRow): SpecimenView {
  const rh = row.taxonomy?.rank_hierarchy;
  const attrs = row.attributes ?? {};
  const location = row.locations;
  const media = Array.isArray(row.specimen_media) ? row.specimen_media : [];

  const images: MediaImage[] = media
    .filter((m) => m.media_type === 'image' && (m.cdn_url || m.storage_path))
    .map((m) => ({
      view: str((m.metadata as Record<string, unknown> | undefined)?.view) ?? str((m.metadata as Record<string, unknown> | undefined)?.label) ?? 'photo',
      publicId: m.cdn_url ?? m.storage_path ?? '',
    }));

  const model = media.find((m) => m.media_type === 'model' && (m.cdn_url || m.storage_path))?.cdn_url ?? media.find((m) => m.media_type === 'model' && (m.cdn_url || m.storage_path))?.storage_path ?? null;
  const video = media.find((m) => m.media_type === 'video' && (m.cdn_url || m.storage_path))?.cdn_url ?? media.find((m) => m.media_type === 'video' && (m.cdn_url || m.storage_path))?.storage_path ?? null;

  const dorsal = images.find((i) => i.view === 'dorsal') ?? images[0] ?? null;
  const ventral = images.find((i) => i.view === 'ventral') ?? images[1] ?? null;

  const colors = Array.isArray(attrs.primary_colors)
    ? (attrs.primary_colors as unknown[]).filter((c): c is string => typeof c === 'string')
    : Array.isArray(attrs.color_palette)
      ? (attrs.color_palette as unknown[]).filter((c): c is string => typeof c === 'string')
      : [];

  return {
    id: row.id,
    code: row.catalog_code ?? row.specimen_code ?? '—',
    scientificName: scientificName(rh, row),
    commonName: str(attrs.common_name) ?? str(row.metadata?.common_name),
    order: str(rh?.order) ?? str(row.metadata?.order),
    family: str(rh?.family) ?? str(row.metadata?.family),
    genus: str(rh?.genus) ?? str(row.metadata?.genus),
    regionName: str(row.metadata?.region) ?? str(location?.name) ?? row.global_regions?.region_name ?? row.global_regions?.name ?? null,
    regionCode: str((location?.metadata as Record<string, unknown> | undefined)?.region_code) ?? str(location?.country_code) ?? row.global_regions?.region_name ?? row.global_regions?.name ?? null,
    country: str(attrs.country_origin) ?? str((location?.metadata as Record<string, unknown> | undefined)?.country) ?? str(location?.name),
    sex: str(attrs.sex) ?? str(attrs.sex_label) ?? str(row.attributes?.sex_type),
    grade: str(attrs.grade_code) ?? str(attrs.quality) ?? str(row.attributes?.quality),
    gradeName: str(attrs.grade_name) ?? str(attrs.quality_label),
    wingspanMm: num(attrs.wingspan_mm) ?? num(Array.isArray(attrs.size_range_cm) ? attrs.size_range_cm[1] : undefined),
    colors,
    price: num(row.price_amount) ?? num(row.pricing?.retail_price),
    currency: row.currency ?? row.pricing?.currency ?? 'USD',
    stock: typeof row.stock === 'number' ? row.stock : 0,
    images,
    primaryImage: dorsal?.publicId ?? (row.origin_banner_url ?? null),
    secondaryImage: ventral?.publicId ?? null,
    model3d: model,
    video,
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
