// app/api/orders/[token]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual as cryptoTimingSafeEqual } from 'crypto'
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
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const isUuid = typeof token === 'string' && UUID_RE.test(token)

    let dbQuery = supabaseServer
      .from('orders')
      .select(`
        id, token, table_number, status, daily_order_number, total, created_at, session_token, branch_id,
        order_items (
          id, quantity, price, created_at,
          menu_items!order_items_item_id_fkey ( id, name, image_url )
        )
      `)

    if (isUuid) {
      dbQuery = dbQuery.eq('id', token)
    } else {
      const rawToken = decryptToken(token)
      if (!rawToken || !isValidToken(rawToken)) {
        return NextResponse.json({ error: 'Invalid token format' }, { status: 400 })
      }
      dbQuery = dbQuery.eq('token', rawToken)
    }

    const { data: targetOrder, error: targetError } = await dbQuery.single()

    if (targetError || !targetOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // If session_token is present, aggregate all orders in this session
    if (targetOrder.session_token) {
      const { data: allOrders, error: allOrdersError } = await supabaseServer
        .from('orders')
        .select(`
          id, token, table_number, status, daily_order_number, total, created_at, session_token, branch_id,
          order_items (
            id, quantity, price, created_at,
            menu_items!order_items_item_id_fkey ( id, name, image_url )
          )
        `)
        .eq('session_token', targetOrder.session_token)
        .eq('branch_id', targetOrder.branch_id)

      if (!allOrdersError && allOrders && allOrders.length > 0) {
        // Sort orders by created_at ascending to find the main (earliest) order
        const sortedOrders = [...allOrders].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        const mainOrder = sortedOrders[0]

        const nonCancelledOrders = sortedOrders.filter((o) => o.status !== 'cancelled')

        if (nonCancelledOrders.length > 0) {
          const aggregatedItems = nonCancelledOrders.flatMap((o) =>
            (o.order_items || []).map((item) => ({
              ...item,
              remarks: o.id !== mainOrder.id ? 'Addon' : undefined,
            }))
          )
          // Sort aggregated items chronologically
          aggregatedItems.sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )

          const combinedTotal = nonCancelledOrders.reduce((sum, o) => sum + (o.total || 0), 0)

          const statuses = nonCancelledOrders.map((o) => o.status)
          let combinedStatus = 'pending'
          
          if (statuses.every((s) => s === 'collected')) {
            combinedStatus = 'collected'
          } else if (statuses.includes('pending')) {
            combinedStatus = 'pending'
          } else if (statuses.includes('delivered') || statuses.includes('ready')) {
            combinedStatus = 'delivered'
          } else {
            combinedStatus = statuses[0] || 'pending'
          }

          // Self-heal: update all other active orders in this session to collected in the DB
          if (combinedStatus === 'collected') {
            const otherActiveOrders = nonCancelledOrders.filter(
              (o) => o.status !== 'collected'
            )
            if (otherActiveOrders.length > 0) {
              const otherIds = otherActiveOrders.map((o) => o.id)
              await supabaseServer
                .from('orders')
                .update({ status: 'collected' })
                .in('id', otherIds)
            }
          }

          return NextResponse.json({
            id: mainOrder.id,
            token: mainOrder.token,
            table_number: mainOrder.table_number,
            daily_order_number: mainOrder.daily_order_number,
            created_at: mainOrder.created_at,
            session_token: mainOrder.session_token,
            branch_id: mainOrder.branch_id,
            total: combinedTotal,
            status: combinedStatus,
            order_items: aggregatedItems,
          })
        } else {
          // All orders in the session are cancelled
          const aggregatedItems = sortedOrders.flatMap((o) =>
            (o.order_items || []).map((item) => ({
              ...item,
              remarks: o.id !== mainOrder.id ? 'Addon' : undefined,
            }))
          )
          aggregatedItems.sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )

          const combinedTotal = sortedOrders.reduce((sum, o) => sum + (o.total || 0), 0)

          return NextResponse.json({
            id: mainOrder.id,
            token: mainOrder.token,
            table_number: mainOrder.table_number,
            daily_order_number: mainOrder.daily_order_number,
            created_at: mainOrder.created_at,
            session_token: mainOrder.session_token,
            branch_id: mainOrder.branch_id,
            total: combinedTotal,
            status: 'cancelled',
            order_items: aggregatedItems,
          })
        }
      }
    }

    return NextResponse.json(targetOrder)
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
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const isUuid = typeof token === 'string' && UUID_RE.test(token)

    let rawToken: string | null = null

    if (!isUuid) {
      rawToken = decryptToken(token)

      // Admin is already authenticated, so fall back to raw token if decryption failed
      if (rawToken === null && isValidToken(token)) {
        rawToken = token
      }

      if (!rawToken || !isValidToken(rawToken)) {
        return NextResponse.json({ error: 'Invalid token format' }, { status: 400 })
      }
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
    let currentOrderQuery = supabaseServer
      .from('orders')
      .select('id, token, status, session_token, branch_id')

    if (isUuid) {
      currentOrderQuery = currentOrderQuery.eq('id', token)
    } else {
      currentOrderQuery = currentOrderQuery.eq('token', rawToken)
    }

    const { data: currentOrder, error: fetchError } = await currentOrderQuery.single()

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
    if (newStatus === 'collected' && currentOrder.session_token) {
      const { error: batchUpdateError } = await supabaseServer
        .from('orders')
        .update({ status: 'collected' })
        .eq('session_token', currentOrder.session_token)
        .eq('branch_id', currentOrder.branch_id)
        .neq('status', 'cancelled')

      if (batchUpdateError) {
        console.error('[PATCH /api/orders/[token]] Batch update failed:', batchUpdateError)
        return NextResponse.json({ error: 'Failed to update session orders' }, { status: 500 })
      }
    }

    let finalUpdateQuery = supabaseServer
      .from('orders')
      .update({ status: newStatus })

    if (isUuid) {
      finalUpdateQuery = finalUpdateQuery.eq('id', token)
    } else {
      finalUpdateQuery = finalUpdateQuery.eq('token', rawToken)
    }

    const { data: updated, error: updateError } = await finalUpdateQuery
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
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) {
    return false
  }
  return cryptoTimingSafeEqual(bufA, bufB)
}
