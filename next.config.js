/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'cdn.sanity.io' },
    ],
  },
  // El Studio embebido (sanity/@sanity-ui/styled-components) crea contexts de
  // React a nivel de módulo; si el compilador de RSC intenta procesarlos para
  // el grafo del servidor, revienta con "createContext is not a function".
  // Externalizarlos evita que pasen por ese pipeline.
  serverExternalPackages: ['sanity', '@sanity/vision', '@sanity/ui', 'styled-components'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
    serverActions: { bodySizeLimit: '512mb' },
    largePageDataBytes: 512 * 1024,
  },
  async headers() {
    return [
      {
        source: '/api/media/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
