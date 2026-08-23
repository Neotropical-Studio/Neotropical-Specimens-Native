import { sql } from '@/lib/db';
import type { MediaRow, SpecimenRow } from './view';
import fallbackRows from '@/data/catalogue-fallback.json';

let initialization: Promise<void> | null = null;

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
  order: ['order', 'orden', 'Orden'],
  category: ['category', 'categoria', 'Categoría (por zona)', 'category_id'],
  region: ['region', 'región', 'Región geográfica', 'region_name', 'region_id'],
  country: ['country', 'pais', 'País', 'origen', 'pais_origen'],
  sex: ['sex', 'sexo'],
  grade: ['grade', 'calidad'],
  price: ['price', 'precio', 'price_amount', 'precio_menor'],
  stock: ['stock', 'cantidad', 'inventory'],
  description: ['description', 'descripcion', 'descripción'],
  media: ['media_url', 'cover_public_id', 'cloudinary_public_id', 'image', 'imagen'],
  video: ['video_public_id', 'video_url'],
  images: ['images', 'imagenes', 'media_assets'],
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

  return {
    id,
    catalog_code: text(raw, aliases.code) ?? undefined,
    species_name: text(raw, aliases.species),
    genero: text(raw, aliases.genus),
    especie: text(raw, ['especie', 'species', 'species_epithet']),
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
}

async function ensureUniversalTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS especimenes (
      id text PRIMARY KEY,
      code text,
      scientific_name text,
      family text,
      category text,
      region text,
      country text,
      price numeric,
      stock integer DEFAULT 0,
      images jsonb DEFAULT '[]'::jsonb,
      description text
    );
  `;
  await sql`ALTER TABLE especimenes ADD COLUMN IF NOT EXISTS code text`;
  await sql`ALTER TABLE especimenes ADD COLUMN IF NOT EXISTS scientific_name text`;
  await sql`ALTER TABLE especimenes ADD COLUMN IF NOT EXISTS family text`;
  await sql`ALTER TABLE especimenes ADD COLUMN IF NOT EXISTS category text`;
  await sql`ALTER TABLE especimenes ADD COLUMN IF NOT EXISTS region text`;
  await sql`ALTER TABLE especimenes ADD COLUMN IF NOT EXISTS country text`;
  await sql`ALTER TABLE especimenes ADD COLUMN IF NOT EXISTS price numeric`;
  await sql`ALTER TABLE especimenes ADD COLUMN IF NOT EXISTS stock integer DEFAULT 0`;
  await sql`ALTER TABLE especimenes ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE especimenes ADD COLUMN IF NOT EXISTS description text`;
}

async function ensureReady(): Promise<void> {
  if (!initialization) {
    initialization = (async () => {
      try {
        await sql`SELECT 1 FROM especimenes LIMIT 1`;
        console.log('[Neon] tabla detectada: especimenes');
        return;
      } catch {
        try {
          await sql`SELECT 1 FROM especies LIMIT 1`;
          console.log('[Neon] tabla detectada: especies');
          return;
        } catch {
          await ensureUniversalTable();
          console.info('[Neon] tabla universal especimenes inicializada');
        }
      }
    })().catch((error) => {
      initialization = null;
      console.error('[Neon] error inicializando catálogo:', error);
      throw error;
    });
  }
  await initialization;
}

async function readPhysicalTable(table: 'especies_clean' | 'especies' | 'especimenes'): Promise<RawRow[]> {
  console.log(`[Neon] consulta catálogo: SELECT to_jsonb(source) AS row FROM ${table}`);
  const rows = table === 'especies_clean'
    ? await sql`SELECT to_jsonb(source) AS row FROM especies_clean AS source`
    : table === 'especies'
      ? await sql`SELECT to_jsonb(source) AS row FROM especies AS source`
      : await sql`SELECT to_jsonb(source) AS row FROM especimenes AS source`;
  return rows.map((item) => item.row as RawRow);
}

function matchesFilter(valueToMatch: string | null | undefined, filter: string | undefined): boolean {
  if (!filter?.trim()) return true;
  return (valueToMatch ?? '').trim().toLowerCase().includes(filter.trim().toLowerCase());
}

export async function loadUniversalCatalogueRows(filters: CatalogueFilters = {}): Promise<{ rows: SpecimenRow[]; source: string; error: string | null }> {
  try {
    await ensureReady();
    let source: 'especies_clean' | 'especies' | 'especimenes' = 'especies_clean';
    let rawRows: RawRow[] = [];
    for (const candidate of ['especies_clean', 'especies', 'especimenes'] as const) {
      try {
        rawRows = await readPhysicalTable(candidate);
        source = candidate;
        console.log(`[Neon] tabla detectada: ${candidate} (${rawRows.length} filas)`);
        if (rawRows.length > 0) break;
      } catch (tableError) {
        console.error(`[Neon] no se pudo leer ${candidate}:`, tableError);
      }
    }
    if (rawRows.length === 0 && source === 'especimenes') {
      await ensureUniversalTable();
      rawRows = await readPhysicalTable('especimenes');
    }
    let rows = rawRows.map(normalizeCatalogueRow);
    rows = rows.filter((row) =>
      matchesFilter(row.region as string | null, filters.region) &&
      matchesFilter(row.categoria, filters.category) &&
      matchesFilter(row.familia, filters.family),
    );
    console.log(`[Neon] ${rows.length} especímenes cargados desde ${source}`);
    if (rows.length === 0) {
      console.error(`[Neon] ${source} no contiene especímenes para los filtros solicitados`);
      const fallback = (fallbackRows as RawRow[]).map(normalizeCatalogueRow).filter((row) =>
        matchesFilter(row.region as string | null, filters.region) &&
        matchesFilter(row.categoria, filters.category) &&
        matchesFilter(row.familia, filters.family),
      );
      if (fallback.length > 0) {
        console.log(`[Neon] usando ${fallback.length} espécimen(es) estático(s) de respaldo`);
        return { rows: fallback, source: 'static-fallback', error: null };
      }
      return { rows: [], source, error: 'Catálogo vacío' };
    }
    return { rows, source, error: null };
  } catch (error) {
    console.error('[Neon] error cargando catálogo universal:', error);
    return { rows: [], source: 'none', error: error instanceof Error ? error.message : 'Error en Neon DB' };
  }
}
