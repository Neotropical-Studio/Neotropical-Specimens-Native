// ============================================================================
// Diccionarios UI i18n con fallback camaleónico (en-US por defecto).
// Los ficheros viven en /messages/<locale>.json.
// ============================================================================
import 'server-only';

export const DEFAULT_LOCALE = 'en-US';

export interface Dictionary {
  locale: string;
  region: string;
  currency: string;
  tax_status: string;
  ui: {
    nav: Record<string, string>;
    product: Record<string, string>;
    badges: Record<string, string>;
    system: Record<string, string>;
  };
  database_sync: {
    language_code: string;
    fallback_code: string;
  };
}

// Carga perezosa por locale (code-splitting de los JSON de mensajes).
const loaders: Record<string, () => Promise<{ default: Dictionary }>> = {
  'zh-CN': () => import('@/messages/zh-CN.json'),
  'en-US': () => import('@/messages/en-US.json'),
};

// Alias de variantes → locale disponible más cercano.
const ALIASES: Record<string, string> = {
  zh: 'zh-CN',
  'zh-HK': 'zh-CN',
  'zh-TW': 'zh-CN',
  'zh-MO': 'zh-CN',
  en: 'en-US',
};

export function normalizeLocale(input?: string | null): string {
  if (!input) return DEFAULT_LOCALE;
  if (loaders[input]) return input;
  if (ALIASES[input]) return ALIASES[input];
  const base = input.split('-')[0];
  return ALIASES[base] ?? (loaders[base] ? base : DEFAULT_LOCALE);
}

export async function getDictionary(locale?: string | null): Promise<Dictionary> {
  const resolved = normalizeLocale(locale);
  try {
    const mod = await (loaders[resolved] ?? loaders[DEFAULT_LOCALE])();
    return mod.default;
  } catch {
    return (await loaders[DEFAULT_LOCALE]()).default;
  }
}

// Acceso seguro a claves anidadas con fallback textual.
export function t(dict: Dictionary, path: string, fallback = ''): string {
  return (
    path.split('.').reduce<unknown>((acc, key) => {
      if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, dict) as string
  ) ?? fallback;
}
