// ============================================================================
// Especificación de Pasarela y Automatización de Exportación
// Checkout Global B2B / Retail — SOLO stack nativo:
//   WorldFirst (checkout) → QR Alipay / WeChat Pay
//   XTransfer (B2B alto valor)
// Nunca Stripe / PayPal / Mercado Pago / similares.
//
// Retail: el cliente paga escaneando QR Alipay o WeChat emitido vía WorldFirst.
// Mayorista: XTransfer (transferencia B2B, 3–4 días hábiles).
// ============================================================================

export type CheckoutSegment = 'retail_fast' | 'wholesale_high';

/**
 * Retail: WorldFirst emite el QR; el comprador paga con Alipay o WeChat Pay.
 * wholesale: XTransfer B2B (sin QR retail).
 */
export type RetailPayMethod = 'alipay_qr' | 'wechat_qr';
export type WholesaleGateway = 'xtransfer';
export type NativeCheckoutGateway = 'worldfirst' | RetailPayMethod | WholesaleGateway;

/** Cómo se presenta el cobro al cliente. */
export type RetailCheckoutChannel = {
  rail: 'worldfirst';
  qrMethods: RetailPayMethod[];
};

/** Límites en USD (unidad mayor, no céntimos). */
export const CHECKOUT_THRESHOLDS_USD = {
  /** Mínimo operativo e-commerce rápido. */
  retailMin: 100,
  /** Tope retail / inicio mayorista XTransfer (inclusive en mayorista). */
  retailMaxExclusive: 5_000,
  /** Tope absoluto mayorista / alta gama. */
  wholesaleMax: 2_000_000,
} as const;

export interface OrderCostBreakdown {
  /** Subtotal especímenes (USD). */
  specimensUsd: number;
  /** Tarifas de permisos de exportación SERFOR/SENASA (USD). CITES no cobra. */
  permitsUsd: number;
  /** Detalle SERFOR / SENASA únicamente (nunca CITES como fee). */
  permitLines?: PermitFeeLine[];
  /** Envío global a destino (USD). */
  shippingUsd: number;
  /** Seguro opcional (Insurtech Digital / Global Lloyd). $0 si no hay check. */
  insuranceUsd?: number;
  insuranceId?: string | null;
}

/** Tarifas cobrables de exportación (USD). CITES no entra: solo diccionario de tratados. */
export const PERMIT_FEES_USD = {
  SERFOR: 100,
  SENASA: 80,
} as const;

export type PermitFeeCode = keyof typeof PERMIT_FEES_USD;

export interface PermitFeeLine {
  code: PermitFeeCode;
  amountUsd: number;
}

/** SERFOR ($100) suele ir en exportación; SENASA ($80) es opcional (checkbox). */
export function buildPermitLines(opts: {
  includeSerfor?: boolean;
  includeSenasa?: boolean;
}): PermitFeeLine[] {
  const lines: PermitFeeLine[] = [];
  if (opts.includeSerfor !== false) {
    lines.push({ code: 'SERFOR', amountUsd: PERMIT_FEES_USD.SERFOR });
  }
  if (opts.includeSenasa) {
    lines.push({ code: 'SENASA', amountUsd: PERMIT_FEES_USD.SENASA });
  }
  return lines;
}

/** @deprecated Prefer buildPermitLines({ includeSerfor, includeSenasa }). */
export function defaultExportPermitLines(): PermitFeeLine[] {
  return buildPermitLines({ includeSerfor: true, includeSenasa: true });
}

export function sumPermitFeesUsd(lines: PermitFeeLine[] = defaultExportPermitLines()): number {
  return Math.round(lines.reduce((n, l) => n + l.amountUsd, 0) * 100) / 100;
}

