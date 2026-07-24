// ============================================================================
// Estrategia PWA extendida — compatibilidad universal y sincronización en
// entornos extremos. Consumida por el service worker y el registro cliente.
// ============================================================================

export const PWA_MANIFEST_VERSION = '2026.0';

export interface ServiceWorkerStrategy {
  caching: 'StaleWhileRevalidate' | 'CacheFirst' | 'NetworkFirst';
  offline_availability: boolean;
  automatic_background_sync: boolean;
  satellite_packet_compression: boolean;
}

export const SERVICE_WORKER_STRATEGY: ServiceWorkerStrategy = {
  caching: 'StaleWhileRevalidate',
  offline_availability: true,
  automatic_background_sync: true,
  satellite_packet_compression: true,
};

export const UNIVERSAL_COMPATIBILITY = {
  apple_devices: {
    safari_pwa_support: 'standalone_fullscreen_ios_ipad_macos',
    apple_touch_icon: '/icons/apple-touch-icon.png',
    viewport_fit: 'cover',
  },
  cross_platform_viewports: {
    mobile: 'responsive_fluid_mobile',
    tablet_ipad: 'adaptive_grid_split_pane',
    desktop_pc: 'high_density_multi_column',
  },
  extreme_environment_sync: {
    subterranean_bunker_offline_mode: 'IndexedDB_local_first_mesh_sync',
    deep_sea_marine_latency_guard: 'aggressive_edge_caching_fallback',
    stratosphere_orbital_satellite_relay: 'low_bandwidth_binary_protocol_stream',
  },
} as const;

// Cola de sincronización en segundo plano (Background Sync API).
export const BACKGROUND_SYNC_TAG = 'entmo-edge-sync';
export const SW_CACHE = `entmo-edge-${PWA_MANIFEST_VERSION}`;
