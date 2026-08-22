/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      // Evita las advertencias de "Serializing big strings" en la terminal
      config.cache = {
        type: 'memory',
      };
    }
    return config;
  },
};

export default nextConfig;
