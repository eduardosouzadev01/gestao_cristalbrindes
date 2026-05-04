import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'agjrnmpgudrciorchpog.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'www.xbzbrindes.com.br',
      },
      {
        protocol: 'https',
        hostname: 'cdn.xbzbrindes.com.br',
      },
      {
        protocol: 'https',
        hostname: 'www.asialog.com.br',
      },
      {
        protocol: 'https',
        hostname: 'cdn.asialog.com.br',
      },
      {
        protocol: 'https',
        hostname: 'www.spotgifts.com.br',
      },
      {
        protocol: 'https',
        hostname: 'cdn.spotgifts.com.br',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      }
    ],
  },
};

export default nextConfig;
