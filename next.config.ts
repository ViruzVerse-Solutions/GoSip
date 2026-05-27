import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',  // allows all supabase subdomains
        port: '',
        pathname: '/storage/v1/object/public/**',  // only allow from public bucket
      },
    ],
  },
};

export default nextConfig;