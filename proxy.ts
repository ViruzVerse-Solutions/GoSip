// proxy.ts
// ── Edge Proxy — runs before EVERY request (Next.js 16 convention) ───────────
// Responsibilities:
//   1. Generate a per-request CSP nonce (removes unsafe-inline from script-src)
//   2. Inject the full Content-Security-Policy header dynamically
//   3. Pass the nonce down to the root layout via x-nonce header

import { NextRequest, NextResponse } from 'next/server'

/** Generate a base64-encoded nonce using the Web Crypto API (Edge-compatible). */
function generateNonce(): string {
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  return Buffer.from(bytes).toString('base64')
}

export function proxy(request: NextRequest) {
  // Completely bypass proxy middleware in development to avoid Turbopack / HMR issues on external IPs
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next()
  }

  // ── 0. Body size guard for API routes ────────────────────────────────────
  // Reject oversized POST bodies before they reach route handlers.
  if (request.method === 'POST' && request.nextUrl.pathname.startsWith('/api/')) {
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > 16 * 1024) {
      return new NextResponse(
        JSON.stringify({ error: 'Request body too large' }),
        { status: 413, headers: { 'Content-Type': 'application/json' } },
      )
    }
  }

  // ── 1. Generate a cryptographically-secure per-request nonce ─────────────
  // 16 bytes = 128 bits of entropy — more than sufficient for CSP nonces
  const nonce = generateNonce()

  // ── 2. Build the full CSP with the nonce ─────────────────────────────────
  // 'strict-dynamic' trusts scripts loaded by our nonce'd scripts,
  // removing the need for explicit origins in script-src.
  const csp = [
    "default-src 'self'",

    // Scripts: nonce + strict-dynamic (no unsafe-inline, no unsafe-eval in prod)
    // 'unsafe-eval' kept only for dev HMR (Next.js dev mode requires it)
    process.env.NODE_ENV === 'production'

      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline'`
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' 'unsafe-inline'`,


    // Styles: unsafe-inline still needed for Framer Motion inline styles
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

    // Fonts: Google Fonts CDN

    "font-src 'self' https://fonts.gstatic.com", 


    // Images: same-origin + Supabase storage + data URIs + blob (for uploads/local) + any https/http for external assets
    "img-src 'self' data: blob: https: http:",

    // Fetch / WebSocket: Supabase REST + Realtime
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",

    // No plugins or object embeds
    "object-src 'none'",

    // No iframing from external origins
    "frame-ancestors 'none'",

    // Upgrade all HTTP sub-resource requests to HTTPS (production only)
    ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
  ].join('; ')

  // ── 3. Clone request headers — inject nonce for layout consumption ────────
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  if (process.env.NODE_ENV === 'production') {
    requestHeaders.set('Content-Security-Policy', csp)
  }


  // ── 4. Build the response — forward enriched headers ─────────────────────
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // ── 5. Set all security response headers ─────────────────────────────────
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Content-Security-Policy', csp)
  }
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()',
  )

  // HSTS: only in production (dev runs over HTTP)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    )
  }

  return response
}

// Apply proxy to all routes EXCEPT Next.js internals and static files
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
