// ============================================================================
// Activación del proceso post-pago (webhooks / voucher / plazo XTransfer).
// 1) Confirmación QR API  → logistics + permisos
// 2) Voucher XTransfer    → logistics + permisos
// 3) 3–4 días hábiles     → mismo pipeline
// Docs ya van al confirmar orden; aquí se garantiza reintento si fallaron.
// ============================================================================

import {
  getCheckoutOrder,
  patchCheckoutOrder,
  type ProcessTrigger,
} from '@/lib/payments/order-store';
import { planExportDocuments } from '@/lib/payments/export-documents';
import { dispatchExportDocuments } from '@/lib/payments/export-email';

export type FulfillmentResult = {
  ok: boolean;
  orderId: string;
  status: string;
  logisticsStarted: boolean;
  permitsStarted: boolean;
  documents?: { dryRun: boolean; message: string };
  message: string;
};

/**
 * Activa logística courier + trámites de permisos agrupados.
 * Se llama cuando el pago QR está confirmado o XTransfer da visto bueno.
 */
export async function activateOrderProcess(input: {
  orderId: string;
  trigger: ProcessTrigger;
  note?: string;
}): Promise<FulfillmentResult> {
  const order = getCheckoutOrder(input.orderId);
  if (!order) {
    return {
      ok: false,
      orderId: input.orderId,
      status: 'missing',
      logisticsStarted: false,
      permitsStarted: false,
      message: 'Orden no encontrada.',
    };
  }

  const triggers = [
    ...order.triggers,
    { at: new Date().toISOString(), trigger: input.trigger, note: input.note },
  ];

  // Reintento documental si el despacho inicial falló / dry-run aún no enviado.
  let docsMeta: { dryRun: boolean; message: string } | undefined;
  if (!order.documentsDispatched || input.trigger === 'order_confirm') {
    const plan = planExportDocuments({
      orderId: order.orderId,
      party: {
        companyName: order.companyName,
        contactEmail: order.contactEmail,
        country: order.country,
      },
      breakdown: order.breakdown,
      kinds: ['commercial_invoice', 'packing_list', 'export_sale_contract'],
      lines: order.lines,
    });
    const dispatch = await dispatchExportDocuments(plan);
    docsMeta = { dryRun: dispatch.dryRun, message: dispatch.message };
    const emailed = dispatch.plan.jobs.every((j) => j.status === 'emailed' || j.status === 'queued');
    patchCheckoutOrder(order.orderId, {
      documentsDispatched: emailed,
      triggers,
      status: 'docs_sent',
    });
  } else {
    patchCheckoutOrder(order.orderId, { triggers });
  }

  const paymentOk =
    input.trigger === 'qr_api_confirmed' ||
    input.trigger === 'xtransfer_voucher_validated' ||
    input.trigger === 'xtransfer_clearance_elapsed';

  if (!paymentOk && input.trigger === 'order_confirm') {
    const refreshed = getCheckoutOrder(order.orderId)!;
    return {
      ok: true,
      orderId: order.orderId,
      status: refreshed.status,
      logisticsStarted: false,
      permitsStarted: false,
      documents: docsMeta,
      message: 'Orden confirmada. Esperando pago QR o liquidación XTransfer.',
    };
  }

  // Pago confirmado → logística + permisos en paralelo (cero fricción).
  patchCheckoutOrder(order.orderId, {
    status: 'fulfilled',
    logisticsStarted: true,
    permitsStarted: true,
    triggers: [...(getCheckoutOrder(order.orderId)?.triggers ?? triggers)],
  });

  return {
    ok: true,
    orderId: order.orderId,
    status: 'fulfilled',
    logisticsStarted: true,
    permitsStarted: true,
    documents: docsMeta,
    message: `Proceso activado (${input.trigger}): courier + permisos SERFOR/SENASA. Orden ${order.orderId}.`,
  };
}

/** Programa vista de 3–4 días hábiles (aprox. +4 días calendario). */
export function scheduleXTransferClearance(orderId: string, businessDays = 4): string {
  const due = new Date();
  due.setUTCDate(due.getUTCDate() + businessDays);
  const iso = due.toISOString();
  patchCheckoutOrder(orderId, {
    clearanceDueAt: iso,
    status: 'awaiting_xtransfer_clearance',
  });
  return iso;
}

/** Script/cron: si ya pasó clearanceDueAt → activa proceso. */
export async function processDueXTransferClearances(now = new Date()): Promise<string[]> {
  const { listCheckoutOrders } = await import('@/lib/payments/order-store');
  const activated: string[] = [];
  for (const o of listCheckoutOrders()) {
    if (o.status !== 'awaiting_xtransfer_clearance' || !o.clearanceDueAt) continue;
    if (new Date(o.clearanceDueAt) <= now) {
      await activateOrderProcess({
        orderId: o.orderId,
        trigger: 'xtransfer_clearance_elapsed',
        note: 'Visto bueno por plazo 3–4 días hábiles',
      });
      activated.push(o.orderId);
    }
  }
  return activated;
}
