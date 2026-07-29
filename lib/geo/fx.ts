// ============================================================================
// FX regenerativo universal — precios siempre en PEN + USD (y moneda local
// del país del cliente cuando no sea PEN/USD). ~240 países vía ISO-4217.
// Fuente: API pública con caché; sin API → tasas de respaldo actualizables.
// ============================================================================

export type FxTable = Record<string, number>; // currency → unidades por 1 USD

/** Tasas de respaldo (unidades por 1 USD). Exportadas para UI cliente. */
export const FALLBACK_RATES_USD: FxTable = {
  USD: 1,
  PEN: 3.75,
  EUR: 0.92,
  GBP: 0.79,
  CNY: 7.25,
  HKD: 7.8,
  TWD: 32.5,
  MOP: 8.0,
  JPY: 150,
  KRW: 1350,
  BRL: 5.1,
  MXN: 17.2,
  COP: 4100,
  CLP: 950,
  ARS: 900,
  CAD: 1.36,
  AUD: 1.52,
  CHF: 0.88,
  INR: 83,
  AED: 3.67,
  SGD: 1.34,
};

let cache: { at: number; rates: FxTable } | null = null;
const TTL_MS = 60 * 60 * 1000; // 1 h

/** Tasas respecto a USD (cuántas unidades de `code` por 1 USD). */
export async function getFxRatesUsd(): Promise<FxTable> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rates;

  const url =
    process.env.FX_API_URL?.trim() ||
    'https://open.er-api.com/v6/latest/USD';

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`fx_http_${res.status}`);
    const data = (await res.json()) as { rates?: FxTable; result?: string };
    const rates = data.rates ?? {};
    if (!rates.USD) rates.USD = 1;
    if (!rates.PEN) rates.PEN = FALLBACK_RATES_USD.PEN;
    cache = { at: Date.now(), rates: { ...FALLBACK_RATES_USD, ...rates } };
    return cache.rates;
  } catch {
    cache = { at: Date.now(), rates: { ...FALLBACK_RATES_USD } };
    return cache.rates;
  }
}

export function convertUsd(amountUsd: number, toCurrency: string, rates: FxTable): number {
  const code = toCurrency.toUpperCase();
  const rate = rates[code] ?? FALLBACK_RATES_USD[code] ?? 1;
  return Math.round(amountUsd * rate * 100) / 100;
}

export function convertToUsd(amount: number, fromCurrency: string, rates: FxTable): number {
  const code = fromCurrency.toUpperCase();
  if (code === 'USD') return Math.round(amount * 100) / 100;
  const rate = rates[code] ?? FALLBACK_RATES_USD[code] ?? 1;
  if (!rate) return amount;
  return Math.round((amount / rate) * 100) / 100;
}

export interface MoneyDisplay {
  /** Siempre presente — soles peruanos. */
  pen: number;
  /** Siempre presente — dólares. */
  usd: number;
  /** Moneda local del país del visitante (si ≠ PEN y ≠ USD). */
  local: number | null;
  localCurrency: string | null;
  ratesAt: number;
}

/**
 * Universales: siempre PEN + USD.
 * Regenerativo i18n: si el país del cliente usa otra ISO-4217, también local.
 */
export function dualMoneyFromUsd(
  amountUsd: number,
  rates: FxTable,
  visitorCurrency?: string | null,
): MoneyDisplay {
  const usd = Math.round(amountUsd * 100) / 100;
  const pen = convertUsd(usd, 'PEN', rates);
  const vc = visitorCurrency?.toUpperCase() || null;
  const showLocal = Boolean(vc && vc !== 'USD' && vc !== 'PEN' && (rates[vc] || FALLBACK_RATES_USD[vc]));
  return {
    usd,
    pen,
    local: showLocal && vc ? convertUsd(usd, vc, rates) : null,
    localCurrency: showLocal ? vc : null,
    ratesAt: cache?.at ?? Date.now(),
  };
}
