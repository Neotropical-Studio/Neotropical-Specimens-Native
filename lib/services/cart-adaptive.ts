// ============================================================================
// Pasarela y carrito adaptativos — SIN Stripe / PayPal / similares.
// Stack autorizado: XTransfer, WorldFirst, Alipay, WeChat Pay (QR),
// Global66, iZPay, G-Pay, MoneyGram, Western Union + bancos / transfer.
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

/** Pasarelas oficiales Neotropical Specimens (nunca Stripe/PayPal). */
export type NativeGateway =
  | 'xtransfer'
  | 'worldfirst'
  | 'alipay'
  | 'wechat_pay'
  | 'global66'
  | 'izpay'
  | 'gpay'
  | 'moneygram'
  | 'western_union'
  | 'bank_transfer';

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
  gateways: NativeGateway[]; // orden de preferencia
  discounts?: Array<{ minQty: number; rate: number }>;
}

const DEFAULT_RULE: RubroRule = {
  rubro: 'default',
  taxRate: 0.18,
  taxIncluded: true,
  currency: 'PEN',
  presentation: 'standard',
  // Retail nativo: WorldFirst / Alipay / WeChat. Mayor → XTransfer por monto.
  gateways: ['worldfirst', 'alipay', 'wechat_pay', 'xtransfer'],
};

const RUBRO_RULES: Record<string, Partial<RubroRule>> = {
  'specimens-3d': {
    presentation: 'immersive-3d',
    gateways: ['worldfirst', 'alipay', 'wechat_pay', 'xtransfer'],
  },
  video: { presentation: 'streaming', taxRate: 0.0, taxIncluded: true },
  wholesale: {
    taxIncluded: false,
    gateways: ['xtransfer', 'worldfirst'],
  } as Partial<RubroRule>,
  // Rubros de inventario — carrito universal / camaleónico
  'dried-specimens': {
    presentation: 'gallery',
    gateways: ['worldfirst', 'alipay', 'wechat_pay', 'xtransfer'],
  },
  arthropods: {
    presentation: 'gallery',
    gateways: ['worldfirst', 'alipay', 'wechat_pay', 'xtransfer'],
  },
  'zoology-skeletons': {
    presentation: 'standard',
    gateways: ['worldfirst', 'xtransfer', 'bank_transfer'],
  },
  'dried-plants': {
    presentation: 'standard',
    gateways: ['worldfirst', 'alipay', 'wechat_pay', 'xtransfer'],
  },
};

const ARCHETYPE_STRATEGY: Record<ArchetypeKey, Partial<RubroRule>> = {
  entomologo: { presentation: 'gallery', gateways: ['global66', 'xtransfer', 'bank_transfer'] },
  coleccionista: {
    presentation: 'immersive-3d',
    gateways: ['xtransfer', 'worldfirst', 'alipay', 'wechat_pay'],
  },
  amateur: { presentation: 'standard', gateways: ['global66', 'izpay', 'gpay', 'bank_transfer'] },
  artesano: { presentation: 'gallery', gateways: ['global66', 'bank_transfer'] },
  joyero: { presentation: 'immersive-3d', gateways: ['xtransfer', 'worldfirst', 'global66'] },
  revendedor: {
    taxIncluded: false,
    discounts: [
      { minQty: 10, rate: 0.15 },
      { minQty: 50, rate: 0.25 },
    ],
    gateways: ['xtransfer', 'worldfirst', 'global66', 'western_union'],
  },
  curador_galeria: {
    presentation: 'immersive-3d',
    gateways: ['xtransfer', 'worldfirst', 'bank_transfer'],
  },
  museo: {
    taxIncluded: false,
    presentation: 'gallery',
    gateways: ['xtransfer', 'worldfirst', 'bank_transfer'],
  },
  universidad: { taxIncluded: false, gateways: ['global66', 'bank_transfer', 'xtransfer'] },
  estudiante: {
    presentation: 'standard',
    discounts: [{ minQty: 1, rate: 0.1 }],
    gateways: ['global66', 'izpay', 'gpay'],
  },
  instituto: { taxIncluded: false, gateways: ['global66', 'bank_transfer', 'xtransfer'] },
  colegio: {
    taxIncluded: false,
    discounts: [{ minQty: 5, rate: 0.2 }],
    gateways: ['global66', 'bank_transfer'],
  },
  hobby: { presentation: 'standard', gateways: ['global66', 'izpay', 'gpay'] },
  filantropo: {
    presentation: 'immersive-3d',
    gateways: ['xtransfer', 'worldfirst', 'western_union', 'moneygram'],
  },
  taxidermista: { presentation: 'gallery', gateways: ['global66', 'bank_transfer'] },
  fotografo_naturaleza: { presentation: 'streaming', gateways: ['global66', 'izpay', 'gpay'] },
  decorador: { presentation: 'immersive-3d', gateways: ['global66', 'xtransfer'] },
  cine_tv: {
    taxIncluded: false,
    presentation: 'streaming',
    gateways: ['xtransfer', 'worldfirst', 'bank_transfer'],
  },
  boticario: { presentation: 'gallery', gateways: ['global66', 'bank_transfer'] },
  institucion_gubernamental: {
    taxIncluded: false,
    gateways: ['bank_transfer', 'xtransfer', 'worldfirst'],
  },
};

