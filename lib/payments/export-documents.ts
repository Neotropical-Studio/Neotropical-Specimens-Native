// ============================================================================
// Automatización documental post-checkout (cero fricción).
// Al confirmar la orden se generan de forma dinámica e inmediata:
//   1) Factura Comercial  2) Packing List  3) Contrato de Exportación / Venta
// y se envían automáticamente al correo del comprador.
// ============================================================================

import type {
  ExportDocumentKind,
  OrderCostBreakdown,
  PermitFeeLine,
} from '@/lib/payments/native-checkout';
import { EXPORT_DOCUMENT_LABEL, PERMIT_FEES_USD } from '@/lib/payments/native-checkout';

export interface CheckoutParty {
  companyName: string;
  contactEmail: string;
  country: string;
  vatId?: string | null;
}

export interface ExportLineItem {
  sku: string;
  title: string;
  quantity: number;
  /** Precio unitario en USD (unidad mayor). */
  unitPriceUsd: number;
  grade?: string | null;
  sex?: string | null;
}

export interface ExportDocumentJob {
  kind: ExportDocumentKind;
  label: string;
  status: 'queued' | 'generated' | 'emailed' | 'failed';
  toEmail: string;
  /** Cuerpo HTML generado dinámicamente desde la orden. */
  html?: string;
  error?: string;
}

export interface PostCheckoutAutomationPlan {
  orderId: string;
  toEmail: string;
  breakdown: OrderCostBreakdown;
  jobs: ExportDocumentJob[];
  /** Siempre true: docs van al confirmar orden (retail QR o XTransfer). */
  dispatchOnOrderConfirm: boolean;
}

export function planExportDocuments(input: {
  orderId: string;
  party: CheckoutParty;
  breakdown: OrderCostBreakdown;
  kinds: ExportDocumentKind[];
  lines: ExportLineItem[];
  locale?: string;
}): PostCheckoutAutomationPlan {
  const toEmail = input.party.contactEmail.trim();
  const generatedAt = new Date().toISOString();

  return {
    orderId: input.orderId,
    toEmail,
    breakdown: input.breakdown,
    dispatchOnOrderConfirm: true,
    jobs: input.kinds.map((kind) => ({
      kind,
      label: EXPORT_DOCUMENT_LABEL[kind],
      status: 'generated' as const,
      toEmail,
      html: renderExportDocumentHtml({
        kind,
        orderId: input.orderId,
        party: input.party,
        breakdown: input.breakdown,
        lines: input.lines,
        generatedAt,
        locale: input.locale ?? 'es',
      }),
    })),
  };
}

function moneyUsd(n: number): string {
  return `USD $${n.toFixed(2)}`;
}

function permitRows(lines?: PermitFeeLine[]): string {
  const rows = (lines ?? []).map(
    (l) =>
      `<tr><td>${l.code}</td><td style="text-align:right">${moneyUsd(l.amountUsd)}</td></tr>`,
  );
  if (!rows.length) {
    return `<tr><td colspan="2" style="color:#666">Sin tarifas de permiso en esta orden</td></tr>`;
  }
  return rows.join('');
}

