// ============================================================================
// Conjunto de idiomas habilitados (i18n escalable a 220+), gobernado desde
// Sanity (siteSettings) — nunca hardcodeado en el repo. Cachéado en memoria
// con TTL para no golpear Sanity en cada request.
// ============================================================================
import 'server-only';
import { sanity } from '@/lib/sanity/client';
import { COUNTRY_TO_PROFILE } from '@/lib/geo/config';
import { langForCountry } from '@/lib/geo/countries';
import { candidatesFor, isCompatible, isStrictVariant } from './variants';

export interface EnabledLocale {
  code: string;              // BCP-47
  label: string;
  dir: 'ltr' | 'rtl';
}

export interface LocaleConfig {
  defaultLocale: string;
  locales: EnabledLocale[];
}

const BCP47 = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

// Fallback si Sanity no está disponible o aún no tiene siteSettings (dev/CI sin
// CMS): la app sigue funcionando en vez de romper. NEXT_PUBLIC_FALLBACK_LOCALES
// permite declarar el set mínimo sin CMS ("es,en,zh-CN,zh-HK,zh-MO,zh-TW,ko,ja")
// para poder probar el enrutado por variante antes de redactar el contenido.
// El CMS, cuando responde, SIEMPRE manda sobre esta lista.
function fallbackConfig(): LocaleConfig {
  const defaultLocale = process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? 'en';
  const declared = (process.env.NEXT_PUBLIC_FALLBACK_LOCALES ?? '')
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c && BCP47.test(c));

  const codes = declared.length ? declared : [defaultLocale];
  return {
    defaultLocale: codes.includes(defaultLocale) ? defaultLocale : codes[0],
    locales: codes.map((code) => ({ code, label: code, dir: dirFor(code) })),
  };
}

// Scripts RTL conocidos (por subetiqueta primaria) para inferir dir cuando el
// editor no lo especifica en Sanity.
const RTL = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ug', 'yi', 'dv', 'ckb']);

export function dirFor(lang: string): 'ltr' | 'rtl' {
  return RTL.has(lang.split('-')[0].toLowerCase()) ? 'rtl' : 'ltr';
}

// Caché en memoria con TTL (por instancia del servidor).
let cache: { at: number; value: LocaleConfig } | null = null;
const TTL_MS = 60_000;

export async function getLocaleConfig(): Promise<LocaleConfig> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.value;

  try {
    const doc = await sanity.fetch<{
      defaultLocale?: string;
      enabledLocales?: Array<{ code?: string; label?: string; dir?: string }>;
    } | null>(
      `*[_type == "siteSettings"][0]{ defaultLocale, enabledLocales }`,
    );

    const locales: EnabledLocale[] = (doc?.enabledLocales ?? [])
      .filter((l) => l.code && BCP47.test(l.code))
      .map((l) => ({
        code: l.code as string,
        label: l.label ?? (l.code as string),
        dir: (l.dir as 'ltr' | 'rtl') ?? dirFor(l.code as string),
      }));

    const value: LocaleConfig = locales.length
      ? { defaultLocale: doc?.defaultLocale && BCP47.test(doc.defaultLocale) ? doc.defaultLocale : locales[0].code, locales }
      : fallbackConfig();

    cache = { at: now, value };
    return value;
  } catch {
    return fallbackConfig();
  }
}

export async function getEnabledLocales(): Promise<string[]> {
  return (await getLocaleConfig()).locales.map((l) => l.code);
}

export interface ResolvedLocale {
  locale: string;             // idioma efectivo (habilitado, o el default)
  dir: 'ltr' | 'rtl';
  isEnabled: boolean;         // false si `lang` no está en el set de Sanity
  defaultLocale: string;
  locales: EnabledLocale[];
}

// Normaliza un idioma de ruta contra el set habilitado. Única fuente de verdad
// para el layout raíz (<html lang/dir>), el layout de /[lang] y getI18n.
export async function resolveLocale(lang: string): Promise<ResolvedLocale> {
  const config = await getLocaleConfig();
  const entry = config.locales.find((l) => l.code === lang);
  const locale = entry ? entry.code : config.defaultLocale;
  return {
    locale,
    dir: entry?.dir ?? dirFor(locale),
    isEnabled: Boolean(entry),
    defaultLocale: config.defaultLocale,
    locales: config.locales,
  };
}

export async function isEnabled(lang: string): Promise<boolean> {
  return (await getEnabledLocales()).includes(lang);
}

// Todos los tags de Accept-Language ordenados por peso q, no sólo el primero:
// "es-PE,es;q=0.9,en;q=0.7" → ['es-PE','es','en']. Permite caer al siguiente
// idioma que SÍ esté habilitado en vez de saltar al default.
function acceptLanguages(accept?: string | null): string[] {
  if (!accept) return [];
  return accept
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.find((p) => p.trim().startsWith('q='));
      const weight = q ? Number.parseFloat(q.trim().slice(2)) : 1;
      return { tag: tag.trim(), q: Number.isFinite(weight) ? weight : 0 };
    })
    .filter((l) => l.tag && l.tag !== '*' && l.q > 0 && BCP47.test(l.tag))
    .sort((a, b) => b.q - a.q)
    .map((l) => l.tag);
}

// Encuentra el idioma habilitado que mejor casa. Recorre las variantes
// aceptables en orden (zh-HK → zh-MO → zh-TW, nunca zh-CN) y sólo para idiomas
// sin variantes estrictas admite la coincidencia laxa por subetiqueta primaria.
function match(candidate: string | null | undefined, enabled: string[]): string | null {
  if (!candidate) return null;

  const byLower = new Map(enabled.map((e) => [e.trim().toLowerCase(), e]));
  for (const variant of candidatesFor(candidate)) {
    const hit = byLower.get(variant);
    if (hit) return hit;
  }

  if (!isStrictVariant(candidate)) {
    return enabled.find((e) => isCompatible(candidate, e)) ?? null;
  }
  return null;
}

// Resuelve el idioma efectivo con precedencia:
// explícito (ruta) → cookie → geo (país) → Accept-Language (por peso) → default.
// Sólo devuelve idiomas HABILITADOS en Sanity: es la contrapartida servidor de
// la heurística barata del middleware.
export async function resolveLang(opts: {
  cookie?: string | null;
  geoCountry?: string | null;
  accept?: string | null;
  explicit?: string | null;
}): Promise<string> {
  const { defaultLocale } = await getLocaleConfig();
  const enabled = await getEnabledLocales();

  const geoLang = opts.geoCountry
    ? langForCountry(opts.geoCountry) ?? COUNTRY_TO_PROFILE[opts.geoCountry.toUpperCase()]
    : null;

  // Cada tag de Accept-Language, en orden de preferencia, hasta dar con uno
  // habilitado (un visitante japonés con 'ja,es;q=0.8' acaba en es, no en el
  // default, si 'ja' no está habilitado pero 'es' sí).
  const fromAccept = acceptLanguages(opts.accept)
    .map((tag) => match(tag, enabled))
    .find(Boolean) ?? null;

  return (
    match(opts.explicit, enabled) ??
    match(opts.cookie, enabled) ??
    match(geoLang, enabled) ??
    fromAccept ??
    defaultLocale
  );
}
