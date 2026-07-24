import type { MetadataRoute } from 'next';

// PWA manifest (campos estándar). Ver lib/pwa/config.ts para la estrategia
// extendida (entornos extremos / SW) no representable en el manifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Entomology Global Edge Engine',
    short_name: 'EntmoEdge',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#121212',
    orientation: 'any',
    scope: '/',
    icons: [
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
