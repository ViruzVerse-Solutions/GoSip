// next.config.ts
// Security headers are now applied dynamically in middleware.ts via CSP nonces.
// This file handles only static Next.js configuration.

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // ── Image optimization ───────────────────────────────────────────────────
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',  // only public bucket paths
      },
    ],
  },

  // ── CORS for API routes ──────────────────────────────────────────────────
  // Restrict PATCH /api/orders/* to your admin dashboard origin only.
  // Set NEXT_PUBLIC_ADMIN_ORIGIN in .env.local to your admin app URL.
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXT_PUBLIC_ADMIN_ORIGIN ?? 'null',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PATCH, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ]
  },
}

export default nextConfig