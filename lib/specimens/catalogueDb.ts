import { sql } from '@/lib/db';
import type { MediaRow, SpecimenRow } from './view';

type RawRow = Record<string, unknown>;

export interface CatalogueFilters {
  region?: string;
  category?: string;
  family?: string;
}

const aliases = {
  id: ['id', 'uuid', 'codigo_id'],
  code: ['code', 'codigo', 'catalog_code', 'catalogCode', 'specimen_code'],
  species: ['species_name', 'scientific_name', 'nombre_cientifico', 'scientificName', 'especie'],
  common: ['common_name', 'nombre_comun', 'commonName'],
  family: ['family', 'familia', 'Familia'],
  genus: ['genus', 'genero', 'Genero'],
  category: ['category', 'categoria', 'Categoría (por zona)', 'category_id'],
  region: ['region', 'región', 'Región geográfica', 'region_name', 'region_id'],
  // Asegúrate de que aquí estén incluidos los nombres reales de tus columnas de imágenes y videos:
  media: ['media_url', 'cover_public_id', 'cloudinary_public_id', 'image', 'imagen', 'foto'],
  video: ['video_public_id', 'video_url', 'video'],
  images: ['images', 'imagenes', 'media_assets', 'galeria'],
} as const;

function value(row: RawRow, keys: readonly string[]): unknown {
  const entries = Object.entries(row);
  for (const key of keys) {
    const exact = row[key];
    if (exact !== undefined && exact !== null && exact !== '') return exact;
    const found = entries.find(([name]) => name.toLowerCase() === key.toLowerCase());
    if (found?.[1] !== undefined && found[1] !== null && found[1] !== '') return found[1];
  }
  return null;
}

function text(row: RawRow, keys: readonly string[]): string | null {
  const result = value(row, keys);
  return typeof result === 'string' && result.trim() ? result.trim() : result == null ? null : String(result);
}

function numberValue(row: RawRow, keys: readonly string[]): number | null {
  const result = value(row, keys);
  const number = typeof result === 'number' ? result : Number(result);
  return Number.isFinite(number) ? number : null;
}

export function normalizeCatalogueRow(raw: RawRow): SpecimenRow {
  const id = text(raw, aliases.id) ?? crypto.randomUUID();
  const images = value(raw, aliases.images);
  const media: MediaRow[] = Array.isArray(images)
    ? images
        .filter((item): item is RawRow => Boolean(item && typeof item === 'object'))
        .map((item, index) => ({
          id: text(item, ['id']) ?? `${id}-media-${index}`,
          specimen_id: id,
          media_type: text(item, ['media_type', 'type']) ?? 'image',
          media_url: text(item, ['media_url', 'url', 'src']),
          public_id: text(item, ['public_id', 'publicId']),
          display_order: numberValue(item, ['display_order', 'order']) ?? index,
          view: text(item, ['view', 'angle']),
        }))
    : [];
  const mediaRef = text(raw, aliases.media);
  const videoRef = text(raw, aliases.video);
  if (mediaRef) media.unshift({ id: `${id}-cover`, specimen_id: id, media_type: 'image', media_url: mediaRef, public_id: null, display_order: 0 });
  if (videoRef) media.push({ id: `${id}-video`, specimen_id: id, media_type: 'video', media_url: videoRef, public_id: null, display_order: media.length });

  const result: any = {
    id,
    catalog_code: text(raw, aliases.code) ?? undefined,
    species_name: text(raw, aliases.species),
    genero: text(raw, aliases.genus),
    especies: text(raw, ['especies', 'species', 'species_epithet']),
    familia: text(raw, aliases.family),
    rubro: text(raw, ['rubro', 'Rubro', 'rubro_id']),
    categoria: text(raw, aliases.category),
    region: text(raw, aliases.region),
    origen: text(raw, aliases.country),
    sexo: text(raw, aliases.sex),
    calidad: text(raw, aliases.grade),
    precio_menor: numberValue(raw, aliases.price),
    stock: numberValue(raw, aliases.stock) ?? undefined,
    description: text(raw, aliases.description),
    attributes: { common_name: text(raw, aliases.common) },
    specimen_media: media,
  };
  return result as any;
}

async function readCatalogueTable(filters: CatalogueFilters): Promise<RawRow[]> {
  const family = filters.family?.trim().toLowerCase() || '';
  const category = filters.category?.trim().toLowerCase() || '';
  const region = filters.region?.trim().toLowerCase() || '';

  console.log('[Neon] consulta catálogo con filtros flexibles:', { family, category, region });

  // Si no hay ningún filtro estricto, devolvemos los primeros 500 registros para poblar el catálogo general
  if (!family && !category && !region) {
  const rows = await sql`
    SELECT to_jsonb(source) AS row
    FROM especies AS source
    LIMIT 2000;
  `;
  return rows.map((item) => item.row as RawRow);
}

  // Si hay filtros, hacemos una búsqueda parcial segura
  const rows = await sql`
    SELECT to_jsonb(source) AS row
    FROM especies AS source
    WHERE 
      (${family} = '' OR LOWER(COALESCE(to_jsonb(source)->>'family', to_jsonb(source)->>'familia', '')) LIKE ${'%' + family + '%'})
      AND (${category} = '' OR LOWER(COALESCE(to_jsonb(source)->>'category', to_jsonb(source)->>'categoria', '')) LIKE ${'%' + category + '%'})
      AND (${region} = '' OR LOWER(COALESCE(to_jsonb(source)->>'region', to_jsonb(source)->>'región', '')) LIKE ${'%' + region + '%'})
    LIMIT 2000;
  `;
  return rows.map((item) => item.row as RawRow);
}

export async function loadUniversalCatalogueRows(filters: CatalogueFilters = {}): Promise<{ rows: SpecimenRow[]; source: string; error: string | null }> {
  try {
    const rawRows = await readCatalogueTable(filters);
    const rows = rawRows.map(normalizeCatalogueRow);
    console.log(`[Neon] ${rows.length} especímenes cargados desde especies`);
    if (rows.length === 0) {
      console.error('[Neon] especies no contiene especímenes para los filtros solicitados');
      return { rows: [], source: 'especies', error: 'Catálogo vacío' };
    }
    return { rows, source: 'especies', error: null };
  } catch (error) {
    console.error('[Neon] error cargando catálogo universal:', error);
    return { rows: [], source: 'none', error: error instanceof Error ? error.message : 'Error en Neon DB' };
  }
}
