// ============================================================================
// Checkout dinámico B2B / B2C — cero hardcodeo estructural.
// Los campos, cuerpos y modos viven en config; CartView solo renderiza.
// ============================================================================

export type BuyerKind = 'individual' | 'company';
export type CommerceMode = 'b2c' | 'b2b' | 'ecommerce';

export type AddressFieldId =
  | 'fullName'
  | 'companyName'
  | 'taxId'
  | 'email'
  | 'phone'
  | 'street1'
  | 'street2'
  | 'city'
  | 'state'
  | 'postalCode'
  | 'country';

export interface AddressFieldDef {
  id: AddressFieldId;
  labelKey: string;
  labelFallback: string;
  type: 'text' | 'email' | 'tel';
  required: boolean;
  /** Si se omite, aplica a ambos. */
  forBuyer?: BuyerKind[];
  placeholder?: string;
  autoComplete?: string;
}

/** Campos dinámicos del destinatario (individuo o empresa). */
export const SHIP_TO_FIELDS: AddressFieldDef[] = [
  {
    id: 'fullName',
    labelKey: 'cart.ship_full_name',
    labelFallback: 'Nombre completo / contacto',
    type: 'text',
    required: true,
    autoComplete: 'name',
  },
  {
    id: 'companyName',
    labelKey: 'cart.ship_company',
    labelFallback: 'Razón social / empresa',
    type: 'text',
    required: true,
    forBuyer: ['company'],
    autoComplete: 'organization',
  },
  {
    id: 'taxId',
    labelKey: 'cart.ship_tax_id',
    labelFallback: 'Tax ID / RUC / VAT',
    type: 'text',
    required: false,
    forBuyer: ['company'],
    placeholder: 'RUC / VAT / EIN',
  },
  {
    id: 'email',
    labelKey: 'cart.ship_email',
    labelFallback: 'Correo electrónico',
    type: 'email',
    required: true,
    autoComplete: 'email',
    placeholder: 'compras@empresa.com',
  },
  {
    id: 'phone',
    labelKey: 'cart.ship_phone',
    labelFallback: 'Teléfono',
    type: 'tel',
    required: true,
    autoComplete: 'tel',
  },
  {
    id: 'street1',
    labelKey: 'cart.ship_street1',
    labelFallback: 'Dirección (calle / número)',
    type: 'text',
    required: true,
    autoComplete: 'address-line1',
  },
  {
    id: 'street2',
    labelKey: 'cart.ship_street2',
    labelFallback: 'Complemento (apto / oficina)',
    type: 'text',
    required: false,
    autoComplete: 'address-line2',
  },
  {
    id: 'city',
    labelKey: 'cart.ship_city',
    labelFallback: 'Ciudad',
    type: 'text',
    required: true,
    autoComplete: 'address-level2',
  },
  {
    id: 'state',
    labelKey: 'cart.ship_state',
    labelFallback: 'Estado / provincia / región',
    type: 'text',
    required: false,
    autoComplete: 'address-level1',
  },
  {
    id: 'postalCode',
    labelKey: 'cart.ship_postal',
    labelFallback: 'Código postal',
    type: 'text',
    required: true,
    autoComplete: 'postal-code',
  },
  {
    id: 'country',
    labelKey: 'cart.ship_country',
    labelFallback: 'País (ISO)',
    type: 'text',
    required: true,
    autoComplete: 'country',
    placeholder: 'PE',
  },
];

export function fieldsForBuyer(kind: BuyerKind): AddressFieldDef[] {
  return SHIP_TO_FIELDS.filter((f) => !f.forBuyer || f.forBuyer.includes(kind));
}

export type CheckoutColumnId = 'ship_to' | 'transport' | 'summary';

export interface CheckoutColumnDef {
  id: CheckoutColumnId;
  order: number;
  titleKey: string;
  titleFallback: string;
  kickerKey: string;
  kickerFallback: string;
}

/** 3 cuerpos horizontales — orden editable sin tocar el layout. */
export const CHECKOUT_COLUMNS: CheckoutColumnDef[] = [
  {
    id: 'ship_to',
    order: 1,
    kickerKey: 'cart.col1_kicker',
    kickerFallback: 'Cuerpo 1 · Destinatario',
    titleKey: 'cart.col1_title',
    titleFallback: 'Dirección del cliente',
  },
  {
    id: 'transport',
    order: 2,
    kickerKey: 'cart.col2_kicker',
    kickerFallback: 'Cuerpo 2 · Transporte',
    titleKey: 'cart.col2_title',
    titleFallback: 'Zona, courier, seguros y docs',
  },
  {
    id: 'summary',
    order: 3,
    kickerKey: 'cart.col3_kicker',
    kickerFallback: 'Cuerpo 3 · Resumen',
    titleKey: 'cart.col3_title',
    titleFallback: 'Compra y lo aceptado',
  },
];

