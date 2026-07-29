// ============================================================================
// Sesión de pago nativo + QR WorldFirst → Alipay / WeChat.
// Sandbox: genera QR escaneable con payload de orden (sin SDK live).
// Producción: sustituir createWorldFirstQrSession por llamada API WorldFirst.
// ============================================================================

import QRCode from 'qrcode';
import type { RetailPayMethod } from '@/lib/payments/native-checkout';
import { CHECKOUT_THRESHOLDS_USD } from '@/lib/payments/native-checkout';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export type QrPayMethod = RetailPayMethod; // 'alipay_qr' | 'wechat_qr'

export interface WorldFirstQrSession {
  orderId: string;
  rail: 'worldfirst';
  method: QrPayMethod;
  amountUsd: number;
  currency: 'USD';
  /** Payload que codifica el QR (URI de pago / deep link sandbox). */
  payload: string;
  /** Data URL PNG listo para <img src=…>. */
  qrDataUrl: string;
  /** URL de estado de pago (poll / página de espera). */
  statusUrl: string;
  expiresAt: string;
  sandbox: boolean;
}

/** URI de pago escaneable. Con API live, WorldFirst devolvería el string oficial. */
export function buildSandboxPaymentPayload(input: {
  orderId: string;
  amountUsd: number;
  method: QrPayMethod;
}): string {
  const method = input.method === 'wechat_qr' ? 'wechat' : 'alipay';
  const u = new URL(`${SITE_URL}/api/checkout/pay-intent`);
  u.searchParams.set('orderId', input.orderId);
  u.searchParams.set('amount', input.amountUsd.toFixed(2));
  u.searchParams.set('rail', 'worldfirst');
  u.searchParams.set('method', method);
  return u.toString();
}

export async function generatePaymentQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 360,
    color: { dark: '#0f3d2e', light: '#ffffff' },
  });
}

/**
 * Crea sesión QR para retail $100–$5,000 USD.
 * Si hay WORLDFIRST_CLIENT_ID se marca como listo para API; hoy emite QR sandbox.
 */
export async function createWorldFirstQrSession(input: {
  orderId: string;
  amountUsd: number;
  method: QrPayMethod;
}): Promise<WorldFirstQrSession | null> {
  const { retailMin, retailMaxExclusive } = CHECKOUT_THRESHOLDS_USD;
  if (input.amountUsd < retailMin || input.amountUsd >= retailMaxExclusive) {
    return null;
  }

  const liveConfigured = Boolean(process.env.WORLDFIRST_CLIENT_ID?.trim());
  // TODO: cuando existan credenciales, llamar API WorldFirst y usar su qrCode.
  const payload = buildSandboxPaymentPayload(input);
  const qrDataUrl = await generatePaymentQrDataUrl(payload);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  return {
    orderId: input.orderId,
    rail: 'worldfirst',
    method: input.method,
    amountUsd: input.amountUsd,
    currency: 'USD',
    payload,
    qrDataUrl,
    statusUrl: `${SITE_URL}/api/checkout/orders/${encodeURIComponent(input.orderId)}`,
    expiresAt,
    sandbox: !liveConfigured,
  };
}
