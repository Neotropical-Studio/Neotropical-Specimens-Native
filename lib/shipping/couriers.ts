// ============================================================================
// Couriers Neotropical Specimens (origen Perú).
// Estándar (nosotros enviamos): Serpost SA · Exportafacil · EMS Internacional
// Especiales (opción del cliente): FedEx · DHL
// EasyPost queda como bridge API opcional para FedEx/DHL cuando haya clave.
// ============================================================================

export type NativeCarrierId =
  | 'serpost'
  | 'exportafacil'
  | 'ems_internacional'
  | 'fedex'
  | 'dhl'
  | 'aramex';

export type CourierProviderId = NativeCarrierId | 'easypost' | 'easy_courier';

export type CarrierTier = 'standard' | 'special';

export interface NativeCarrier {
  id: NativeCarrierId;
  label: string;
  /** Nombre operativo / razón social. */
  legalName: string;
  tier: CarrierTier;
  description: string;
  /** true = siempre ofrecido en checkout. */
  alwaysOffered: boolean;
  /** true = solo si el cliente lo elige (casos especiales). */
  clientOptional: boolean;
}

/** Catálogo oficial de despacho. */
export const NATIVE_CARRIERS: NativeCarrier[] = [
  {
    id: 'serpost',
    label: 'Serpost',
    legalName: 'SERPOST S.A. / Empresas Serpost',
    tier: 'standard',
    description: 'Correo postal oficial del Perú. El cliente elige con check.',
    alwaysOffered: true,
    clientOptional: true,
  },
  {
    id: 'exportafacil',
    label: 'Exportafacil',
    legalName: 'Exportafacil',
    tier: 'standard',
    description: 'Exportación postal simplificada. El cliente elige con check.',
    alwaysOffered: true,
    clientOptional: true,
  },
  {
    id: 'ems_internacional',
    label: 'EMS Internacional',
    legalName: 'EMS Internacional (vía Serpost)',
    tier: 'standard',
    description: 'Express Mail Service. El cliente elige con check.',
    alwaysOffered: true,
    clientOptional: true,
  },
  {
    id: 'fedex',
    label: 'FedEx',
    legalName: 'FedEx',
    tier: 'special',
    description: 'Express. Tránsito 5–7 días útiles. El cliente elige con check.',
    alwaysOffered: true,
    clientOptional: true,
  },
  {
    id: 'dhl',
    label: 'DHL',
    legalName: 'DHL Express',
    tier: 'special',
    description: 'Express. Tránsito 5–8 días. El cliente elige con check.',
    alwaysOffered: true,
    clientOptional: true,
  },
  {
    id: 'aramex',
    label: 'Aramex',
    legalName: 'Aramex',
    tier: 'special',
    description: 'Express. Tránsito 8 días útiles. El cliente elige con check.',
    alwaysOffered: true,
    clientOptional: true,
  },
];

export function listNativeCarriers(): NativeCarrier[] {
  return NATIVE_CARRIERS;
}

export function listStandardCarriers(): NativeCarrier[] {
  return NATIVE_CARRIERS.filter((c) => c.tier === 'standard');
}

export function listSpecialCarriers(): NativeCarrier[] {
  return NATIVE_CARRIERS.filter((c) => c.tier === 'special');
}

export function getCarrier(id: NativeCarrierId): NativeCarrier | undefined {
  return NATIVE_CARRIERS.find((c) => c.id === id);
}

export interface CourierProvider {
  id: CourierProviderId;
  label: string;
  configured: boolean;
  description: string;
}

