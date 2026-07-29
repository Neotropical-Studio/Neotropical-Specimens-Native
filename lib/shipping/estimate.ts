// ============================================================================
// Tarifas courier por continente × peso (0.5 kg → 5000 kg) en USD.
//
// América: 0.5→$65 · 1→$95 · 2→$110 · 5→$150
// Europa:  0.5→$85 · 1→$115 · 2→$130 · 5→$160
// Asia:    0.5→$95 · 1→$135 · 2→$150 · 5→$200
// Oceanía: 0.5→$95 · 1→$125 · 2→$160 · 5→$200
// África:  0.5→$95 · 1→$155 · 2→$170 · 5→$200
// Antártida: provisional hasta confirmar.
// ============================================================================

import {
  continentForCountry,
  SHIPPING_CONTINENT_LABEL,
  type ShippingContinent,
} from '@/lib/shipping/continents';
import {
  DEFAULT_SPECIMEN_PARCEL,
  getCarrier,
  type CourierRateQuote,
  type NativeCarrierId,
  type ParcelDims,
} from '@/lib/shipping/couriers';

/** Puntos ancla oficiales (kg → USD) por continente. */
export type WeightAnchor = { kg: number; usd: number };

/** América — cifras del cliente. */
export const AMERICA_WEIGHT_RATES: WeightAnchor[] = [
  { kg: 0.5, usd: 65 },
  { kg: 1, usd: 95 },
  { kg: 2, usd: 110 },
  { kg: 5, usd: 150 },
];

/** Europa — cifras del cliente (5 kg = $160; “1160” tipográfico). */
export const EUROPE_WEIGHT_RATES: WeightAnchor[] = [
  { kg: 0.5, usd: 85 },
  { kg: 1, usd: 115 },
  { kg: 2, usd: 130 },
  { kg: 5, usd: 160 },
];

/** Asia — cifras del cliente. */
export const ASIA_WEIGHT_RATES: WeightAnchor[] = [
  { kg: 0.5, usd: 95 },
  { kg: 1, usd: 135 },
  { kg: 2, usd: 150 },
  { kg: 5, usd: 200 },
];

/** Oceanía — cifras del cliente. */
export const OCEANIA_WEIGHT_RATES: WeightAnchor[] = [
  { kg: 0.5, usd: 95 },
  { kg: 1, usd: 125 },
  { kg: 2, usd: 160 },
  { kg: 5, usd: 200 },
];

/** África — cifras del cliente. */
export const AFRICA_WEIGHT_RATES: WeightAnchor[] = [
  { kg: 0.5, usd: 95 },
  { kg: 1, usd: 155 },
  { kg: 2, usd: 170 },
  { kg: 5, usd: 200 },
];

/**
 * Provisional hasta confirmar: Antártida (2.2× América).
 */
function scaleAnchors(base: WeightAnchor[], factor: number): WeightAnchor[] {
  return base.map((a) => ({
    kg: a.kg,
    usd: Math.round(a.usd * factor),
  }));
}

export const CONTINENT_WEIGHT_RATES: Record<ShippingContinent, WeightAnchor[]> = {
  america: AMERICA_WEIGHT_RATES,
  europe: EUROPE_WEIGHT_RATES,
  asia: ASIA_WEIGHT_RATES,
  africa: AFRICA_WEIGHT_RATES,
  oceania: OCEANIA_WEIGHT_RATES,
  antarctica: scaleAnchors(AMERICA_WEIGHT_RATES, 2.2),
};

export const MIN_SHIP_KG = 0.5;
export const MAX_SHIP_KG = 5000;

/** Multiplicador por courier sobre la tarifa continental base (Serpost = 1). */
const CARRIER_FACTOR: Record<NativeCarrierId, number> = {
  serpost: 1,
  exportafacil: 1.05,
  ems_internacional: 1.18,
  fedex: 1.55,
  dhl: 1.62,
  aramex: 1.48,
};

/**
 * Plazo de llegada a destino — Serpost, Exportafacil, EMS Internacional.
 * América: 10 días · Europa: 15 · África/Asia/Oceanía: 15–21.
 */
export type TransitWindow = { min: number; max: number; label: string };

export const STANDARD_TRANSIT_DAYS: Record<ShippingContinent, TransitWindow> = {
  america: { min: 10, max: 10, label: '10 días' },
  europe: { min: 15, max: 15, label: '15 días' },
  africa: { min: 15, max: 21, label: '15–21 días' },
  asia: { min: 15, max: 21, label: '15–21 días' },
  oceania: { min: 15, max: 21, label: '15–21 días' },
  antarctica: { min: 21, max: 30, label: '21–30 días' },
};

/** Especiales (opción del cliente) — plazos globales. */
export const SPECIAL_CARRIER_TRANSIT: Record<'fedex' | 'dhl' | 'aramex', TransitWindow> = {
  dhl: { min: 5, max: 8, label: '5–8 días' },
  fedex: { min: 5, max: 7, label: '5–7 días útiles' },
  aramex: { min: 8, max: 8, label: '8 días útiles' },
};

