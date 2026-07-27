// ============================================================================
// Cadenas de UI desde Sanity (documentos uiString). Devuelve la forma cruda
// (clave + fuente + valor por locale) para que index.ts resuelva el idioma y
// aplique el fallback de traducción automática.
// ============================================================================
import 'server-only';
import { candidatesFor, isCompatible, isStrictVariant } from './variants';

export interface RawUiString {
  key: string;
  sourceText: string;
  values: Array<{ locale: string; text: string }>;
}

// Caché en memoria con TTL por instancia.
let cache: { at: number; value: RawUiString[] } | null = null;
const TTL_MS = 60_000;

export async function getRawUiStrings(): Promise<RawUiString[]> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.value;

  try {
    const value: RawUiString[] = [];
    cache = { at: now, value };
    return value;
  } catch {
    return []; // sin CMS: la UI usará los fallbacks textuales de cada componente
  }
}

// Extrae el valor autorizado para un locale, recorriendo sus variantes ACEPTABLES
// en orden (ver lib/i18n/variants.ts). Nunca sirve simplificado a un locale
// tradicional ni al contrario: antes se deja sin valor (y lo cubre la MT) que
// devolver la localización equivocada.
export function pickValue(row: RawUiString, lang: string): string | null {
  const authored = row.values.filter((v) => v.locale && v.text?.trim());

  for (const candidate of candidatesFor(lang)) {
    const hit = authored.find((v) => v.locale.trim().toLowerCase() === candidate);
    if (hit) return hit.text;
  }

  // Último intento sólo para idiomas sin variantes estrictas: cualquier valor
  // compatible por subetiqueta primaria (es-419 sirve a es-PE, por ejemplo).
  if (!isStrictVariant(lang)) {
    const near = authored.find((v) => isCompatible(lang, v.locale));
    if (near) return near.text;
  }

  return null;
}
