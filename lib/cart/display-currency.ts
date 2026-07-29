// ============================================================================
// Monedas de display del carrito — dinámico, cero hardcodeo en UI.
// USD siempre disponible; regionales: EUR (Europa), CNY (Asia/Yuan),
// GBP (Inglaterra/libras), + local del país. El cliente elige.
// ============================================================================

import type { ShippingContinent } from '@/lib/shipping/continents';
import { currencyForCountry } from '@/lib/geo/currencies';

export type DisplayCurrencyCode = 'USD' | 'EUR' | 'CNY' | 'GBP' | 'PEN' | string;

export type DisplayCurrencyOption = {
  code: DisplayCurrencyCode;
  labelKey: string;
  labelFallback: string;
  /** País ISO para bandera representativa. */
  flagCountry: string;
  /** Siempre en el selector. */
  always?: boolean;
};

/** Catálogo base editable — el usuario siempre puede elegir USD. */
export const DISPLAY_CURRENCY_CATALOG: DisplayCurrencyOption[] = [
  {
    code: 'USD',
    labelKey: 'cart.fx_usd',
    labelFallback: 'USD',
    flagCountry: 'us',
    always: true,
  },
  {
    code: 'EUR',
    labelKey: 'cart.fx_eur',
    labelFallback: 'EUR · Euro',
    flagCountry: 'eu',
  },
  {
    code: 'CNY',
    labelKey: 'cart.fx_cny',
    labelFallback: 'CNY · Yuan',
    flagCountry: 'cn',
  },
  {
    code: 'GBP',
    labelKey: 'cart.fx_gbp',
    labelFallback: 'GBP · Libra',
    flagCountry: 'gb',
  },
  {
    code: 'PEN',
    labelKey: 'cart.fx_pen',
    labelFallback: 'PEN · Sol',
    flagCountry: 'pe',
  },
  {
    code: 'JPY',
    labelKey: 'cart.fx_jpy',
    labelFallback: 'JPY · Yen',
    flagCountry: 'jp',
  },
  {
    code: 'HKD',
    labelKey: 'cart.fx_hkd',
    labelFallback: 'HKD · HK$',
    flagCountry: 'hk',
  },
];

/** Siempre ofrecer estas en el selector (el cliente elige). */
export const ALWAYS_OFFER_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'CNY',
  'PEN',
  'JPY',
  'HKD',
] as const;

/** Moneda regional sugerida por zona de envío. */
export const ZONE_SUGGESTED_CURRENCY: Record<ShippingContinent, DisplayCurrencyCode> = {
  america: 'USD',
  europe: 'EUR',
  asia: 'CNY',
  africa: 'USD',
  oceania: 'USD',
  antarctica: 'USD',
};

/** UK y dependencias → libras (no euro). */
const GBP_COUNTRIES = new Set(['GB', 'UK', 'GG', 'JE', 'IM', 'GI']);

/**
 * Opciones visibles según destino/zona.
 * Siempre incluye USD + regionales + moneda local del país.
 */
export function displayCurrencyOptions(
  countryIso2: string,
  _zone: ShippingContinent,
): DisplayCurrencyOption[] {
  const country = (countryIso2 || 'PE').toUpperCase().slice(0, 2);
  const local = currencyForCountry(country);
  const codes = new Set<string>([...ALWAYS_OFFER_CURRENCIES]);

  if (GBP_COUNTRIES.has(country)) {
    codes.add('GBP');
  }
  if (local) codes.add(local);

  const byCode = new Map(DISPLAY_CURRENCY_CATALOG.map((o) => [o.code, o]));
  const out: DisplayCurrencyOption[] = [];

  for (const code of codes) {
    const known = byCode.get(code);
    if (known) {
      out.push(known);
    } else {
      out.push({
        code,
        labelKey: `cart.fx_${code.toLowerCase()}`,
        labelFallback: code,
        flagCountry: country.toLowerCase(),
      });
    }
  }

  // USD primero, luego resto alfabético.
  return out.sort((a, b) => {
    if (a.code === 'USD') return -1;
    if (b.code === 'USD') return 1;
    return a.code.localeCompare(b.code);
  });
}

/** Default inteligente: local UK→GBP, Europa→EUR, Asia→CNY, PE→PEN, resto USD. */
export function defaultDisplayCurrency(
  countryIso2: string,
  zone: ShippingContinent,
): DisplayCurrencyCode {
  const country = (countryIso2 || 'PE').toUpperCase().slice(0, 2);
  if (GBP_COUNTRIES.has(country)) return 'GBP';
  if (country === 'PE') return 'PEN';
  if (country === 'HK') return 'HKD';
  if (country === 'CN' || country === 'TW' || country === 'MO') return 'CNY';
  if (zone === 'europe') return 'EUR';
  if (zone === 'asia') return 'CNY';
  return 'USD';
}

/** Subconjunto de tasas que pide el cliente al /api/fx. */
export const DISPLAY_FX_CODES = [
  'USD',
  'EUR',
  'CNY',
  'GBP',
  'PEN',
  'JPY',
  'HKD',
  'KRW',
  'BRL',
  'MXN',
  'SGD',
  'AUD',
  'CAD',
] as const;
