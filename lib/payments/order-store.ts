// ============================================================================
// Almacén de órdenes de checkout (proceso cero fricción).
// Memoria de proceso en sandbox; listo para migrar a Supabase.
// ============================================================================

import type { OrderCostBreakdown, CheckoutSegment } from '@/lib/payments/native-checkout';
import type { WorldFirstQrSession } from '@/lib/payments/worldfirst-qr';
import type { ExportLineItem } from '@/lib/payments/export-documents';

export type OrderProcessStatus =
  | 'awaiting_qr_payment'
  | 'awaiting_xtransfer'
  | 'awaiting_xtransfer_clearance'
  | 'payment_confirmed'
  | 'docs_sent'
  | 'logistics_started'
  | 'permits_started'
  | 'fulfilled'
  | 'failed';

export type ProcessTrigger =
  | 'order_confirm'
  | 'qr_api_confirmed'
  | 'xtransfer_voucher_validated'
  | 'xtransfer_clearance_elapsed';

export interface CheckoutOrderRecord {
  orderId: string;
  createdAt: string;
  updatedAt: string;
  segment: CheckoutSegment;
  status: OrderProcessStatus;
  contactEmail: string;
  companyName: string;
  country: string;
  breakdown: OrderCostBreakdown;
  totalUsd: number;
  lines: ExportLineItem[];
  qr?: WorldFirstQrSession | null;
  documentsDispatched: boolean;
  logisticsStarted: boolean;
  permitsStarted: boolean;
  clearanceDueAt?: string | null;
  triggers: Array<{ at: string; trigger: ProcessTrigger; note?: string }>;
}

const g = globalThis as unknown as {
  __nsCheckoutOrders?: Map<string, CheckoutOrderRecord>;
};

function store(): Map<string, CheckoutOrderRecord> {
  if (!g.__nsCheckoutOrders) g.__nsCheckoutOrders = new Map();
  return g.__nsCheckoutOrders;
}

export function saveCheckoutOrder(order: CheckoutOrderRecord): CheckoutOrderRecord {
  store().set(order.orderId, order);
  return order;
}

export function getCheckoutOrder(orderId: string): CheckoutOrderRecord | null {
  return store().get(orderId) ?? null;
}

export function patchCheckoutOrder(
  orderId: string,
  patch: Partial<CheckoutOrderRecord>,
): CheckoutOrderRecord | null {
  const cur = getCheckoutOrder(orderId);
  if (!cur) return null;
  const next: CheckoutOrderRecord = {
    ...cur,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  store().set(orderId, next);
  return next;
}

export function listCheckoutOrders(): CheckoutOrderRecord[] {
  return [...store().values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
