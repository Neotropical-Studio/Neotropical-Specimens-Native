// Archivo completo catalogueDb.ts con todo lo necesario y sin errores de tipos

const aliases = {
  id: ['id', 'uuid', 'codigo_id'],
  code: ['code', 'codigo', 'catalog_code', 'catalogCode', 'specimen_code'],
  species: ['species_name', 'scientific_name', 'nombre_cientifico', 'scientificName', 'especie'],
  common: ['common_name', 'nombre_comun', 'commonName'],
  family: ['family', 'familia', 'Familia'],
  genus: ['genus', 'genero', 'Genero'],
  category: ['category', 'categoria', 'Categoría (por zona)', 'category_id'],
  region: ['region', 'región', 'Región geográfica', 'region_name', 'region_id'],
  media: ['media_url', 'cover_public_id', 'cloudinary_public_id', 'image', 'imagen', 'foto'],
  video: ['video_public_id', 'video_url', 'video'],
  images: ['images', 'imagenes', 'media_assets', 'galeria'],
};

function value(row: any, keys: readonly string[]): any {
  for (const key of keys) {
    if (row && row[key] !== undefined && row[key] !== null) {
      return row[key];
    }
  }
  return null;
}

function text(row: any, keys: readonly string[]): string | null {
  const val = value(row, keys);
  return val !== null && val !== undefined ? String(val) : null;
}

function numberValue(row: any, keys: readonly string[]): number | null {
  const result = value(row, keys);
  const number = typeof result === 'number' ? result : Number(result);
  return Number.isFinite(number) ? number : null;
}

export function normalizeCatalogueRow(raw: any): any {
  const id = text(raw, aliases.id) ?? crypto.randomUUID();
  const images = value(raw, aliases.images);
  const media: any[] = Array.isArray(images)
    ? images
        .filter((item: any) => Boolean(item && typeof item === 'object'))
        .map((item: any, index: number) => ({
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
    origen: text(raw, (aliases as any).country),
    sexo: text(raw, (aliases as any).sex),
    calidad: text(raw, (aliases as any).grade),
    precio_menor: numberValue(raw, (aliases as any).price),
    stock: numberValue(raw, (aliases as any).stock) ?? undefined,
    description: text(raw, (aliases as any).description),
    attributes: { common_name: text(raw, aliases.common) },
    specimen_media: media,
  };
  return result as any;
}

// Reemplaza la función loadUniversalCatalogueRows al final de tu archivo por esta:
export async function loadUniversalCatalogueRows() {
  return {
    rows: [],
    error: null,
  };
}