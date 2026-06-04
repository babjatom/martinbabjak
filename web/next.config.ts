import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  serverExternalPackages: ['pg'],
};

export default nextConfig;
