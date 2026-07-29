// ============================================================================
// Protocolo de evidencia al despachar mercancía CON seguro aceptado.
// Cero burocracia para el cliente: la empresa documenta el envío.
//
// Al enviar el paquete asegurado se registra:
//   1) Fotos del embalaje / contenido
//   2) Video (si es posible) de cómo va el paquete
//   3) Código QR de trazabilidad en el bulto
//   4) Documentación completa (factura, packing list, contrato, guías)
// ============================================================================

export type ShippingEvidenceKind =
  | 'pack_photos'
  | 'pack_video'
  | 'shipment_qr'
  | 'commercial_invoice'
  | 'packing_list'
  | 'export_sale_contract'
  | 'courier_label'
  | 'insurance_certificate';

export interface ShippingEvidenceStep {
  kind: ShippingEvidenceKind;
  required: boolean;
  /** true = ideal / si es posible (ej. video). */
  ifPossible?: boolean;
  title: string;
  description: string;
}

/** Pasos que ejecuta la empresa al despachar si el cliente aceptó seguro. */
export const INSURED_SHIPMENT_EVIDENCE: ShippingEvidenceStep[] = [
  {
    kind: 'pack_photos',
    required: true,
    title: 'Fotos del paquete',
    description:
      'Registro fotográfico del embalaje y del espécimen antes/durante el cierre del bulto.',
  },
  {
    kind: 'pack_video',
    required: false,
    ifPossible: true,
    title: 'Video del empaque (si es posible)',
    description:
      'Clip corto de cómo va el paquete (cierre, sellado, etiqueta). Opcional pero recomendado.',
  },
  {
    kind: 'shipment_qr',
    required: true,
    title: 'QR de trazabilidad',
    description:
      'Código QR pegado/codificado en el envío: tracking + vínculo a la orden asegurada.',
  },
  {
    kind: 'commercial_invoice',
    required: true,
    title: 'Factura Comercial',
    description: 'Va con el resto del expediente documental del despacho.',
  },
  {
    kind: 'packing_list',
    required: true,
    title: 'Packing List',
    description: 'Lista de empaque incluida en el despacho.',
  },
  {
    kind: 'export_sale_contract',
    required: true,
    title: 'Contrato de Exportación / Venta',
    description: 'Contrato pre-firmado del expediente.',
  },
  {
    kind: 'courier_label',
    required: true,
    title: 'Guía / etiqueta courier',
    description: 'Etiqueta Serpost / Exportafacil / EMS / FedEx / DHL / Aramex.',
  },
  {
    kind: 'insurance_certificate',
    required: true,
    title: 'Constancia de seguro (reposición)',
    description:
      'Referencia Insurtech Digital o Global Lloyd Venta Infinita ligada a la orden y al QR.',
  },
];

export type InsuredDispatchPlan = {
  enabled: boolean;
  zeroBureaucracyForClient: true;
  purpose: 'reposicion';
  steps: ShippingEvidenceStep[];
  summary: string;
};

/**
 * Si el cliente aceptó seguro (check), al enviar la mercancía se activa
 * el protocolo de evidencia + QR + docs completos.
 */
export function planInsuredShipmentEvidence(hasInsurance: boolean): InsuredDispatchPlan {
  if (!hasInsurance) {
    return {
      enabled: false,
      zeroBureaucracyForClient: true,
      purpose: 'reposicion',
      steps: [],
      summary: 'Sin seguro: no se activa protocolo de evidencia de reposición.',
    };
  }
  return {
    enabled: true,
    zeroBureaucracyForClient: true,
    purpose: 'reposicion',
    steps: INSURED_SHIPMENT_EVIDENCE,
    summary:
      'Seguro aceptado (porcentaje bajo). Al enviar: fotos + video si es posible + QR en el paquete + documentación completa. Cero burocracia para el cliente; la empresa documenta y gestiona reposición.',
  };
}
