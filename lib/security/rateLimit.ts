// lib/security/rateLimit.ts
// ── Dual-layer rate limiter: IP + Session Token ───────────────────────────────
//
// Layer 1 — IP-based  : Blocks bursts from a single IP (5 req / 10 min)
// Layer 2 — Session   : Limits orders per customer session (3 orders / 2 hr)
//
// Why two layers?
//   • IP limit stops automated scanning / bot traffic
//   • Session limit stops a real user from placing 50 orders on the same table
//   • Combined, they are bypass-resistant:
//       - Changing IP still hits the session limit
//       - Changing session still hits the IP limit

// ── Types ────────────────────────────────────────────────────────────────────
interface RateLimitEntry {
  count: number
  resetAt: number   // unix ms — when this window resets
}

// ── Constants ─────────────────────────────────────────────────────────────────
const IP_WINDOW_MS     = 10 * 60 * 1000   // 10 minutes
const IP_MAX_REQUESTS  = 5                 // max order attempts per IP per window

const SESSION_WINDOW_MS    = 2 * 60 * 60 * 1000  // 2 hours
const SESSION_MAX_ORDERS   = 3                    // max orders per session token

// ── In-memory stores ──────────────────────────────────────────────────────────
// These Maps persist within a serverless instance and reset on cold start.
// For multi-region production replace with Upstash Redis:
//   import { Redis } from '@upstash/redis'
const ipStore      = new Map<string, RateLimitEntry>()
const sessionStore = new Map<string, RateLimitEntry>()

// ── Layer 1: IP Rate Limit ────────────────────────────────────────────────────
/** Returns true if this IP should be blocked. */
export function isIpRateLimited(ip: string): boolean {
  // Bypass IP rate limiting in development to prevent local testing/verification blocks
  if (process.env.NODE_ENV === 'development') {
    return false
  }

  const now   = Date.now()
  const entry = ipStore.get(ip)

  if (!entry || now >= entry.resetAt) {
    ipStore.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS })
    return false
  }

  entry.count += 1
  return entry.count > IP_MAX_REQUESTS
}

// ── Layer 2: Session Rate Limit ───────────────────────────────────────────────
/**
 * Returns true if this session token has exceeded its order limit.
 * A session token is created once when the user selects their table (uuidv4).
 * It persists for 2 hours in localStorage, so this limit = 3 orders per visit.
 */
export function isSessionRateLimited(sessionToken: string): boolean {
  const now   = Date.now()
  const entry = sessionStore.get(sessionToken)

  if (!entry || now >= entry.resetAt) {
    sessionStore.set(sessionToken, { count: 1, resetAt: now + SESSION_WINDOW_MS })
    return false
  }

  entry.count += 1
  return entry.count > SESSION_MAX_ORDERS
}

/**
 * Reset the session counter — called when a session is cleared (e.g. on payment collected).
 * This allows the table to start a fresh dining session with a new session token.
 */
export function resetSessionLimit(sessionToken: string): void {
  sessionStore.delete(sessionToken)
}

// ── IP Extraction ─────────────────────────────────────────────────────────────
/**
 * Extract the real client IP from Next.js request headers.
 * Priority order: Cloudflare → Nginx → Load balancer X-Forwarded-For → fallback.
 */
export function getClientIp(req: Request): string {
  // Use secure client IP provided by Next.js platform if available (prevents header spoofing)
  const nextRequestIp = (req as any).ip
  if (nextRequestIp) return nextRequestIp

  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    'unknown'
  )
}