export function buildOrderBreakdown(input: {
  specimensUsd: number;
  shippingUsd?: number;
  /** SERFOR $100 — solo si el cliente acepta el checkbox. */
  includeSerfor?: boolean;
  /** SENASA $80 — solo si el cliente acepta el checkbox. */
  includeSenasa?: boolean;
  /** Prima de seguro opcional (USD). */
  insuranceUsd?: number;
  insuranceId?: string | null;
  /** @deprecated Usar includeSerfor/includeSenasa. */
  includeExportPermits?: boolean;
}): OrderCostBreakdown {
  const includeSerfor =
    input.includeSerfor ?? (input.includeExportPermits !== false ? true : false);
  const includeSenasa =
    input.includeSenasa ?? (input.includeExportPermits === true ? true : false);
  const permitLines = buildPermitLines({ includeSerfor, includeSenasa });
  return {
    specimensUsd: Math.round((input.specimensUsd || 0) * 100) / 100,
    permitLines,
    permitsUsd: sumPermitFeesUsd(permitLines),
    shippingUsd: Math.round((input.shippingUsd || 0) * 100) / 100,
    insuranceUsd: Math.round((input.insuranceUsd || 0) * 100) / 100,
    insuranceId: input.insuranceId ?? null,
  };
}

export interface CheckoutRoute {
  segment: CheckoutSegment;
  /** Total USD redondeado a 2 decimales. */
  totalUsd: number;
  breakdown: OrderCostBreakdown;
  /** Pasarelas ofrecidas en este tramo. */
  gateways: NativeCheckoutGateway[];
  /** Pasarela sugerida por defecto. */
  preferredGateway: NativeCheckoutGateway;
  validation: {
    mode: 'instant_api' | 'xtransfer_settlement';
    /** Días hábiles de acreditación (solo XTransfer). */
    businessDays?: { min: number; max: number };
    label: string;
  };
  documents: {
    /** Se envían al confirmar la orden (antes o al instante del pago). */
    onOrderConfirm: ExportDocumentKind[];
    /** Se liberan tras pago acreditado. */
    afterFundsCleared: ExportDocumentKind[];
  };
  logistics: {
    /** Envío físico / inicio de trámites de exportación. */
    trigger: 'post_payment_instant' | 'post_xtransfer_clearance';
    label: string;
  };
}

export type ExportDocumentKind =
  | 'commercial_invoice'
  | 'packing_list'
  | 'export_sale_contract';

export const EXPORT_DOCUMENT_LABEL: Record<ExportDocumentKind, string> = {
  commercial_invoice: 'Factura Comercial (Commercial Invoice)',
  packing_list: 'Packing List',
  export_sale_contract: 'Contrato de Exportación / Venta Pre-firmado',
};

export const GATEWAY_DISPLAY: Record<NativeCheckoutGateway, string> = {
  worldfirst: 'WorldFirst Checkout',
  alipay_qr: 'Alipay QR (vía WorldFirst)',
  wechat_qr: 'WeChat Pay QR (vía WorldFirst)',
  xtransfer: 'XTransfer (Transferencia B2B local)',
};

/** Retail: un solo riel WorldFirst; el QR es Alipay o WeChat. */
export const WORLDFIRST_QR_METHODS: RetailPayMethod[] = ['alipay_qr', 'wechat_qr'];

export const RETAIL_CHECKOUT: RetailCheckoutChannel = {
  rail: 'worldfirst',
  qrMethods: WORLDFIRST_QR_METHODS,
};

export function sumOrderUsd(breakdown: OrderCostBreakdown): number {
  const total =
    (breakdown.specimensUsd || 0) +
    (breakdown.permitsUsd || 0) +
    (breakdown.shippingUsd || 0) +
    (breakdown.insuranceUsd || 0);
  return Math.round(total * 100) / 100;
}

/**
 * Segmenta el checkout por monto total USD.
 * - $100 – <$5,000 → WorldFirst Checkout → QR Alipay / WeChat Pay
 * - $5,000 – $2,000,000 → XTransfer B2B (3–4 días hábiles)
 */