export type ShipToFormState = Record<AddressFieldId, string>;

export function emptyShipTo(countryIso2 = 'PE'): ShipToFormState {
  return {
    fullName: '',
    companyName: '',
    taxId: '',
    email: '',
    phone: '',
    street1: '',
    street2: '',
    city: '',
    state: '',
    postalCode: '',
    country: countryIso2.slice(0, 2).toUpperCase(),
  };
}

export function validateShipTo(
  kind: BuyerKind,
  form: ShipToFormState,
): { ok: boolean; missing: AddressFieldId[] } {
  const missing: AddressFieldId[] = [];
  for (const f of fieldsForBuyer(kind)) {
    if (!f.required) continue;
    if (!String(form[f.id] ?? '').trim()) missing.push(f.id);
  }
  const country = form.country.trim().toUpperCase();
  if (country.length !== 2) missing.push('country');
  return { ok: missing.length === 0, missing: [...new Set(missing)] };
}

export const BUYER_KIND_OPTIONS: Array<{
  id: BuyerKind;
  labelKey: string;
  labelFallback: string;
}> = [
  { id: 'individual', labelKey: 'cart.buyer_individual', labelFallback: 'Individual / persona' },
  { id: 'company', labelKey: 'cart.buyer_company', labelFallback: 'Empresa / B2B' },
];

export const COMMERCE_MODE_OPTIONS: Array<{
  id: CommerceMode;
  labelKey: string;
  labelFallback: string;
}> = [
  { id: 'b2c', labelKey: 'cart.mode_b2c', labelFallback: 'B2C' },
  { id: 'b2b', labelKey: 'cart.mode_b2b', labelFallback: 'B2B' },
  { id: 'ecommerce', labelKey: 'cart.mode_ecom', labelFallback: 'E-commerce' },
];

/** Paginación del resumen de productos — 6 por página. */
export const PRODUCTS_PER_PAGE = 6 as const;

/**
 * Hook de garantía al comprar (columna resumen).
 * Editable / i18n-ready — cero hardcodeo en CartView.
 */
export type PurchaseGuaranteeHook = {
  id: string;
  titleKey: string;
  titleFallback: string;
  bodyKey: string;
  bodyFallback: string;
};

export const PURCHASE_GUARANTEE_HOOKS: PurchaseGuaranteeHook[] = [
  {
    id: 'authenticity',
    titleKey: 'cart.guarantee_auth_title',
    titleFallback: 'Garantía de autenticidad',
    bodyKey: 'cart.guarantee_auth_body',
    bodyFallback:
      'Cada espécimen sale con trazabilidad, factura comercial y packing list. Si algo no cuadra, lo resolvemos antes del despacho.',
  },
  {
    id: 'pack_safe',
    titleKey: 'cart.guarantee_pack_title',
    titleFallback: 'Embalaje y evidencia',
    bodyKey: 'cart.guarantee_pack_body',
    bodyFallback:
      'Con seguro aceptado: fotos, video si es posible y QR del paquete al embarque. Sin burocracia extra para ti.',
  },
  {
    id: 'export_docs',
    titleKey: 'cart.guarantee_docs_title',
    titleFallback: 'Documentos al confirmar',
    bodyKey: 'cart.guarantee_docs_body',
    bodyFallback:
      'Al confirmar recibes Commercial Invoice, Packing List y contrato de exportación pre-firmado en tu correo.',
  },
];

/** Bandera representativa por zona (filtro visual vivo). */
export const ZONE_FLAG_SAMPLES: Record<string, string[]> = {
  america: ['pe', 'us', 'br', 'mx', 'ar'],
  europe: ['es', 'de', 'fr', 'it', 'gb'],
  asia: ['cn', 'hk', 'jp', 'kr', 'sg'],
  africa: ['za', 'eg', 'ma', 'ke', 'ng'],
  oceania: ['au', 'nz', 'fj', 'pg', 'nc'],
  antarctica: ['aq'],
};
