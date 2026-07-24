// ============================================================================
// Motor geo-edge regenerativo: detección por IP en el borde, auto-switch de
// perfil (locale/moneda/pasarela/tema) y cadena de fallback.
// ============================================================================

export type SystemMode = 'adaptive_geo_edge_regenerative';

export interface GeoProfile {
  locale: string;
  currency: string;
  gateway: string[];
  ui_overrides: {
    theme: string;
    badge_style: string;
  };
}

export interface GeoEdgeConfig {
  system_mode: SystemMode;
  engine_status: 'active' | 'paused';
  geolocation_routing: {
    detection_method: 'edge_ip_inference';
    auto_switch: boolean;
    fallback_chain: string[];
  };
  profiles: Record<string, GeoProfile>;
  regenerative_rules: {
    on_firewall_block: string;
    on_missing_translation: string;
    asset_fallback: string;
  };
}

export const GEO_EDGE_CONFIG: GeoEdgeConfig = {
  system_mode: 'adaptive_geo_edge_regenerative',
  engine_status: 'active',
  geolocation_routing: {
    detection_method: 'edge_ip_inference',
    auto_switch: true,
    fallback_chain: ['target_locale', 'zh-CN', 'en-US'],
  },
  profiles: {
    'zh-CN': {
      locale: 'zh-CN',
      currency: 'CNY',
      gateway: ['WeChat Pay', 'Alipay'],
      ui_overrides: { theme: 'minimal_speed_optimized', badge_style: 'high_contrast_asia' },
    },
    'zh-TW': {
      locale: 'zh-TW',
      currency: 'TWD',
      gateway: ['Local Credit Cards', 'Bank Transfer'],
      ui_overrides: { theme: 'collector_luxury', badge_style: 'traditional_badge' },
    },
    'ko-KR': {
      locale: 'ko-KR',
      currency: 'KRW',
      gateway: ['Naver Pay', 'Toss'],
      ui_overrides: { theme: 'dynamic_seoul', badge_style: 'modern_hangul' },
    },
  },
  regenerative_rules: {
    on_firewall_block: 'reroute_anycast_nearest_node',
    on_missing_translation: 'fallback_to_english_and_async_fetch',
    asset_fallback: 'local_cdn_mirror',
  },
};

export const DEFAULT_PROFILE: GeoProfile = {
  locale: 'en-US',
  currency: 'USD',
  gateway: ['stripe', 'paypal'],
  ui_overrides: { theme: 'standard', badge_style: 'default' },
};

// País ISO-3166 alpha-2 → clave de perfil geo.
export const COUNTRY_TO_PROFILE: Record<string, string> = {
  CN: 'zh-CN',
  HK: 'zh-TW', // tradicional
  MO: 'zh-TW', // Macao → tradicional
  TW: 'zh-TW',
  KR: 'ko-KR',
};

// Cabeceras habituales de CDN/anycast para inferir país en el borde.
export const GEO_HEADERS = [
  'cf-ipcountry', // Cloudflare
  'x-vercel-ip-country', // Vercel
  'x-geo-country', // anycast propio / nginx GeoIP
  'x-country-code',
];