function lineRows(lines: ExportLineItem[]): string {
  return lines
    .map((l) => {
      const meta = [l.grade, l.sex].filter(Boolean).join(' · ');
      const sub = Math.round(l.unitPriceUsd * l.quantity * 100) / 100;
      return `<tr>
        <td>${escapeHtml(l.sku)}</td>
        <td>${escapeHtml(l.title)}${meta ? `<br/><span style="color:#666;font-size:12px">${escapeHtml(meta)}</span>` : ''}</td>
        <td style="text-align:center">${l.quantity}</td>
        <td style="text-align:right">${moneyUsd(l.unitPriceUsd)}</td>
        <td style="text-align:right">${moneyUsd(sub)}</td>
      </tr>`;
    })
    .join('');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shell(title: string, body: string, orderId: string, generatedAt: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"/><title>${escapeHtml(title)}</title></head>
<body style="font-family:Georgia,serif;color:#111;max-width:720px;margin:0 auto;padding:24px;background:#faf9f6">
  <header style="border-bottom:2px solid #0f3d2e;padding-bottom:12px;margin-bottom:20px">
    <p style="margin:0;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#0f3d2e">Neotropical Specimens Native</p>
    <h1 style="margin:6px 0 0;font-size:22px">${escapeHtml(title)}</h1>
    <p style="margin:8px 0 0;font-size:12px;color:#555">Orden <strong>${escapeHtml(orderId)}</strong> · ${escapeHtml(generatedAt)}</p>
  </header>
  ${body}
  <footer style="margin-top:28px;padding-top:12px;border-top:1px solid #ddd;font-size:11px;color:#666">
    Documento generado automáticamente al confirmar la orden. CITES no es un cobro: marco de tratados de comercio internacional.
    SERFOR ${moneyUsd(PERMIT_FEES_USD.SERFOR)} · SENASA ${moneyUsd(PERMIT_FEES_USD.SENASA)} (si aceptado).
  </footer>
</body>
</html>`;
}

export function renderExportDocumentHtml(input: {
  kind: ExportDocumentKind;
  orderId: string;
  party: CheckoutParty;
  breakdown: OrderCostBreakdown;
  lines: ExportLineItem[];
  generatedAt: string;
  locale?: string;
}): string {
  const { kind, orderId, party, breakdown, lines, generatedAt } = input;
  const total =
    breakdown.specimensUsd + breakdown.permitsUsd + breakdown.shippingUsd;
  const partyBlock = `
    <p style="font-size:14px;line-height:1.5">
      <strong>Cliente / Consignee</strong><br/>
      ${escapeHtml(party.companyName || '—')}<br/>
      ${escapeHtml(party.contactEmail)}<br/>
      País: ${escapeHtml(party.country)}${party.vatId ? `<br/>Tax ID: ${escapeHtml(party.vatId)}` : ''}
    </p>`;

  if (kind === 'commercial_invoice') {
    const body = `
      ${partyBlock}
      <h2 style="font-size:15px;margin:20px 0 8px">Detalle de especímenes</h2>
      <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#0f3d2e;color:#fff">
            <th align="left">SKU</th><th align="left">Descripción</th><th>Cant.</th><th align="right">Unitario</th><th align="right">Subtotal</th>
          </tr>
        </thead>
        <tbody>${lineRows(lines)}</tbody>
      </table>
      <h2 style="font-size:15px;margin:20px 0 8px">Permisos de exportación</h2>
      <table width="100%" cellpadding="6" cellspacing="0" style="font-size:13px">${permitRows(breakdown.permitLines)}</table>
      <table width="100%" style="margin-top:16px;font-size:14px">
        <tr><td>Especímenes</td><td align="right">${moneyUsd(breakdown.specimensUsd)}</td></tr>
        <tr><td>Permisos</td><td align="right">${moneyUsd(breakdown.permitsUsd)}</td></tr>
        <tr><td>Envío</td><td align="right">${moneyUsd(breakdown.shippingUsd)}</td></tr>
        <tr style="font-weight:bold;font-size:16px;border-top:2px solid #0f3d2e">
          <td style="padding-top:8px">Total</td>
          <td align="right" style="padding-top:8px">${moneyUsd(Math.round(total * 100) / 100)}</td>
        </tr>
      </table>`;
    return shell(EXPORT_DOCUMENT_LABEL.commercial_invoice, body, orderId, generatedAt);
  }

  if (kind === 'packing_list') {
    const body = `
      ${partyBlock}
      <p style="font-size:13px;color:#444">Lista de empaque generada dinámicamente desde el carrito. Embalaje entomológico / preservación según ficha.</p>
      <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#0f3d2e;color:#fff">
            <th align="left">SKU</th><th align="left">Ítem</th><th>Cant.</th><th align="right">Valor declarado (unit.)</th><th align="right">Valor línea</th>
          </tr>
        </thead>
        <tbody>${lineRows(lines)}</tbody>
      </table>
      <p style="margin-top:16px;font-size:13px"><strong>Peso / dimensiones:</strong> se completan al despacho courier (EasyPost / Easy Courier).</p>
      <p style="font-size:13px"><strong>Valor total declarado:</strong> ${moneyUsd(breakdown.specimensUsd)}</p>`;
    return shell(EXPORT_DOCUMENT_LABEL.packing_list, body, orderId, generatedAt);
  }

  // export_sale_contract
  const body = `
    ${partyBlock}
    <p style="font-size:14px;line-height:1.6">
      Contrato de exportación / venta pre-firmado por <strong>Neotropical Specimens Native</strong>
      (vendedor / exportador, Perú). El comprador acepta condiciones al confirmar la orden en checkout.
    </p>
    <ol style="font-size:13px;line-height:1.55;color:#222">
      <li>Objeto: especímenes listados en la Factura Comercial ${escapeHtml(orderId)}.</li>
      <li>Precio total: ${moneyUsd(Math.round(total * 100) / 100)} (especímenes + permisos aplicables + envío).</li>
      <li>Pago retail: WorldFirst Checkout con QR Alipay / WeChat Pay. Mayorista: XTransfer B2B.</li>
      <li>Documentos: Factura, Packing List y este contrato se envían automáticamente al correo del comprador al confirmar la orden.</li>
      <li>Trámites SERFOR / SENASA / aduanas: los absorbe el exportador tras acreditación de fondos (CITES = marco de tratados, no fee).</li>
      <li>Ley aplicable: República del Perú · comercio internacional de especímenes No-CITES según ficha.</li>
    </ol>
    <p style="margin-top:24px;font-size:13px">
      <strong>Firma digital del vendedor (pre-firmado):</strong> Neotropical Specimens Native<br/>
      <span style="color:#666">Fecha: ${escapeHtml(generatedAt.slice(0, 10))}</span>
    </p>
    <p style="font-size:13px;margin-top:12px">
      <strong>Aceptación del comprador:</strong> confirmación de checkout + correo ${escapeHtml(party.contactEmail)}
    </p>`;
  return shell(EXPORT_DOCUMENT_LABEL.export_sale_contract, body, orderId, generatedAt);
}

/** Asunto de correo por documento (dinámico por orden). */
export function exportDocEmailSubject(kind: ExportDocumentKind, orderId: string): string {
  return `${EXPORT_DOCUMENT_LABEL[kind]} — Orden ${orderId} · Neotropical Specimens`;
}
