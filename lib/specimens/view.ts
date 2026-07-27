// ============================================================================
// Vista de espécimen — normaliza filas JSONB de `specimens` a una forma limpia
// consumible por la UI (server y client comparten SELECT + mapper).
// ============================================================================

export const SPECIMEN_SELECT =
  '*, taxonomy(rank_hierarchy), global_regions(name, region_name)';

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
  specimen_code: string;
  stock: number;
  pricing: { retail_price?: number; currency?: string } | null;
  attributes: Record<string, unknown> | null;
  media_assets: MediaAsset[] | null;
  taxonomy: { rank_hierarchy: RankHierarchy } | null;
  global_regions: { name: string; region_name?: string | null } | null;
}

function scientificName(rh: RankHierarchy | undefined): string {
  if (!rh) return '—';
  const sp = rh.species?.startsWith(rh.genus ?? '\0') ? rh.species : [rh.genus, rh.species].filter(Boolean).join(' ');
  return [sp, rh.subspecies].filter(Boolean).join(' ') || rh.genus || '—';
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
  const media = Array.isArray(row.media_assets) ? row.media_assets : [];

  const images: MediaImage[] = media
    .filter((m) => m.type === 'photo_webp' && m.cloudinary_id)
    .map((m) => ({ view: m.view ?? 'foto', publicId: m.cloudinary_id! }));

  const model = media.find((m) => m.type === 'model_3d_glb' && m.cloudinary_id)?.cloudinary_id ?? null;
  const video = media.find((m) => m.type === 'video_mp4' && m.cloudinary_id)?.cloudinary_id ?? null;

  const dorsal = images.find((i) => i.view === 'dorsal') ?? images[0] ?? null;
  const ventral = images.find((i) => i.view === 'ventral') ?? images[1] ?? null;

  const colors = Array.isArray(attrs.primary_colors)
    ? (attrs.primary_colors as unknown[]).filter((c): c is string => typeof c === 'string')
    : [];

  return {
    id: row.id,
    code: row.specimen_code,
    scientificName: scientificName(rh),
    commonName: str(attrs.common_name),
    order: str(rh?.order),
    family: str(rh?.family),
    genus: str(rh?.genus),
    regionName: row.global_regions?.region_name ?? row.global_regions?.name ?? null,
    regionCode: row.global_regions?.region_name ?? row.global_regions?.name ?? null,
    country: str(attrs.country_origin),
    sex: str(attrs.sex),
    grade: str(attrs.grade_code),
    gradeName: str(attrs.grade_name),
    wingspanMm: num(attrs.wingspan_mm),
    colors,
    price: num(row.pricing?.retail_price),
    currency: row.pricing?.currency ?? 'USD',
    stock: typeof row.stock === 'number' ? row.stock : 0,
    images,
    primaryImage: dorsal?.publicId ?? null,
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
