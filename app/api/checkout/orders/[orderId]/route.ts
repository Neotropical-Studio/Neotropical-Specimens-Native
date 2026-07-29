import { NextResponse } from 'next/server';
import { getCheckoutOrder } from '@/lib/payments/order-store';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ orderId: string }> };

/** Estado de orden / pago QR (poll desde checkout). */
export async function GET(_req: Request, ctx: Ctx) {
  const { orderId } = await ctx.params;
  const order = getCheckoutOrder(orderId);
  if (!order) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    orderId: order.orderId,
    status: order.status,
    segment: order.segment,
    totalUsd: order.totalUsd,
    documentsDispatched: order.documentsDispatched,
    logisticsStarted: order.logisticsStarted,
    permitsStarted: order.permitsStarted,
    clearanceDueAt: order.clearanceDueAt ?? null,
    qr: order.qr
      ? {
          method: order.qr.method,
          expiresAt: order.qr.expiresAt,
          sandbox: order.qr.sandbox,
          qrDataUrl: order.qr.qrDataUrl,
        }
      : null,
  });
}