/** Ruteo por país: Asia → Alipay/WeChat QR; B2B export → XTransfer/WorldFirst. */
const COUNTRY_GATEWAYS: Record<string, NativeGateway[]> = {
  CN: ['wechat_pay', 'alipay', 'xtransfer', 'worldfirst'],
  HK: ['alipay', 'xtransfer', 'worldfirst', 'bank_transfer'],
  MO: ['alipay', 'xtransfer', 'worldfirst'],
  TW: ['bank_transfer', 'xtransfer', 'worldfirst'],
  PE: ['global66', 'izpay', 'gpay', 'bank_transfer', 'xtransfer'],
  US: ['global66', 'xtransfer', 'worldfirst', 'western_union', 'moneygram'],
  EU: ['global66', 'xtransfer', 'worldfirst', 'bank_transfer'],
};

export function resolveRule(rubro: string, profile: Profile, overrides?: Partial<RubroRule>): RubroRule {
  const archetypeRule = profile.archetype ? ARCHETYPE_STRATEGY[profile.archetype] : undefined;
  const base: RubroRule = { ...DEFAULT_RULE, ...RUBRO_RULES[rubro], ...archetypeRule, rubro };

  if (profile.segment === 'b2b' || profile.segment === 'wholesale') {
    base.taxIncluded = false;
    base.gateways = ['xtransfer', 'worldfirst', 'global66', 'bank_transfer', 'western_union', 'moneygram'];
  }
  if (profile.country && profile.country !== 'PE') {
    base.currency = profile.country === 'CN' ? 'CNY' : 'USD';
    base.taxRate = 0.0;
  }

  const byCountry = COUNTRY_GATEWAYS[profile.country?.toUpperCase() ?? ''];
  if (byCountry?.length) {
    base.gateways = byCountry;
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
  gateway: NativeGateway;
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

export function selectGateway(rule: RubroRule, profile: Profile): NativeGateway {
  const list = rule.gateways.length ? rule.gateways : DEFAULT_RULE.gateways;
  // Mayor / B2B: priorizar rieles de liquidación internacional.
  if (profile.segment === 'wholesale' || profile.segment === 'b2b') {
    return (
      list.find((g) => g === 'xtransfer' || g === 'worldfirst' || g === 'global66') ?? list[0]
    );
  }
  // China continental: QR WeChat / Alipay primero.
  if (profile.country === 'CN') {
    return list.find((g) => g === 'wechat_pay' || g === 'alipay') ?? list[0];
  }
  return list[0];
}

export const GATEWAY_LABEL: Record<NativeGateway, string> = {
  xtransfer: 'XTransfer',
  worldfirst: 'WorldFirst',
  alipay: 'Alipay (QR)',
  wechat_pay: 'WeChat Pay (QR)',
  global66: 'Global66',
  izpay: 'iZPay',
  gpay: 'G-Pay',
  moneygram: 'MoneyGram',
  western_union: 'Western Union',
  bank_transfer: 'Transferencia bancaria',
};
