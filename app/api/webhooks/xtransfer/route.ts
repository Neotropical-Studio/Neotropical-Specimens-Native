import { NextResponse } from 'next/server';
import { getCheckoutOrder, patchCheckoutOrder } from '@/lib/payments/order-store';
import {
  activateOrderProcess,
  processDueXTransferClearances,
  scheduleXTransferClearance,
} from '@/lib/payments/order-fulfillment';

export const runtime = 'nodejs';

/**
 * Webhook / script XTransfer:
 * - voucher_validated → activa proceso
 * - clearance_tick → procesa plazos 3–4 días vencidos
 */
export async function POST(req: Request) {
  const secret = process.env.XTRANSFER_WEBHOOK_SECRET?.trim();
  if (secret) {
    const sig = req.headers.get('x-xtransfer-signature') || '';
    if (sig !== secret) {
      return NextResponse.json({ ok: false, error: 'invalid_signature' }, { status: 401 });
    }
  }

  let body: {
    event?: string;
    orderId?: string;
    voucherId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const event = (body.event || 'voucher_validated').toLowerCase();

  if (event === 'clearance_tick' || event === 'cron') {
    const activated = await processDueXTransferClearances();
    return NextResponse.json({ ok: true, event, activated });
  }

  const orderId = body.orderId?.trim();
  if (!orderId) {
    return NextResponse.json({ ok: false, error: 'missing_orderId' }, { status: 400 });
  }

  const order = getCheckoutOrder(orderId);
  if (!order) {
    return NextResponse.json({ ok: false, error: 'order_not_found' }, { status: 404 });
  }

  if (event === 'awaiting_clearance') {
    const due = scheduleXTransferClearance(orderId, 4);
    return NextResponse.json({ ok: true, clearanceDueAt: due });
  }

  patchCheckoutOrder(orderId, { status: 'payment_confirmed' });
  const result = await activateOrderProcess({
    orderId,
    trigger: 'xtransfer_voucher_validated',
    note: body.voucherId ? `voucher=${body.voucherId}` : 'Voucher XTransfer validado',
  });

  return NextResponse.json({ ok: true, fulfillment: result });
}

/** Cron ligero: GET procesa clearances vencidos. */
export async function GET() {
  const activated = await processDueXTransferClearances();
  return NextResponse.json({ ok: true, activated });
}
