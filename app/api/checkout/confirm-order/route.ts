import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  buildOrderBreakdown,
  routeCheckoutByAmount,
  type ExportDocumentKind,
} from '@/lib/payments/native-checkout';
import { planExportDocuments } from '@/lib/payments/export-documents';
import { dispatchExportDocuments } from '@/lib/payments/export-email';
import { createWorldFirstQrSession, type QrPayMethod } from '@/lib/payments/worldfirst-qr';
import { saveCheckoutOrder } from '@/lib/payments/order-store';
import { estimateShippingUsdForCarrier } from '@/lib/shipping/estimate';
import { getCarrier } from '@/lib/shipping/couriers';
import { buildInsuredPackEvidence, getInsuranceOption } from '@/lib/payments/insurance';
import { planInsuredShipmentEvidence } from '@/lib/shipping/insured-evidence';

export const runtime = 'nodejs';

const LineSchema = z.object({
  sku: z.string().min(1),
  title: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPriceUsd: z.number().nonnegative(),
  grade: z.string().nullable().optional(),
  sex: z.string().nullable().optional(),
});

const BodySchema = z.object({
  contactEmail: z.string().email(),
  companyName: z.string().optional().default(''),
  country: z.string().min(2).max(2),
  vatId: z.string().nullable().optional(),
  specimensUsd: z.number().nonnegative(),
  shippingUsd: z.number().nonnegative().optional(),
  carrierId: z
    .enum(['serpost', 'exportafacil', 'ems_internacional', 'fedex', 'dhl', 'aramex'])
    .optional()
    .default('serpost'),
  includeSerfor: z.boolean().optional().default(false),
  includeSenasa: z.boolean().optional().default(false),
  insuranceId: z
    .enum(['insurtech_digital_1k', 'insurtech_digital_5k', 'global_lloyd_venta_infinita'])
    .nullable()
    .optional()
    .default(null),
  insuranceUsd: z.number().nonnegative().optional().default(0),
  qrMethod: z.enum(['alipay_qr', 'wechat_qr']).optional().default('alipay_qr'),
  lines: z.array(LineSchema).min(1),
  locale: z.string().optional().default('es'),
});

function newOrderId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `NS-${ts}-${rnd}`;
}

/**
 * Confirma compra:
 * - Retail $100–$5k → QR WorldFirst (Alipay / WeChat) + docs al correo
 * - Mayorista → XTransfer + docs + plazo 3–4 días
 * - Agrupa permisos + shipping en el breakdown
 */
