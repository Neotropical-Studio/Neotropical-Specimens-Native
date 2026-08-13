import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Destino del payload QR sandbox (escaneo → intención de pago).
 * Siempre JSON — nunca HTML (evita páginas de error/landing no estructuradas).
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get('orderId') || '';
    const amount = url.searchParams.get('amount') || '';
    const method = url.searchParams.get('method') || 'alipay';
    const rail = url.searchParams.get('rail') || 'worldfirst';

    return NextResponse.json({
      ok: true,
      intent: 'payment',
      orderId,
      amount,
      method,
      rail,
      message:
        'Sandbox: en producción este QR abre Alipay / WeChat Pay vía WorldFirst. La confirmación llega por webhook y activa courier + permisos.',
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
