import { NextResponse } from 'next/server';
import {
  fetchCourierRates,
  defaultFromAddress,
  listCourierProviders,
  listNativeCarriers,
  type CourierProviderId,
  type NativeCarrierId,
  type ShippingAddress,
  type ParcelDims,
} from '@/lib/shipping/couriers';
import { quoteAllNativeCarriers, quoteNativeCarrier } from '@/lib/shipping/estimate';

export const runtime = 'nodejs';

/**
 * POST /api/shipping/rates
 * Body: {
 *   carrier?: NativeCarrierId  — serpost | exportafacil | ems_internacional | fedex | dhl | aramex
 *   provider?: 'easypost'      — bridge live FedEx/DHL
 *   to?: ShippingAddress       — si falta, solo país (estimado)
 *   country?: string
 *   parcel?: ParcelDims
 * }
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      carrier?: NativeCarrierId;
      provider?: CourierProviderId;
      to?: Partial<ShippingAddress>;
      country?: string;
      parcel?: ParcelDims;
      includeSpecial?: boolean;
    };

    const country =
      (body.to?.country || body.country || 'PE').toUpperCase().slice(0, 2);

    // Listado completo nativo (estándar + FedEx/DHL opcionales).
    if (!body.carrier && !body.provider) {
      const rates = quoteAllNativeCarriers(country, body.parcel).filter((r) =>
        body.includeSpecial === false ? r.tier === 'standard' : true,
      );
      return NextResponse.json({
        ok: true,
        country,
        carriers: listNativeCarriers(),
        rates,
        providers: listCourierProviders(),
        note:
          'Estándar: Serpost · Exportafacil · EMS Internacional. Especiales (opción cliente): FedEx · DHL.',
      });
    }

    if (body.carrier) {
      const rate = quoteNativeCarrier(body.carrier, country, body.parcel);
      return NextResponse.json({
        ok: true,
        country,
        rates: [rate],
        carriers: listNativeCarriers(),
      });
    }

    const provider = body.provider ?? 'easypost';
    const providers = listCourierProviders();
    const meta = providers.find((p) => p.id === provider);

    if (provider === 'easypost' && !meta?.configured) {
      // Fallback: solo FedEx/DHL estimados.
      return NextResponse.json({
        ok: true,
        country,
        rates: [
          quoteNativeCarrier('fedex', country, body.parcel),
          quoteNativeCarrier('dhl', country, body.parcel),
          quoteNativeCarrier('aramex', country, body.parcel),
        ],
        fallback: true,
        message: 'Sin EASYPOST_API_KEY — tarifas FedEx/DHL/Aramex estimadas.',
      });
    }

    if (!body.to?.street1 || !body.to?.city || !body.to?.zip) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_address',
          message: 'Para EasyPost live hace falta dirección completa.',
        },
        { status: 400 },
      );
    }

    const rates = await fetchCourierRates({
      provider,
      to: body.to as ShippingAddress,
      from: defaultFromAddress(),
      parcel: body.parcel,
    });

    return NextResponse.json({ ok: true, provider, rates, providers });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'shipping_error';
    return NextResponse.json({ ok: false, error: 'shipping_failed', message }, { status: 502 });
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      carriers: listNativeCarriers(),
      standard: listNativeCarriers().filter((c) => c.tier === 'standard'),
      special: listNativeCarriers().filter((c) => c.tier === 'special'),
      note:
        'Nosotros enviamos con Serpost, Exportafacil y EMS Internacional. FedEx y DHL son opción del cliente (casos especiales).',
      providers: listCourierProviders(),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
