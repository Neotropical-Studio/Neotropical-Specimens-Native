/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  // Evita el warning de cross-origin entre localhost y 127.0.0.1 en dev.
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' }],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
    serverActions: { bodySizeLimit: '512mb' },
    largePageDataBytes: 512 * 1024,
    // Reduce presión de memoria/caché webpack en builds Vercel (WasmHash crash).
    webpackMemoryOptimizations: true,
  },
  /**
   * En Vercel, la caché filesystem de webpack a veces se corrompe y dispara:
   * TypeError: Cannot read properties of undefined (reading 'length') en WasmHash.
   * Desactivar caché en CI evita el fallo intermitente.
   */
  webpack: (config, { dev }) => {
    if (!dev && (process.env.VERCEL || process.env.CI)) {
      config.cache = false;
    }
    return config;
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
