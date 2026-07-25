/* =============================================================================
 * Semilla i18n para Sanity — crea el singleton `siteSettings` (conjunto de
 * idiomas habilitados) y los documentos `uiString` con las claves que consume la
 * app. Sin esto, `enabledLocales` está vacío: la app cae al idioma por defecto
 * y la detección geo no tiene entre qué elegir, por muchos países que resuelva.
 *
 * Uso:  node sanity/seed/i18n.mjs            (idempotente: createOrReplace)
 *       node sanity/seed/i18n.mjs --dry-run  (muestra qué haría, sin escribir)
 *
 * Lee la configuración de .env.local. Requiere SANITY_API_TOKEN con permiso de
 * escritura (Editor). Los textos fuente están en español porque es el idioma en
 * el que está redactada la UI; el resto de idiomas se rellenan en el Studio o
 * los completa la traducción automática (lib/i18n/translate.ts).
 * ========================================================================== */
import { readFileSync } from 'node:fs';
import { createClient } from '@sanity/client';

// --- Config desde .env.local -------------------------------------------------
function loadEnv(file = '.env.local') {
  try {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    // Sin .env.local: se usan las variables ya presentes en el entorno.
  }
}
loadEnv();

const DRY_RUN = process.argv.includes('--dry-run');
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const token = process.env.SANITY_API_TOKEN;

if (!projectId) throw new Error('Falta NEXT_PUBLIC_SANITY_PROJECT_ID');
if (!token && !DRY_RUN) throw new Error('Falta SANITY_API_TOKEN (con permiso de escritura)');

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: process.env.SANITY_API_VERSION || '2025-01-01',
  useCdn: false,
});

// --- Idiomas habilitados -----------------------------------------------------
// Punto de partida deliberadamente corto: añadir idiomas es cosa del Studio, no
// del repo. Los `dir` los infiere la app si se omiten.
// Los cinco mercados asiáticos van como variantes INDEPENDIENTES: cada código
// es un documento de traducción propio, nunca un alias de otro. zh-HK/zh-MO no
// heredan de zh-TW y ninguno hereda de zh-CN (simplificado ≠ tradicional).
const LOCALES = [
  { code: 'es', label: 'Español', dir: 'ltr' },
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'pt', label: 'Português', dir: 'ltr' },
  { code: 'fr', label: 'Français', dir: 'ltr' },
  { code: 'de', label: 'Deutsch', dir: 'ltr' },
  { code: 'it', label: 'Italiano', dir: 'ltr' },
  { code: 'ja', label: '日本語', dir: 'ltr' },              // Japón
  { code: 'ko', label: '한국어', dir: 'ltr' },              // Corea del Sur
  { code: 'zh-CN', label: '简体中文（中国大陆）', dir: 'ltr' },  // RPC · simplificado
  { code: 'zh-HK', label: '繁體中文（香港）', dir: 'ltr' },     // Hong Kong · tradicional
  { code: 'zh-MO', label: '繁體中文（澳門）', dir: 'ltr' },     // Macao · tradicional
  { code: 'zh-TW', label: '繁體中文（台灣）', dir: 'ltr' },     // Taiwán · tradicional
  { code: 'ru', label: 'Русский', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
];

// --- Claves de UI ------------------------------------------------------------
// Deben coincidir con las que piden los componentes (el fallback textual de cada
// componente es este mismo texto, así que la UI no cambia al sembrar).
const STRINGS = {
  'nav.catalog': 'Catálogo',
  'nav.regions': 'Regiones',
  'nav.wholesale': 'Mayorista',
  'nav.contact': 'Contacto',
  'nav.explore': 'Explorar',
  'nav.language': 'Idioma',
  'nav.menu': 'Menú',

  'hero.badge': 'Catálogo dinámico en tiempo real',
  'hero.title_before': 'Especímenes',
  'hero.title_highlight': 'neotropicales',
  'hero.title_after': 'de colección',
  'hero.subtitle':
    'Lepidópteros y artrópodos de la selva sudamericana, documentados con fotografía WebP de alta fidelidad y modelos 3D interactivos. Inventario vivo, sincronizado al instante.',
  'hero.cta_explore': 'Explorar el catálogo',
  'hero.cta_wholesale': 'Precios mayoristas',
  'hero.stat_specimens': 'Especímenes',
  'hero.stat_families': 'Familias',
  'hero.stat_regions': 'Regiones',
  'hero.stat_countries': 'Países de origen',

  'search.placeholder': 'Busca por especie, familia, país, color…',
  'search.clear': 'Limpiar búsqueda',
  'search.count': '{shown} de {total}',
  'filter.all': 'Todas',
  'status.live': 'en vivo',
  'catalog.empty': 'Aún no hay especímenes sincronizados.',
  'catalog.no_results': 'Ningún espécimen coincide con tu búsqueda.',
  'system.inventory_error': 'No se pudo cargar el inventario en vivo',

  'taxon.unknown': 'taxón',
  'sex.male': '♂ Macho',
  'sex.female': '♀ Hembra',
  'sex.pair': 'Pareja',
  'sex.ex_pupa': 'Ex-pupa',
  'sex.set': 'Set',
  'price.on_request': 'Consultar',
  'stock.available': '{count} en stock',
  'stock.sold_out': 'Agotado',

  'media.no_image': 'Sin imagen',
  'media.view_3d': '3D',
  'media.view_3d_full': 'Ver modelo 3D',
  'media.view_video': 'Ver video 360°',
  'media.model_3d_caption': 'Modelo 3D interactivo',
  'media.video_caption': 'Video 360°',
  'media.dorsal': 'Dorsal',
  'media.ventral': 'Ventral',
  'media.lateral': 'Lateral',
  'media.macro': 'Macro',
  'action.close': 'Cerrar',
};

// `key` es un identificador estable → _id determinista para que re-sembrar
// actualice el mismo documento en vez de duplicarlo.
const idFor = (key) => `uiString.${key.replace(/[^a-z0-9]/gi, '_')}`;

const docs = [
  {
    _id: 'siteSettings',
    _type: 'siteSettings',
    title: 'Neotropical Specimens Native',
    defaultLocale: 'es',
    enabledLocales: LOCALES.map((l, i) => ({ _key: `loc${i}`, ...l })),
  },
  ...Object.entries(STRINGS).map(([key, sourceText]) => ({
    _id: idFor(key),
    _type: 'uiString',
    key,
    sourceText,
    values: [],
  })),
];

if (DRY_RUN) {
  console.log(`[dry-run] ${dataset}@${projectId}: ${docs.length} documentos`);
  console.log(`[dry-run] idiomas: ${LOCALES.map((l) => l.code).join(', ')}`);
  console.log(`[dry-run] claves de UI: ${Object.keys(STRINGS).length}`);
  process.exit(0);
}

// Una sola transacción: o entra toda la semilla o no entra nada.
const tx = docs.reduce((t, doc) => t.createOrReplace(doc), client.transaction());
await tx.commit();

console.log(`✓ Sembrado en ${dataset}@${projectId}`);
console.log(`  · siteSettings con ${LOCALES.length} idiomas (default: es)`);
console.log(`  · ${Object.keys(STRINGS).length} documentos uiString`);
console.log('  Las traducciones se rellenan en el Studio; lo que falte lo cubre la MT.');
