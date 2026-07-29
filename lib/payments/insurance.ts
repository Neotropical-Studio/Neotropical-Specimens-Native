// ============================================================================
// Seguros opcionales — CERO burocracia para el cliente.
// Solo un check en el carrito. Sin formularios ni papeles.
//
// Cobertura = reposición del espécimen / valor declarado.
// Si acepta (prima % baja): al enviar la mercancía la empresa toma
// fotos + video (si es posible) de cómo va el paquete, lo codifica con QR
// y adjunta el resto del expediente documental completo.
// Sin check → $0 en el resumen.
// ============================================================================

import { planInsuredShipmentEvidence } from '@/lib/shipping/insured-evidence';
import { buildTrackingUrl, generateQrPngBuffer } from '@/lib/qr/generate';

export type InsuranceOptionId =
  | 'insurtech_digital_1k'
  | 'insurtech_digital_5k'
  | 'global_lloyd_venta_infinita';

export interface InsuranceOption {
  id: InsuranceOptionId;
  provider: string;
  label: string;
  coverageMinUsd: number;
  coverageMaxUsd: number;
  premiumRate: number;
  description: string;
  benefit: string;
}

export const INSURANCE_OPTIONS: InsuranceOption[] = [
  {
    id: 'insurtech_digital_1k',
    provider: 'Insurtech Digital',
    label: 'Insurtech Digital · hasta $1,000',
    coverageMinUsd: 1,
    coverageMaxUsd: 1_000,
    premiumRate: 0.03,
    description: 'Check opcional. Cobertura $1–$1,000 USD. Prima % baja.',
    benefit:
      'Reposición si hay pérdida/daño. Al enviar: fotos + video (si es posible) + QR en el paquete + docs completos. Cero burocracia: nosotros lo hacemos.',
  },
  {
    id: 'insurtech_digital_5k',
    provider: 'Insurtech Digital',
    label: 'Insurtech Digital · hasta $5,000',
    coverageMinUsd: 1,
    coverageMaxUsd: 5_000,
    premiumRate: 0.025,
    description: 'Check opcional. Cobertura hasta $5,000 USD. Prima % baja.',
    benefit:
      'Reposición si hay pérdida/daño. Al enviar: fotos + video (si es posible) + QR en el paquete + docs completos. Cero burocracia: nosotros lo hacemos.',
  },
  {
    id: 'global_lloyd_venta_infinita',
    provider: 'Global Lloyd',
    label: 'Global Lloyd · Venta Infinita',
    coverageMinUsd: 5_000,
    coverageMaxUsd: 199_999,
    premiumRate: 0.02,
    description: 'Check opcional. Cobertura $5,000–$199,999 USD. Prima % baja.',
    benefit:
      'Reposición Venta Infinita. Al enviar: fotos + video (si es posible) + QR + expediente completo. Cero burocracia para el cliente.',
  },
];

export function getInsuranceOption(id: InsuranceOptionId | null | undefined): InsuranceOption | null {
  if (!id) return null;
  return INSURANCE_OPTIONS.find((o) => o.id === id) ?? null;
}

export function isInsuranceEligible(
  option: InsuranceOption,
  orderValueUsd: number,
): boolean {
  const v = Math.max(0, orderValueUsd);
  if (option.id === 'global_lloyd_venta_infinita') {
    return v >= 5_000 && v <= 199_999;
  }
  if (option.id === 'insurtech_digital_1k') {
    return v >= 1 && v <= 1_000;
  }
  if (option.id === 'insurtech_digital_5k') {
    return v >= 1 && v <= 5_000;
  }
  return false;
}

export function listEligibleInsurance(orderValueUsd: number): InsuranceOption[] {
  return INSURANCE_OPTIONS.filter((o) => isInsuranceEligible(o, orderValueUsd));
}

export function insuredValueUsd(option: InsuranceOption, orderValueUsd: number): number {
  return Math.min(Math.max(0, orderValueUsd), option.coverageMaxUsd);
}

export function insurancePremiumUsd(
  option: InsuranceOption | null,
  orderValueUsd: number,
): number {
  if (!option) return 0;
  if (!isInsuranceEligible(option, orderValueUsd)) return 0;
  const base = insuredValueUsd(option, orderValueUsd);
  return Math.round(base * option.premiumRate * 100) / 100;
}

export type InsuredPackEvidence = {
  orderId: string;
  trackingUrl: string;
  qrDataUrl: string;
  plan: ReturnType<typeof planInsuredShipmentEvidence>;
};

/** QR de paquete + protocolo de evidencia (fotos/video/docs) si hay seguro. */
export async function buildInsuredPackEvidence(orderId: string): Promise<InsuredPackEvidence> {
  const shipmentCode = `NS-SHIP-${orderId}`;
  const trackingUrl = buildTrackingUrl(shipmentCode);
  const buf = await generateQrPngBuffer(trackingUrl);
  const qrDataUrl = `data:image/png;base64,${buf.toString('base64')}`;
  return {
    orderId,
    trackingUrl,
    qrDataUrl,
    plan: planInsuredShipmentEvidence(true),
  };
}
