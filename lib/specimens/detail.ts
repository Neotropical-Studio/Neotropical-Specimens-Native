// ============================================================================
// Vista de detalle de espécimen (página /[lang]/product/[id]). Extiende la
// vista base con los campos que necesita la ficha: subfamilia, GPS, las cuatro
// tomas (dorsal/ventral/lateral/macro), precio mayorista y contenido localizado.
// Todo proviene de JSONB — sin literales de negocio en el código.
// ============================================================================
import { createClient } from '@supabase/supabase-js';
import {
  SPECIMEN_SELECT,
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
  const rh = row.taxonomy?.rank_hierarchy;
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

  return {
    ...base,
    commonName: localize('common_name') ?? base.commonName,
    subfamily: str(rh?.subfamily),
    gpsCoordinates: str(attrs.gps_coordinates) ?? str(attrs.gps),
    description: localize('description'),
    wholesalePrice: num((pricing as Record<string, unknown>).wholesale_price),
    wholesaleMinQty: num((pricing as Record<string, unknown>).wholesale_min_qty),
    views,
    themeOverride:
      (attrs.theme as Record<string, unknown>) ??
      (attrs.themeConfig as Record<string, unknown>) ??
      null,
  };
}

// Carga un espécimen por id (lectura pública anon; RLS permite select).
export async function getSpecimenById(id: string, lang: string): Promise<SpecimenDetailView | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !key) return null;

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from('specimens')
    .select(SPECIMEN_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return toSpecimenDetail(data as SpecimenRow, lang);
}
