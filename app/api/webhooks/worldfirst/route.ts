import { NextResponse } from 'next/server';
import { getCheckoutOrder, patchCheckoutOrder } from '@/lib/payments/order-store';
import { activateOrderProcess } from '@/lib/payments/order-fulfillment';

export const runtime = 'nodejs';

/**
 * Webhook WorldFirst / confirmación QR Alipay·WeChat.
 * Header opcional: x-worldfirst-signature (validar cuando haya secreto live).
 */
export async function POST(req: Request) {
  const secret = process.env.WORLDFIRST_WEBHOOK_SECRET?.trim();
  if (secret) {
    const sig = req.headers.get('x-worldfirst-signature') || '';
    if (sig !== secret) {
      return NextResponse.json({ ok: false, error: 'invalid_signature' }, { status: 401 });
    }
  }

  let body: { orderId?: string; status?: string; paymentId?: string; amountUsd?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  if (!orderId) {
    return NextResponse.json({ ok: false, error: 'missing_orderId' }, { status: 400 });
  }

  const order = getCheckoutOrder(orderId);
  if (!order) {
    return NextResponse.json({ ok: false, error: 'order_not_found' }, { status: 404 });
  }

  const status = (body.status || 'SUCCESS').toUpperCase();
  if (!['SUCCESS', 'PAID', 'COMPLETED', 'TRADE_SUCCESS'].includes(status)) {
    patchCheckoutOrder(orderId, {
      status: 'awaiting_qr_payment',
      triggers: [
        ...order.triggers,
        {
          at: new Date().toISOString(),
          trigger: 'qr_api_confirmed',
          note: `Ignorado status=${status}`,
        },
      ],
    });
    return NextResponse.json({ ok: true, ignored: true, status });
  }

  patchCheckoutOrder(orderId, { status: 'payment_confirmed' });
  const result = await activateOrderProcess({
    orderId,
    trigger: 'qr_api_confirmed',
    note: body.paymentId ? `paymentId=${body.paymentId}` : 'WorldFirst QR API confirmado',
  });

  return NextResponse.json({ ok: true, fulfillment: result });
}
