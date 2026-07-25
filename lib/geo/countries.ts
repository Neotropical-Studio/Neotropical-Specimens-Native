// ============================================================================
// País ISO-3166-1 alpha-2 → idioma BCP-47 más probable del visitante.
// Fuente ÚNICA del mapeo geo→idioma: la consumen el middleware (redirección en
// el borde) y lib/i18n/locales.ts (negociación contra el set de Sanity).
//
// Es una HEURÍSTICA de arranque, no una verdad: en países plurilingües elige la
// lengua de mayor alcance. Siempre la pisan, por este orden, la cookie
// NEXT_LOCALE (elección explícita) y Accept-Language del navegador; y el idioma
// resultante se normaliza contra los idiomas habilitados en Sanity, así que un
// código que no esté habilitado nunca llega a la URL.
//
// Sin dependencias: debe poder importarse desde el runtime edge.
// ============================================================================

export const COUNTRY_TO_LANG: Record<string, string> = {
  // --- América del Norte, Central y Caribe ----------------------------------
  US: 'en', CA: 'en', MX: 'es', GT: 'es', BZ: 'en', SV: 'es', HN: 'es',
  NI: 'es', CR: 'es', PA: 'es', CU: 'es', DO: 'es', HT: 'fr', JM: 'en',
  TT: 'en', BB: 'en', BS: 'en', PR: 'es', VI: 'en', KY: 'en', BM: 'en',
  AG: 'en', DM: 'en', GD: 'en', KN: 'en', LC: 'en', VC: 'en', AI: 'en',
  AW: 'nl', CW: 'nl', SX: 'nl', BQ: 'nl', MS: 'en', TC: 'en', VG: 'en',
  GP: 'fr', MQ: 'fr', BL: 'fr', MF: 'fr', PM: 'fr', GL: 'kl',

  // --- América del Sur (mercado nuclear del catálogo neotropical) -----------
  BR: 'pt', AR: 'es', CL: 'es', CO: 'es', PE: 'es', VE: 'es', EC: 'es',
  BO: 'es', PY: 'es', UY: 'es', GY: 'en', SR: 'nl', GF: 'fr', FK: 'en',

  // --- Europa ---------------------------------------------------------------
  ES: 'es', PT: 'pt', FR: 'fr', DE: 'de', AT: 'de', CH: 'de', IT: 'it',
  GB: 'en', IE: 'en', NL: 'nl', BE: 'nl', LU: 'fr', DK: 'da', SE: 'sv',
  NO: 'nb', FI: 'fi', IS: 'is', EE: 'et', LV: 'lv', LT: 'lt', PL: 'pl',
  CZ: 'cs', SK: 'sk', HU: 'hu', RO: 'ro', BG: 'bg', GR: 'el', HR: 'hr',
  SI: 'sl', RS: 'sr', BA: 'bs', ME: 'sr', MK: 'mk', AL: 'sq', MD: 'ro',
  UA: 'uk', BY: 'be', RU: 'ru', TR: 'tr', CY: 'el', MT: 'mt', LI: 'de',
  MC: 'fr', AD: 'ca', SM: 'it', VA: 'it', GI: 'en', FO: 'fo', AX: 'sv',
  GG: 'en', JE: 'en', IM: 'en', SJ: 'nb', XK: 'sq',

  // --- Asia -----------------------------------------------------------------
  CN: 'zh-CN', TW: 'zh-TW', HK: 'zh-HK', MO: 'zh-MO', JP: 'ja', KR: 'ko',
  KP: 'ko', MN: 'mn', IN: 'hi', PK: 'ur', BD: 'bn', LK: 'si', NP: 'ne',
  BT: 'dz', MV: 'dv', AF: 'fa', IR: 'fa', IQ: 'ar', SY: 'ar', LB: 'ar',
  JO: 'ar', IL: 'he', PS: 'ar', SA: 'ar', AE: 'ar', QA: 'ar', BH: 'ar',
  KW: 'ar', OM: 'ar', YE: 'ar', GE: 'ka', AM: 'hy', AZ: 'az', KZ: 'kk',
  KG: 'ky', UZ: 'uz', TJ: 'tg', TM: 'tk', TH: 'th', VN: 'vi', KH: 'km',
  LA: 'lo', MM: 'my', MY: 'ms', SG: 'en', ID: 'id', PH: 'fil', BN: 'ms',
  TL: 'pt',

  // --- África ---------------------------------------------------------------
  EG: 'ar', LY: 'ar', TN: 'ar', DZ: 'ar', MA: 'ar', SD: 'ar', SS: 'en',
  MR: 'ar', EH: 'ar', ET: 'am', ER: 'ti', DJ: 'ar', SO: 'so', KE: 'sw',
  TZ: 'sw', UG: 'en', RW: 'rw', BI: 'rn', CD: 'fr', CG: 'fr', CF: 'fr',
  CM: 'fr', GA: 'fr', GQ: 'es', TD: 'ar', NE: 'fr', ML: 'fr', BF: 'fr',
  SN: 'fr', GN: 'fr', CI: 'fr', TG: 'fr', BJ: 'fr', GW: 'pt', CV: 'pt',
  ST: 'pt', AO: 'pt', MZ: 'pt', GM: 'en', SL: 'en', LR: 'en', GH: 'en',
  NG: 'en', ZA: 'en', ZW: 'en', ZM: 'en', MW: 'en', BW: 'en', NA: 'en',
  LS: 'st', SZ: 'ss', MG: 'mg', MU: 'en', SC: 'fr', KM: 'ar', RE: 'fr',
  YT: 'fr', SH: 'en',

  // --- Oceanía y territorios remotos ----------------------------------------
  AU: 'en', NZ: 'en', PG: 'en', FJ: 'en', SB: 'en', VU: 'bi', NC: 'fr',
  PF: 'fr', WF: 'fr', WS: 'sm', TO: 'to', TV: 'tvl', KI: 'en', NR: 'en',
  MH: 'en', FM: 'en', PW: 'en', CK: 'en', NU: 'en', TK: 'en', AS: 'en',
  GU: 'en', MP: 'en', NF: 'en', CX: 'en', CC: 'en', PN: 'en', AQ: 'en',
  TF: 'fr', BV: 'nb', HM: 'en', GS: 'en', IO: 'en', UM: 'en',
};

// Idioma probable de un país (o null si no está mapeado / no hay país).
export function langForCountry(country?: string | null): string | null {
  if (!country) return null;
  return COUNTRY_TO_LANG[country.toUpperCase()] ?? null;
}
