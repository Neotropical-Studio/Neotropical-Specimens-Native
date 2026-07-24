// ============================================================================
// Pasarela y carrito adaptativos — reglas mutables por rubro / perfil.
// ============================================================================

export interface CartLine {
  id: string;
  sku: string;
  title: string;
  quantity: number;
  unitPrice: number; // en la unidad menor (céntimos)
  rubro: string;
  attributes?: Record<string, unknown>;
}

export type ArchetypeKey =
  | 'entomologo' | 'coleccionista' | 'amateur' | 'artesano' | 'joyero'
  | 'revendedor' | 'curador_galeria' | 'museo' | 'universidad' | 'estudiante'
  | 'instituto' | 'colegio' | 'hobby' | 'filantropo' | 'taxidermista'
  | 'fotografo_naturaleza' | 'decorador' | 'cine_tv' | 'boticario'
  | 'institucion_gubernamental';

export interface Profile {
  id?: string;
  country: string; // ISO-3166 alpha-2
  segment?: 'b2c' | 'b2b' | 'wholesale';
  archetype?: ArchetypeKey;
  vatId?: string;
  detected?: Record<string, unknown>;
}

export interface RubroRule {
  rubro: string;
  taxRate: number; // 0.18 = 18%
  taxIncluded: boolean;
  currency: string;
  presentation: 'standard' | 'gallery' | 'immersive-3d' | 'streaming';
  gateways: string[]; // orden de preferencia
  discounts?: Array<{ minQty: number; rate: number }>;
}

const DEFAULT_RULE: RubroRule = {
  rubro: 'default',
  taxRate: 0.18,
  taxIncluded: true,
  currency: 'PEN',
  presentation: 'standard',
  gateways: ['stripe', 'mercadopago'],
};

// Reglas camaleónicas: se pueden hidratar desde Sanity/Supabase en runtime.
const RUBRO_RULES: Record<string, Partial<RubroRule>> = {
  'specimens-3d': { presentation: 'immersive-3d', gateways: ['stripe', 'paypal'] },
  'video': { presentation: 'streaming', taxRate: 0.0, taxIncluded: true },
  'wholesale': { taxIncluded: false, segment: 'b2b' } as Partial<RubroRule>,
};

// Estrategia de conversión por arquetipo (muta cobro/presentación/descuentos).
export const ARCHETYPE_STRATEGY: Record<ArchetypeKey, Partial<RubroRule>> = {
  entomologo: { presentation: 'gallery', gateways: ['stripe', 'paypal'] },
  coleccionista: { presentation: 'immersive-3d', gateways: ['stripe', 'paypal'] },
  amateur: { presentation: 'standard' },
  artesano: { presentation: 'gallery' },
  joyero: { presentation: 'immersive-3d' },
  revendedor: { taxIncluded: false, discounts: [{ minQty: 10, rate: 0.15 }, { minQty: 50, rate: 0.25 }] },
  curador_galeria: { presentation: 'immersive-3d', gateways: ['stripe'] },
  museo: { taxIncluded: false, presentation: 'gallery', gateways: ['stripe'] },
  universidad: { taxIncluded: false, gateways: ['stripe'] },
  estudiante: { presentation: 'standard', discounts: [{ minQty: 1, rate: 0.1 }] },
  instituto: { taxIncluded: false, gateways: ['stripe'] },
  colegio: { taxIncluded: false, discounts: [{ minQty: 5, rate: 0.2 }] },
  hobby: { presentation: 'standard' },
  filantropo: { presentation: 'immersive-3d', gateways: ['stripe', 'paypal'] },
  taxidermista: { presentation: 'gallery' },
  fotografo_naturaleza: { presentation: 'streaming' },
  decorador: { presentation: 'immersive-3d' },
  cine_tv: { taxIncluded: false, presentation: 'streaming', gateways: ['stripe'] },
  boticario: { presentation: 'gallery' },
  institucion_gubernamental: { taxIncluded: false, gateways: ['stripe'] },
};

export function resolveRule(rubro: string, profile: Profile, overrides?: Partial<RubroRule>): RubroRule {
  const archetypeRule = profile.archetype ? ARCHETYPE_STRATEGY[profile.archetype] : undefined;
  const base: RubroRule = { ...DEFAULT_RULE, ...RUBRO_RULES[rubro], ...archetypeRule, rubro };

  // Mutación por perfil detectado.
  if (profile.segment === 'b2b' || profile.segment === 'wholesale') {
    base.taxIncluded = false;
  }
  if (profile.country && profile.country !== 'PE') {
    base.currency = 'USD';
    base.taxRate = 0.0; // exportación
  }

  return { ...base, ...overrides };
}

export interface Quote {
  lines: Array<CartLine & { lineTotal: number; discount: number }>;
  currency: string;
  subtotal: number;
  discountTotal: number;
  tax: number;
  total: number;
  presentation: RubroRule['presentation'];
  gateway: string;
  rule: RubroRule;
}

export function quoteCart(lines: CartLine[], profile: Profile, overrides?: Partial<RubroRule>): Quote {
  const rubro = lines[0]?.rubro ?? 'default';
  const rule = resolveRule(rubro, profile, overrides);

  let subtotal = 0;
  let discountTotal = 0;

  const priced = lines.map((line) => {
    const gross = line.unitPrice * line.quantity;
    const tier = (rule.discounts ?? [])
      .filter((d) => line.quantity >= d.minQty)
      .sort((a, b) => b.rate - a.rate)[0];
    const discount = tier ? Math.round(gross * tier.rate) : 0;
    const lineTotal = gross - discount;
    subtotal += gross;
    discountTotal += discount;
    return { ...line, lineTotal, discount };
  });

  const net = subtotal - discountTotal;
  const tax = rule.taxIncluded
    ? Math.round(net - net / (1 + rule.taxRate))
    : Math.round(net * rule.taxRate);
  const total = rule.taxIncluded ? net : net + tax;

  return {
    lines: priced,
    currency: rule.currency,
    subtotal,
    discountTotal,
    tax,
    total,
    presentation: rule.presentation,
    gateway: selectGateway(rule, profile),
    rule,
  };
}

export function selectGateway(rule: RubroRule, profile: Profile): string {
  if (profile.country && profile.country !== 'PE') {
    return rule.gateways.find((g) => g === 'stripe' || g === 'paypal') ?? rule.gateways[0];
  }
  return rule.gateways[0];
}