export async function POST(req: Request) {
  try {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'validation', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const country = body.country.toUpperCase();
  const carrier = getCarrier(body.carrierId);
  const shippingUsd =
    body.shippingUsd != null && body.shippingUsd > 0
      ? body.shippingUsd
      : estimateShippingUsdForCarrier(body.carrierId, country);

  const breakdown = buildOrderBreakdown({
    specimensUsd: body.specimensUsd,
    shippingUsd,
    includeSerfor: body.includeSerfor,
    includeSenasa: body.includeSenasa,
    insuranceUsd: body.insuranceId ? body.insuranceUsd : 0,
    insuranceId: body.insuranceId,
  });
  const route = routeCheckoutByAmount(breakdown);
  const orderId = newOrderId();
  const now = new Date().toISOString();

  const evidencePlan = planInsuredShipmentEvidence(Boolean(body.insuranceId));
  const packEvidence =
    body.insuranceId != null ? await buildInsuredPackEvidence(orderId) : null;

  const kinds: ExportDocumentKind[] = route.documents.onOrderConfirm;
  const plan = planExportDocuments({
    orderId,
    party: {
      companyName: body.companyName || body.contactEmail.split('@')[0] || 'Cliente',
      contactEmail: body.contactEmail,
      country,
      vatId: body.vatId,
    },
    breakdown,
    kinds,
    lines: body.lines,
    locale: body.locale,
  });

  // Despacho documental inmediato al correo corporativo.
  const dispatch = await dispatchExportDocuments(plan);

  let qr = null as Awaited<ReturnType<typeof createWorldFirstQrSession>>;
  let clearanceDueAt: string | null = null;
  let initialStatus: 'awaiting_qr_payment' | 'awaiting_xtransfer' =
    route.segment === 'retail_fast' ? 'awaiting_qr_payment' : 'awaiting_xtransfer';

  if (route.segment === 'retail_fast') {
    qr = await createWorldFirstQrSession({
      orderId,
      amountUsd: route.totalUsd,
      method: body.qrMethod as QrPayMethod,
    });
  } else {
    const due = new Date();
    due.setUTCDate(due.getUTCDate() + 4);
    clearanceDueAt = due.toISOString();
    initialStatus = 'awaiting_xtransfer';
  }

  saveCheckoutOrder({
    orderId,
    createdAt: now,
    updatedAt: now,
    segment: route.segment,
    status: route.segment === 'wholesale_high' ? 'awaiting_xtransfer_clearance' : initialStatus,
    contactEmail: body.contactEmail,
    companyName: body.companyName || body.contactEmail.split('@')[0] || 'Cliente',
    country,
    breakdown,
    totalUsd: route.totalUsd,
    lines: body.lines,
    qr,
    documentsDispatched: true,
    logisticsStarted: false,
    permitsStarted: false,
    clearanceDueAt,
    triggers: [
      {
        at: now,
        trigger: 'order_confirm',
        note: `Checkout confirmado · courier ${carrier?.label ?? body.carrierId}`,
      },
    ],
  });

  return NextResponse.json({
    ok: true,
    orderId,
    segment: route.segment,
    preferredGateway: route.preferredGateway,
    paymentHint:
      route.segment === 'retail_fast' ? 'worldfirst_alipay_wechat_qr' : 'xtransfer_b2b',
    totalUsd: route.totalUsd,
    carrier: {
      id: body.carrierId,
      label: carrier?.label ?? body.carrierId,
      legalName: carrier?.legalName ?? body.carrierId,
      tier: carrier?.tier ?? 'standard',
    },
    breakdown: {
      specimensUsd: breakdown.specimensUsd,
      permitsUsd: breakdown.permitsUsd,
      permitLines: breakdown.permitLines,
      shippingUsd: breakdown.shippingUsd,
      insuranceUsd: breakdown.insuranceUsd ?? 0,
      insuranceId: breakdown.insuranceId ?? null,
      insuranceLabel: body.insuranceId
        ? getInsuranceOption(body.insuranceId)?.label ?? body.insuranceId
        : null,
    },
    /** Si aceptó seguro: evidencia al despachar (fotos/video/QR/docs). */
    insuredShipment: evidencePlan.enabled
      ? {
          zeroBureaucracy: true,
          purpose: 'reposicion',
          summary: evidencePlan.summary,
          steps: evidencePlan.steps.map((s) => ({
            kind: s.kind,
            title: s.title,
            required: s.required,
            ifPossible: s.ifPossible ?? false,
          })),
          packQr: packEvidence
            ? {
                trackingUrl: packEvidence.trackingUrl,
                qrDataUrl: packEvidence.qrDataUrl,
              }
            : null,
        }
      : null,
    qr: qr
      ? {
          rail: qr.rail,
          method: qr.method,
          amountUsd: qr.amountUsd,
          qrDataUrl: qr.qrDataUrl,
          payload: qr.payload,
          statusUrl: qr.statusUrl,
          expiresAt: qr.expiresAt,
          sandbox: qr.sandbox,
        }
      : null,
    xtransfer: route.segment === 'wholesale_high'
      ? {
          businessDays: { min: 3, max: 4 },
          clearanceDueAt,
          instructions:
            'Transfiera vía XTransfer y suba el voucher, o aguarde el visto bueno automático en 3–4 días hábiles.',
        }
      : null,
    documents: {
      dryRun: dispatch.dryRun,
      provider: dispatch.provider,
      message: dispatch.message,
      jobs: dispatch.plan.jobs.map(({ kind, label, status, toEmail, error }) => ({
        kind,
        label,
        status,
        toEmail,
        error: error ?? null,
      })),
    },
    process: {
      zeroFriction: true,
      next:
        route.segment === 'retail_fast'
          ? 'Escanee el QR (Alipay / WeChat vía WorldFirst). Al confirmar la API, se activan courier + permisos.'
          : 'XTransfer: voucher o plazo 3–4 días → courier + permisos.',
    },
  });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
