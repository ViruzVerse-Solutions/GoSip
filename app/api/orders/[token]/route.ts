// app/api/orders/[token]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { decryptToken } from '@/lib/security/crypto'

// ── Allowed order status values ───────────────────────────────────────────────
const ALLOWED_STATUSES = ['pending', 'delivered', 'cancelled', 'collected'] as const
type AllowedStatus = (typeof ALLOWED_STATUSES)[number]

/**
 * Valid state machine transitions.
 * Key = current status, Value = statuses it can transition TO.
 *
 *   pending  →  delivered | cancelled
 *   delivered → collected | cancelled
 *   collected →  (terminal — no further changes)
 *   cancelled →  (terminal — no further changes)
 */
const STATUS_TRANSITIONS: Record<string, AllowedStatus[]> = {
  pending:   ['delivered', 'cancelled'],
  delivered: ['collected', 'cancelled'],
  collected: [],   // terminal
  cancelled: [],   // terminal
}

// ── Token format guard ────────────────────────────────────────────────────────
const TOKEN_RE = /^[A-Z0-9_-]{6,12}$/

function isValidToken(token: unknown): token is string {
  return typeof token === 'string' && TOKEN_RE.test(token)
}

// ── GET /api/orders/[token] ───────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params
    const rawToken = decryptToken(token)

    if (!rawToken || !isValidToken(rawToken)) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from('orders')
      .select(`
        id, token, table_number, status, daily_order_number, total, created_at,
        order_items (
          id, quantity, price,
          menu_items!order_items_item_id_fkey ( id, name, image_url )
        )
      `)
      .eq('token', rawToken)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[GET /api/orders/[token]] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── PATCH /api/orders/[token] ─────────────────────────────────────────────────
//
// SECURITY: This endpoint changes order status (e.g. → "collected" = payment received).
// It is ADMIN-ONLY — protected by a pre-shared secret header.
//
// How it works:
//   1. Caller must send `Authorization: Bearer <ADMIN_API_SECRET>` in the request.
//   2. The secret is stored only in server environment variables — never shipped to the client.
//   3. State machine validation prevents nonsensical transitions (e.g. cancelled → delivered).
//
// Clients (customer-facing pages) never call PATCH — they only read via GET + realtime.
// Only your admin dashboard (or a trusted backend) calls this endpoint.

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    // ── 1. Admin authentication ───────────────────────────────────────────────
    const adminSecret = process.env.ADMIN_API_SECRET
    if (!adminSecret) {
      // Fail closed: if the env var is missing, refuse all PATCH requests
      console.error('[PATCH /api/orders] ADMIN_API_SECRET env var is not set!')
      return NextResponse.json({ error: 'Service misconfigured' }, { status: 503 })
    }

    const authHeader = req.headers.get('authorization')
    const providedSecret = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null

    // Constant-time comparison to prevent timing-based secret extraction
    if (!providedSecret || !timingSafeEqual(providedSecret, adminSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── 2. Token validation ───────────────────────────────────────────────────
    const { token } = await params
    let rawToken = decryptToken(token)

    // Admin is already authenticated, so fall back to raw token if decryption failed
    if (rawToken === null && isValidToken(token)) {
      rawToken = token
    }

    if (!rawToken || !isValidToken(rawToken)) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 400 })
    }

    // ── 3. Parse & validate requested status ──────────────────────────────────
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { status: requestedStatus } = (body ?? {}) as { status?: unknown }

    if (!requestedStatus || !ALLOWED_STATUSES.includes(requestedStatus as AllowedStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}` },
        { status: 400 },
      )
    }

    const newStatus = requestedStatus as AllowedStatus

    // ── 4. Fetch current order status ─────────────────────────────────────────
    const { data: currentOrder, error: fetchError } = await supabaseServer
      .from('orders')
      .select('id, token, status')
      .eq('token', rawToken)
      .single()

    if (fetchError || !currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // ── 5. State machine validation ───────────────────────────────────────────
    const allowedTransitions = STATUS_TRANSITIONS[currentOrder.status] ?? []
    if (!allowedTransitions.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Cannot transition from '${currentOrder.status}' to '${newStatus}'.`,
          currentStatus: currentOrder.status,
          allowedTransitions,
        },
        { status: 409 },   // 409 Conflict
      )
    }

    // ── 6. Apply status update ────────────────────────────────────────────────
    const { data: updated, error: updateError } = await supabaseServer
      .from('orders')
      .update({ status: newStatus })
      .eq('token', rawToken)
      .select('id, token, status')
      .single()

    if (updateError || !updated) {
      console.error('[PATCH /api/orders/[token]] Update failed:', updateError)
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PATCH /api/orders/[token]] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── Timing-safe string comparison ────────────────────────────────────────────
// Prevents timing attacks where an attacker measures response time to extract
// the secret one character at a time.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still run the loop to keep constant time even on length mismatch
    let result = 1
    for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ 0
    return false
  }
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