export function routeCheckoutByAmount(breakdown: OrderCostBreakdown): CheckoutRoute {
  const totalUsd = sumOrderUsd(breakdown);
  const { retailMaxExclusive, wholesaleMax } = CHECKOUT_THRESHOLDS_USD;

  if (totalUsd < retailMaxExclusive) {
    return buildRetailRoute(totalUsd, breakdown);
  }

  if (totalUsd <= wholesaleMax) {
    return buildWholesaleRoute(totalUsd, breakdown);
  }

  return buildWholesaleRoute(totalUsd, breakdown);
}

function buildRetailRoute(totalUsd: number, breakdown: OrderCostBreakdown): CheckoutRoute {
  return {
    segment: 'retail_fast',
    totalUsd,
    breakdown,
    gateways: ['worldfirst', ...WORLDFIRST_QR_METHODS],
    preferredGateway: 'worldfirst',
    validation: {
      mode: 'instant_api',
      label: 'Inmediata vía WorldFirst (QR Alipay / WeChat Pay)',
    },
    documents: {
      onOrderConfirm: ['commercial_invoice', 'packing_list', 'export_sale_contract'],
      afterFundsCleared: [],
    },
    logistics: {
      trigger: 'post_payment_instant',
      label: 'Envío inmediato post-pago (confirmación WorldFirst QR)',
    },
  };
}

function buildWholesaleRoute(totalUsd: number, breakdown: OrderCostBreakdown): CheckoutRoute {
  return {
    segment: 'wholesale_high',
    totalUsd,
    breakdown,
    gateways: ['xtransfer'],
    preferredGateway: 'xtransfer',
    validation: {
      mode: 'xtransfer_settlement',
      businessDays: { min: 3, max: 4 },
      label: '3 a 4 días hábiles (Visto bueno XTransfer)',
    },
    documents: {
      // Docs pre-firmados al confirmar orden (cero fricción).
      onOrderConfirm: ['commercial_invoice', 'packing_list', 'export_sale_contract'],
      afterFundsCleared: [],
    },
    logistics: {
      trigger: 'post_xtransfer_clearance',
      label:
        'Trámites de exportación (SERFOR / SENASA / aduanas; CITES solo como marco de tratados) solo tras acreditación XTransfer o voucher validado',
    },
  };
}

/** Pasos operativos XTransfer (alto valor). */
export type XTransferProtocolStep =
  | 'order_and_docs'
  | 'voucher_or_wait_clearance'
  | 'export_permits_execution';

export const XTRANSFER_PROTOCOL: Array<{
  step: XTransferProtocolStep;
  title: string;
  description: string;
}> = [
  {
    step: 'order_and_docs',
    title: 'Orden y recepción de documentos',
    description:
      'El sistema calcula la orden (especímenes + permisos + envío) y despacha al correo corporativo la factura, packing list y contrato pre-firmado.',
  },
  {
    step: 'voucher_or_wait_clearance',
    title: 'Subida de voucher o espera de confirmación XTransfer',
    description:
      'El cliente transfiere por XTransfer y sube el comprobante, o se aguardan 3–4 días hábiles hasta el Visto Bueno oficial de fondos acreditados.',
  },
  {
    step: 'export_permits_execution',
    title: 'Ejecución de trámites documentarios de exportación',
    description:
      'Con fondos confirmados, la empresa inicia trámites SERFOR/SENASA y aduanas (CITES es solo el diccionario de tratados de comercio, no un cobro). Zero friction: la complejidad burocrática la absorbe la empresa.',
  },
];

/**
 * Convierte un total cotizado en céntimos de una divisa a USD aproximado.
 * Mientras no haya FX live, se asume 1:1 si currency=USD; si no, el caller
 * debe pasar ya el breakdown en USD.
 */
export function centsToUsd(cents: number, currency: string, fxToUsd = 1): number {
  const major = cents / 100;
  if (currency.toUpperCase() === 'USD') return Math.round(major * 100) / 100;
  return Math.round(major * fxToUsd * 100) / 100;
}
