import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const webNodeModules = path.join(path.dirname(fileURLToPath(import.meta.url)), 'node_modules');

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  serverExternalPackages: ['pg'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // externalDir imports from ../api resolve deps from api/, not web/ — fix for Vercel (root = web).
      config.resolve.modules = [webNodeModules, ...(config.resolve.modules ?? [])];
    }
    return config;
  },
};

export default nextConfig;
