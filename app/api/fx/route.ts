import { NextResponse } from 'next/server';
import { getFxRatesUsd, dualMoneyFromUsd, type FxTable } from '@/lib/geo/fx';
import { currencyForCountry } from '@/lib/geo/currencies';
import { DISPLAY_FX_CODES } from '@/lib/cart/display-currency';

export const runtime = 'nodejs';

/**
 * GET /api/fx?amountUsd=100&country=PE
 * Devuelve PEN + USD (+ local) y tasas para selector de moneda del carrito.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const amountUsd = Number.parseFloat(searchParams.get('amountUsd') || '0') || 0;
    const country = searchParams.get('country');
    const rates = await getFxRatesUsd();
    const visitorCurrency = currencyForCountry(country);
    const money = dualMoneyFromUsd(amountUsd, rates, visitorCurrency);

    const subset: FxTable = { USD: 1 };
    for (const code of DISPLAY_FX_CODES) {
      if (rates[code] != null) subset[code] = rates[code];
    }
    if (visitorCurrency && rates[visitorCurrency] != null) {
      subset[visitorCurrency] = rates[visitorCurrency];
    }

    return NextResponse.json({
      ok: true,
      amountUsd,
      country: country?.toUpperCase() ?? null,
      visitorCurrency,
      money,
      rates: subset,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
