// ============================================================================
// Punto de entrada i18n (server). Combina:
//   1) idiomas habilitados en Sanity (locales.ts)
//   2) cadenas de UI autorizadas en Sanity (strings.ts)
//   3) fallback de traducción automática con caché (translate.ts)
// Devuelve un mapa de cadenas SERIALIZABLE listo para pasar a componentes
// cliente, más un helper t(). Sin diccionarios estáticos locales.
// ============================================================================
import 'server-only';
import { resolveLocale, type EnabledLocale } from './locales';
import { getRawUiStrings, pickValue } from './strings';
import { translate } from './translate';
import { isCompatible } from './variants';

export interface I18n {
  locale: string;            // idioma efectivo (habilitado o default)
  dir: 'ltr' | 'rtl';
  isEnabled: boolean;        // false si el idioma pedido no está habilitado
  defaultLocale: string;
  enabledLocales: EnabledLocale[];
  strings: Record<string, string>;   // { 'product.add_to_cart': 'Añadir…' }
  t: (key: string, fallback?: string) => string;
}

// Caché del mapa YA resuelto, por idioma. Sin esto cada request re-resolvería
// (y con MT activa, re-consultaría la caché de traducción cadena a cadena).
const resolvedCache = new Map<string, { at: number; value: Record<string, string> }>();
const TTL_MS = 60_000;

export function clearI18nCache(): void {
  resolvedCache.clear();
}

async function resolveStrings(locale: string, source: string): Promise<Record<string, string>> {
  const now = Date.now();
  const hit = resolvedCache.get(locale);
  if (hit && now - hit.at < TTL_MS) return hit.value;

  const rows = await getRawUiStrings();

  // Resolvemos cada clave: valor autorizado → (si falta) traducción automática
  // del texto fuente. Traducimos las faltantes en paralelo (con caché).
  const resolved = await Promise.all(
    rows.map(async (row) => {
      const authored = pickValue(row, locale);
      if (authored) return [row.key, authored] as const;
      // Sólo se sirve el texto fuente tal cual si el destino es EQUIVALENTE al
      // idioma fuente (isCompatible respeta la barrera simplificado/tradicional:
      // con fuente zh-CN y destino zh-TW hay que traducir, no reutilizar).
      if (isCompatible(locale, source) || !row.sourceText) {
        return [row.key, row.sourceText] as const;
      }
      const mt = await translate(row.sourceText, locale, source);
      return [row.key, mt] as const;
    }),
  );

  const value: Record<string, string> = Object.fromEntries(resolved);
  resolvedCache.set(locale, { at: now, value });
  return value;
}

export async function getI18n(lang: string): Promise<I18n> {
  const { locale, dir, isEnabled, defaultLocale, locales } = await resolveLocale(lang);
  const strings = await resolveStrings(locale, defaultLocale);

  return {
    locale,
    dir,
    isEnabled,
    defaultLocale,
    enabledLocales: locales,
    strings,
    t: (key, fallback) => strings[key] ?? fallback ?? key,
  };
}

// Helper puro para componentes cliente que reciben el mapa `strings` por props.
export function tFrom(strings: Record<string, string>, key: string, fallback?: string): string {
  return strings[key] ?? fallback ?? key;
}
