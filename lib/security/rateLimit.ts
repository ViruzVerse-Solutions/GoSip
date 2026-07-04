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

interface LocalCacheEntry {
  allowed: boolean
  expiresAt: number
  count: number
}

// ── Constants ─────────────────────────────────────────────────────────────────
const IP_WINDOW_MS     = 10 * 60 * 1000   // 10 minutes
const IP_MAX_REQUESTS  = 5                 // max order attempts per IP per window

const SESSION_WINDOW_MS    = 2 * 60 * 60 * 1000  // 2 hours
const SESSION_MAX_ORDERS   = 3                    // max orders per session token

const LOCAL_CACHE_WINDOW_MS = 10 * 1000          // 10 seconds local cache TTL
const LOCAL_BLOCK_WINDOW_MS = 60 * 1000          // 60 seconds local block TTL

// ── Stores ──────────────────────────────────────────────────────────
const ipStore      = new Map<string, RateLimitEntry>()
const sessionStore = new Map<string, RateLimitEntry>()

const localIpCache      = new Map<string, LocalCacheEntry>()
const localSessionCache = new Map<string, LocalCacheEntry>()

// ── Layer 1: IP Rate Limit ────────────────────────────────────────────────────
/** Returns true if this IP should be blocked. */
export async function isIpRateLimited(ip: string): Promise<boolean> {
  // Bypass IP rate limiting in development to prevent local testing/verification blocks
  if (process.env.NODE_ENV === 'development') {
    return false
  }

  const now = Date.now()
  const localEntry = localIpCache.get(ip)

  // 1. Check local fast-path in-memory cache
  if (localEntry && now < localEntry.expiresAt) {
    localEntry.count += 1
    // If they burst more than 3 requests within the 10-second window, block immediately in-memory
    if (localEntry.count > 3) {
      return true
    }
    // If they are cached as allowed, allow immediately without calling Redis
    if (localEntry.allowed) {
      return false
    }
  }

  // 2. Query Upstash Redis (if configured)
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (url && token) {
    try {
      const key = `ratelimit:ip:${ip}`
      const res = await fetch(`${url}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([
          ['INCR', key],
          ['EXPIRE', key, '600'] // 10 minutes (600s)
        ])
      })
      const data = await res.json()
      if (Array.isArray(data) && data[0]?.result) {
        const count = data[0].result
        const isLimited = count > IP_MAX_REQUESTS

        // Update local cache
        localIpCache.set(ip, {
          allowed: !isLimited,
          expiresAt: now + (isLimited ? LOCAL_BLOCK_WINDOW_MS : LOCAL_CACHE_WINDOW_MS),
          count: 1
        })
        return isLimited
      }
    } catch (err) {
      console.error('[Rate Limit] Redis IP check failed, falling back to memory:', err)
    }
  }

  // 3. Fallback to in-memory Map
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
export async function isSessionRateLimited(sessionToken: string): Promise<boolean> {
  const now = Date.now()
  const localEntry = localSessionCache.get(sessionToken)

  // 1. Check local fast-path in-memory cache
  if (localEntry && now < localEntry.expiresAt) {
    localEntry.count += 1
    // If they burst more than 2 order attempts within the 10-second window, block immediately in-memory
    if (localEntry.count > 2) {
      return true
    }
    // If cached as allowed, allow immediately without calling Redis
    if (localEntry.allowed) {
      return false
    }
  }

  // 2. Query Upstash Redis (if configured)
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (url && token) {
    try {
      const key = `ratelimit:session:${sessionToken}`
      const res = await fetch(`${url}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([
          ['INCR', key],
          ['EXPIRE', key, '7200'] // 2 hours (7200s)
        ])
      })
      const data = await res.json()
      if (Array.isArray(data) && data[0]?.result) {
        const count = data[0].result
        const isLimited = count > SESSION_MAX_ORDERS

        // Update local cache
        localSessionCache.set(sessionToken, {
          allowed: !isLimited,
          expiresAt: now + (isLimited ? LOCAL_BLOCK_WINDOW_MS : LOCAL_CACHE_WINDOW_MS),
          count: 1
        })
        return isLimited
      }
    } catch (err) {
      console.error('[Rate Limit] Redis Session check failed, falling back to memory:', err)
    }
  }

  // 3. Fallback to in-memory Map
  const entry = sessionStore.get(sessionToken)

  if (!entry || now >= entry.resetAt) {
    sessionStore.set(sessionToken, { count: 1, resetAt: now + SESSION_WINDOW_MS })
    return false
  }

  entry.count += 1
  return entry.count > SESSION_MAX_ORDERS
}

// ── Session counter reset ─────────────────────────────────────────────────────
/**
 * Reset the session counter — called when a session is cleared (e.g. on payment collected).
 * This allows the table to start a fresh dining session with a new session token.
 */
export async function resetSessionLimit(sessionToken: string): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  localSessionCache.delete(sessionToken)

  if (url && token) {
    try {
      const key = `ratelimit:session:${sessionToken}`
      await fetch(`${url}/del/${key}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (err) {
      console.error('[Rate Limit] Redis delete failed:', err)
    }
  }
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