function transitForCarrier(
  carrierId: NativeCarrierId,
  continent: ShippingContinent,
): TransitWindow {
  if (carrierId === 'fedex' || carrierId === 'dhl' || carrierId === 'aramex') {
    return SPECIAL_CARRIER_TRANSIT[carrierId];
  }
  return STANDARD_TRANSIT_DAYS[continent];
}

/** Interpolación lineal entre anclas; >5 kg: margen 2→5 kg hasta 5000. */
export function rateUsdForWeight(anchors: WeightAnchor[], weightKg: number): number {
  const w = Math.min(MAX_SHIP_KG, Math.max(MIN_SHIP_KG, weightKg));
  const sorted = [...anchors].sort((a, b) => a.kg - b.kg);

  if (w <= sorted[0].kg) return sorted[0].usd;

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (w <= b.kg) {
      const t = (w - a.kg) / (b.kg - a.kg);
      return Math.round((a.usd + t * (b.usd - a.usd)) * 100) / 100;
    }
  }

  const last = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2] ?? last;
  const marginal = (last.usd - prev.usd) / Math.max(0.001, last.kg - prev.kg);
  const extra = (w - last.kg) * marginal;
  return Math.round((last.usd + extra) * 100) / 100;
}

export function resolveShipWeightKg(parcel?: ParcelDims): number {
  if (parcel?.weightKg != null && parcel.weightKg > 0) {
    return Math.min(MAX_SHIP_KG, Math.max(MIN_SHIP_KG, parcel.weightKg));
  }
  const oz = parcel?.weightOz ?? DEFAULT_SPECIMEN_PARCEL.weightOz;
  const kg = oz / 35.274;
  return Math.min(MAX_SHIP_KG, Math.max(MIN_SHIP_KG, Math.round(kg * 100) / 100));
}

/** Pesos típicos seleccionables en el carrito. */
export const CART_WEIGHT_OPTIONS_KG = [
  0.5, 1, 2, 5, 10, 20, 50, 100, 250, 500, 1000, 2000, 5000,
] as const;

export function quoteNativeCarrier(
  carrierId: NativeCarrierId,
  countryIso2: string,
  parcel: ParcelDims = DEFAULT_SPECIMEN_PARCEL,
): CourierRateQuote {
  const continent = continentForCountry(countryIso2);
  const kg = resolveShipWeightKg(parcel);
  const base = rateUsdForWeight(CONTINENT_WEIGHT_RATES[continent], kg);
  const rateUsd = Math.round(base * CARRIER_FACTOR[carrierId] * 100) / 100;
  const meta = getCarrier(carrierId);
  const transit = transitForCarrier(carrierId, continent);

  return {
    provider: carrierId,
    carrier: meta?.label ?? carrierId,
    carrierId,
    service: `${meta?.legalName ?? carrierId} · ${SHIPPING_CONTINENT_LABEL[continent]} · ${kg} kg · ${transit.label}`,
    rateUsd,
    currency: 'USD',
    deliveryDays: transit.max,
    deliveryDaysMin: transit.min,
    deliveryDaysMax: transit.max,
    deliveryLabel: transit.label,
    tier: meta?.tier ?? 'standard',
    source: 'estimate',
  };
}

export function quoteAllNativeCarriers(
  countryIso2: string,
  parcel: ParcelDims = DEFAULT_SPECIMEN_PARCEL,
): CourierRateQuote[] {
  const ids: NativeCarrierId[] = [
    'serpost',
    'exportafacil',
    'ems_internacional',
    'fedex',
    'dhl',
    'aramex',
  ];
  return ids.map((id) => quoteNativeCarrier(id, countryIso2, parcel));
}

export function estimateShippingUsd(countryIso2: string, weightKg = 0.5): number {
  return quoteNativeCarrier('serpost', countryIso2, {
    ...DEFAULT_SPECIMEN_PARCEL,
    weightKg,
  }).rateUsd;
}

export function estimateShippingUsdForCarrier(
  carrierId: NativeCarrierId,
  countryIso2: string,
  parcel?: ParcelDims,
): number {
  return quoteNativeCarrier(carrierId, countryIso2, parcel).rateUsd;
}

export function continentalBaseRateUsd(
  countryIso2: string,
  weightKg: number,
): { continent: ShippingContinent; label: string; rateUsd: number; weightKg: number } {
  const continent = continentForCountry(countryIso2);
  const w = Math.min(MAX_SHIP_KG, Math.max(MIN_SHIP_KG, weightKg));
  return {
    continent,
    label: SHIPPING_CONTINENT_LABEL[continent],
    rateUsd: rateUsdForWeight(CONTINENT_WEIGHT_RATES[continent], w),
    weightKg: w,
  };
}
