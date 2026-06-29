// next.config.ts
// Security headers are applied dynamically in middleware.ts via CSP nonces.
// This file handles only static Next.js configuration.

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow external IP testing
  allowedDevOrigins: ['10.177.142.137', 'localhost'],

  // ── Image optimization ───────────────────────────────────────────────────
  images: {
    // ── Image optimization enabled ──────────────────────────────────────────
    // Next.js will serve WebP, apply responsive srcsets, and lazy-load images.
    // remotePatterns restrict which external domains can be optimized.
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
            // Fail closed: if NEXT_PUBLIC_ADMIN_ORIGIN is unset, block all cross-origin
            // requests rather than opening the API to the entire internet.
            value: process.env.NEXT_PUBLIC_ADMIN_ORIGIN ?? '',
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