export interface ShippingAddress {
  name?: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state?: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface ParcelDims {
  /** Peso en onzas (EasyPost). */
  weightOz: number;
  lengthIn?: number;
  widthIn?: number;
  heightIn?: number;
  /** Alternativa métrica (cotización nativa). */
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}

export interface CourierRateQuote {
  provider: CourierProviderId;
  carrier: string;
  carrierId: NativeCarrierId | 'other';
  service: string;
  rateUsd: number;
  currency: string;
  deliveryDays?: number | null;
  /** Rango de tránsito (días) — Serpost / Exportafacil / EMS. */
  deliveryDaysMin?: number | null;
  deliveryDaysMax?: number | null;
  deliveryLabel?: string | null;
  tier: CarrierTier | 'bridge';
  rateId?: string;
  shipmentId?: string;
  /** Estimado local vs tarifa API live. */
  source: 'estimate' | 'api';
}

export function listCourierProviders(): CourierProvider[] {
  return [
    ...NATIVE_CARRIERS.map((c) => ({
      id: c.id as CourierProviderId,
      label: c.label,
      configured: true,
      description: c.description,
    })),
    {
      id: 'easypost',
      label: 'EasyPost (bridge FedEx/DHL)',
      configured: Boolean(process.env.EASYPOST_API_KEY?.trim()),
      description: 'Bridge API opcional para tarifas live FedEx/DHL.',
    },
  ];
}

/** Paquete default especímenes secos (~caja entomológica). */
export const DEFAULT_SPECIMEN_PARCEL: ParcelDims = {
  weightOz: 16,
  lengthIn: 12,
  widthIn: 10,
  heightIn: 4,
  weightKg: 0.45,
  lengthCm: 30,
  widthCm: 25,
  heightCm: 10,
};

export function volumetricWeightKg(parcel: ParcelDims): number {
  const l = parcel.lengthCm ?? (parcel.lengthIn ?? 12) * 2.54;
  const w = parcel.widthCm ?? (parcel.widthIn ?? 10) * 2.54;
  const h = parcel.heightCm ?? (parcel.heightIn ?? 4) * 2.54;
  return Math.round(((l * w * h) / 5000) * 1000) / 1000;
}

export function billableWeightKg(parcel: ParcelDims = DEFAULT_SPECIMEN_PARCEL): number {
  const actual =
    parcel.weightKg ?? Math.round(((parcel.weightOz || 16) / 35.274) * 1000) / 1000;
  return Math.max(actual, volumetricWeightKg(parcel));
}

/**
 * Cotiza tarifas EasyPost (server-only) — útil para FedEx/DHL live.
 */
export async function fetchEasyPostRates(input: {
  to: ShippingAddress;
  from: ShippingAddress;
  parcel?: ParcelDims;
}): Promise<CourierRateQuote[]> {
  const apiKey = process.env.EASYPOST_API_KEY?.trim();
  if (!apiKey) return [];

  const parcel = input.parcel ?? DEFAULT_SPECIMEN_PARCEL;
  const auth = Buffer.from(`${apiKey}:`).toString('base64');

  const res = await fetch('https://api.easypost.com/v2/shipments', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      shipment: {
        to_address: {
          name: input.to.name,
          company: input.to.company,
          street1: input.to.street1,
          street2: input.to.street2,
          city: input.to.city,
          state: input.to.state,
          zip: input.to.zip,
          country: input.to.country,
          phone: input.to.phone,
          email: input.to.email,
        },
        from_address: {
          name: input.from.name,
          company: input.from.company,
          street1: input.from.street1,
          street2: input.from.street2,
          city: input.from.city,
          state: input.from.state,
          zip: input.from.zip,
          country: input.from.country,
          phone: input.from.phone,
          email: input.from.email,
        },
        parcel: {
          weight: parcel.weightOz,
          length: parcel.lengthIn,
          width: parcel.widthIn,
          height: parcel.heightIn,
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`EasyPost ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    id?: string;
    rates?: Array<{
      id: string;
      carrier: string;
      service: string;
      rate: string;
      currency: string;
      delivery_days?: number | null;
    }>;
  };

  return (data.rates ?? [])
    .map((r) => {
      const name = `${r.carrier} ${r.service}`.toLowerCase();
      let carrierId: NativeCarrierId | 'other' = 'other';
      let tier: CarrierTier | 'bridge' = 'bridge';
      if (name.includes('fedex')) {
        carrierId = 'fedex';
        tier = 'special';
      } else if (name.includes('dhl')) {
        carrierId = 'dhl';
        tier = 'special';
      } else if (name.includes('aramex')) {
        carrierId = 'aramex';
        tier = 'special';
      }
      return {
        provider: 'easypost' as const,
        carrier: r.carrier,
        carrierId,
        service: r.service,
        rateUsd: Number.parseFloat(r.rate) || 0,
        currency: (r.currency || 'USD').toUpperCase(),
        deliveryDays: r.delivery_days ?? null,
        tier,
        rateId: r.id,
        shipmentId: data.id,
        source: 'api' as const,
      };
    })
    .filter((r) => r.rateUsd > 0)
    .sort((a, b) => a.rateUsd - b.rateUsd);
}

export async function fetchCourierRates(input: {
  provider: CourierProviderId;
  to: ShippingAddress;
  from: ShippingAddress;
  parcel?: ParcelDims;
}): Promise<CourierRateQuote[]> {
  if (input.provider === 'easypost') {
    return fetchEasyPostRates(input);
  }
  // Carriers nativos: cotización por peso/volumen (estimate module).
  const { quoteNativeCarrier } = await import('@/lib/shipping/estimate');
  if (
    input.provider === 'serpost' ||
    input.provider === 'exportafacil' ||
    input.provider === 'ems_internacional' ||
    input.provider === 'fedex' ||
    input.provider === 'dhl' ||
    input.provider === 'aramex'
  ) {
    return [quoteNativeCarrier(input.provider, input.to.country, input.parcel)];
  }
  return [];
}

/** Remitente Perú (origen de expediciones). */
export function defaultFromAddress(): ShippingAddress {
  return {
    name: process.env.SHIP_FROM_NAME || 'Neotropical Specimens',
    company: process.env.SHIP_FROM_COMPANY || 'House Insects of Peru E.I.R.L.',
    street1: process.env.SHIP_FROM_STREET1 || 'Tingo Maria',
    city: process.env.SHIP_FROM_CITY || 'Tingo Maria',
    state: process.env.SHIP_FROM_STATE || 'Huanuco',
    zip: process.env.SHIP_FROM_ZIP || '10101',
    country: process.env.SHIP_FROM_COUNTRY || 'PE',
    phone: process.env.SHIP_FROM_PHONE,
    email: process.env.SHIP_FROM_EMAIL || process.env.EXPORT_DOCS_FROM_EMAIL,
  };
}
