import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
        pathname: '/storage/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/storage/**',
      },
      { protocol: 'http', 
        hostname: '192.168.1.23', 
        port: '8000', 
        pathname: '/storage/**' },
      // 👇 ajoute ton domaine de production si besoin
      // {
      //   protocol: 'https',
      //   hostname: 'api.tondomaine.com',
      //   pathname: '/storage/**',
      // },
    ],
  },
};

export default nextConfig;
