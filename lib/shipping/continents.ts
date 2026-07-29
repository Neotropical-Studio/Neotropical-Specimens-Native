// ============================================================================
// Continentes de cotización courier (6) + mapa país ISO → continente.
// ============================================================================

export type ShippingContinent =
  | 'america'
  | 'europe'
  | 'asia'
  | 'africa'
  | 'oceania'
  | 'antarctica';

export const SHIPPING_CONTINENT_LABEL: Record<ShippingContinent, string> = {
  america: 'América',
  europe: 'Europa',
  asia: 'Asia',
  africa: 'África',
  oceania: 'Oceanía',
  antarctica: 'Antártida',
};

/** ISO-3166 alpha-2 → continente de tarifa. */
const COUNTRY_CONTINENT: Record<string, ShippingContinent> = {
  // América
  AR: 'america', BO: 'america', BR: 'america', CL: 'america', CO: 'america',
  CR: 'america', CU: 'america', DO: 'america', EC: 'america', SV: 'america',
  GT: 'america', GY: 'america', HT: 'america', HN: 'america', JM: 'america',
  MX: 'america', NI: 'america', PA: 'america', PY: 'america', PE: 'america',
  SR: 'america', TT: 'america', UY: 'america', VE: 'america',
  US: 'america', CA: 'america', BZ: 'america', BS: 'america', BB: 'america',
  AG: 'america', DM: 'america', GD: 'america', KN: 'america', LC: 'america',
  VC: 'america', AW: 'america', CW: 'america', SX: 'america', PR: 'america',
  VI: 'america', GU: 'oceania', // Guam → Oceanía
  // Europa
  AL: 'europe', AD: 'europe', AT: 'europe', BY: 'europe', BE: 'europe',
  BA: 'europe', BG: 'europe', HR: 'europe', CY: 'europe', CZ: 'europe',
  DK: 'europe', EE: 'europe', FI: 'europe', FR: 'europe', DE: 'europe',
  GR: 'europe', HU: 'europe', IS: 'europe', IE: 'europe', IT: 'europe',
  XK: 'europe', LV: 'europe', LI: 'europe', LT: 'europe', LU: 'europe',
  MT: 'europe', MD: 'europe', MC: 'europe', ME: 'europe', NL: 'europe',
  MK: 'europe', NO: 'europe', PL: 'europe', PT: 'europe', RO: 'europe',
  RU: 'europe', SM: 'europe', RS: 'europe', SK: 'europe', SI: 'europe',
  ES: 'europe', SE: 'europe', CH: 'europe', UA: 'europe', GB: 'europe',
  VA: 'europe', AX: 'europe', FO: 'europe', GI: 'europe', GG: 'europe',
  IM: 'europe', JE: 'europe',
  // Asia
  AF: 'asia', AM: 'asia', AZ: 'asia', BH: 'asia', BD: 'asia', BT: 'asia',
  BN: 'asia', KH: 'asia', CN: 'asia', GE: 'asia', HK: 'asia', IN: 'asia',
  ID: 'asia', IR: 'asia', IQ: 'asia', IL: 'asia', JP: 'asia', JO: 'asia',
  KZ: 'asia', KW: 'asia', KG: 'asia', LA: 'asia', LB: 'asia', MO: 'asia',
  MY: 'asia', MV: 'asia', MN: 'asia', MM: 'asia', NP: 'asia', KP: 'asia',
  OM: 'asia', PK: 'asia', PS: 'asia', PH: 'asia', QA: 'asia', SA: 'asia',
  SG: 'asia', KR: 'asia', LK: 'asia', SY: 'asia', TW: 'asia', TJ: 'asia',
  TH: 'asia', TL: 'asia', TR: 'asia', TM: 'asia', AE: 'asia', UZ: 'asia',
  VN: 'asia', YE: 'asia',
  // África
  DZ: 'africa', AO: 'africa', BJ: 'africa', BW: 'africa', BF: 'africa',
  BI: 'africa', CV: 'africa', CM: 'africa', CF: 'africa', TD: 'africa',
  KM: 'africa', CG: 'africa', CD: 'africa', CI: 'africa', DJ: 'africa',
  EG: 'africa', GQ: 'africa', ER: 'africa', SZ: 'africa', ET: 'africa',
  GA: 'africa', GM: 'africa', GH: 'africa', GN: 'africa', GW: 'africa',
  KE: 'africa', LS: 'africa', LR: 'africa', LY: 'africa', MG: 'africa',
  MW: 'africa', ML: 'africa', MR: 'africa', MU: 'africa', MA: 'africa',
  MZ: 'africa', NA: 'africa', NE: 'africa', NG: 'africa', RW: 'africa',
  ST: 'africa', SN: 'africa', SC: 'africa', SL: 'africa', SO: 'africa',
  ZA: 'africa', SS: 'africa', SD: 'africa', TZ: 'africa', TG: 'africa',
  TN: 'africa', UG: 'africa', ZM: 'africa', ZW: 'africa', EH: 'africa',
  // Oceanía
  AU: 'oceania', FJ: 'oceania', KI: 'oceania', MH: 'oceania', FM: 'oceania',
  NR: 'oceania', NZ: 'oceania', PW: 'oceania', PG: 'oceania', WS: 'oceania',
  SB: 'oceania', TO: 'oceania', TV: 'oceania', VU: 'oceania', NC: 'oceania',
  PF: 'oceania', CK: 'oceania', NU: 'oceania', TK: 'oceania', AS: 'oceania',
  MP: 'oceania',
  // Antártida
  AQ: 'antarctica', TF: 'antarctica', GS: 'antarctica', HM: 'antarctica',
  BV: 'antarctica',
};

export function continentForCountry(countryIso2: string): ShippingContinent {
  const c = (countryIso2 || 'PE').toUpperCase().slice(0, 2);
  return COUNTRY_CONTINENT[c] ?? 'america';
}
