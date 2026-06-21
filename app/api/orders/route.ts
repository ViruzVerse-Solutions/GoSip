// app/api/orders/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { supabaseServer } from '@/lib/supabase/server'
import { isIpRateLimited, isSessionRateLimited, getClientIp } from '@/lib/security/rateLimit'
import { validateOrderBody } from '@/lib/security/sanitize'
import { encryptToken } from '@/lib/security/crypto'

// ── Constants ─────────────────────────────────────────────────────────────────
/** Maximum allowed request body size for POST /api/orders (16 KB) */
const MAX_BODY_BYTES = 16 * 1024

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns today's date in IST as a YYYY-MM-DD string */
function getIstDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

/** Generate a cryptographically-secure, URL-safe 8-character order token */
function generateSecureToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = randomBytes(8)
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars[bytes[i] % chars.length]
  }
  return result
}

// ── POST /api/orders ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // ── 1. Body size guard ────────────────────────────────────────────────────
    // Prevents large payload attacks before any parsing occurs.
    const contentLength = req.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
    }

    // ── 2. IP-based rate limiting (Layer 1) ───────────────────────────────────
    const clientIp = getClientIp(req)
    if (isIpRateLimited(clientIp)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a few minutes.' },
        {
          status: 429,
          headers: { 'Retry-After': '600', 'X-RateLimit-Limit': '5' },
        },
      )
    }

    // ── 3. Parse & validate input ─────────────────────────────────────────────
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const validation = validateOrderBody(body)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { sessionToken, tableNumber, branchId, items } = body as {
      sessionToken: string
      tableNumber:  string
      branchId:     string
      items:        { itemId: string; quantity: number }[]
    }

    // ── 4. Session-based rate limiting (Layer 2 — per user, not per table) ────
    // A session token is a UUID generated when the user selects their table.
    // It persists 4 hours in localStorage. Limit: 3 orders per session.
    if (isSessionRateLimited(sessionToken)) {
      return NextResponse.json(
        { error: 'You have reached the order limit for this session. Please start a new session.' },
        { status: 429, headers: { 'Retry-After': '7200' } },
      )
    }

    const trimmedTable = tableNumber.trim()
    const today        = getIstDate()
    const itemIds      = items.map((i) => i.itemId)

    // ── 5. Verify branch exists and is active & open ─────────────────────────
    const { data: branch, error: branchError } = await supabaseServer
      .from('branches')
      .select('id, is_open')
      .eq('id', branchId)
      .eq('is_active', true)
      .single()

    if (branchError || !branch) {
      return NextResponse.json({ error: 'Invalid or inactive branch' }, { status: 400 })
    }

    if (!branch.is_open) {
      return NextResponse.json({ error: 'This branch is currently closed and not accepting orders' }, { status: 400 })
    }

    // ── 6. Verify table belongs to this branch ────────────────────────────────
    const { data: tableRow, error: tableError } = await supabaseServer
      .from('tables')
      .select('id')
      .eq('branch_id', branchId)
      .eq('table_number', trimmedTable)
      .eq('is_active', true)
      .single()

    if (tableError || !tableRow) {
      return NextResponse.json({ error: 'Table not found for this branch' }, { status: 400 })
    }

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

    // ── 6.1. Verify table is not occupied by another active order ─────────────
    const { data: existingActiveOrders, error: checkOccupiedError } = await supabaseServer
      .from('orders')
        .select('id, session_token, total')
      .eq('branch_id', branchId)
      .eq('table_number', trimmedTable)
      .in('status', ['pending'])
      .gte('created_at', twoHoursAgo)

    if (checkOccupiedError) {
      console.error('[Orders] Table check failed:', checkOccupiedError)
      return NextResponse.json({ error: 'Failed to verify table status' }, { status: 500 })
    }

    if (existingActiveOrders && existingActiveOrders.length > 0) {
      // Check if any truly active order belongs to a different session (or has no session token)
      const hasOtherSessionOrder = existingActiveOrders.some(
        (order) => !order.session_token || order.session_token !== sessionToken
      )
      if (hasOtherSessionOrder) {
        return NextResponse.json({ error: 'This table is occupied. Please select another table.' }, { status: 409 })
      }
    }

    // ── 7. Parallel: item validation + daily order number ─────────────────────
    // (Table-based DB rate limit removed — replaced by session-token rate limit above)
    const [
      { data: menuItems, error: menuItemsError },
      dailyNumberResult,
    ] = await Promise.all([
      // Items scoped to branch — prevents cross-branch injection
      supabaseServer
        .from('menu_items')
        .select('id, price, is_available')
        .in('id', itemIds)
        .eq('branch_id', branchId),

      // Atomic daily order number via DB stored procedure
      supabaseServer.rpc('next_daily_order_number', {
        p_branch_id: branchId,
        p_date:      today,
      }),
    ])

    if (menuItemsError || !menuItems) {
      console.error('[Orders] Item verification failed:', menuItemsError)
      return NextResponse.json({ error: 'Failed to verify items' }, { status: 500 })
    }

    // ── 8. Validate every item: exists in this branch, available ─────────────
    const menuItemsMap = new Map(menuItems.map((mi) => [mi.id, mi]))
    let total = 0
    const orderItemsToInsert: { item_id: string; quantity: number; price: number }[] = []

    for (const { itemId, quantity } of items) {
      const menuItem = menuItemsMap.get(itemId)
      if (!menuItem) {
        return NextResponse.json({ error: 'Item not found in this branch' }, { status: 400 })
      }
      if (!menuItem.is_available) {
        return NextResponse.json({ error: 'An item in your cart is no longer available' }, { status: 400 })
      }
      total += menuItem.price * quantity          // server-authoritative price
      orderItemsToInsert.push({ item_id: itemId, quantity, price: menuItem.price })
    }

    // ── 9. Generate daily order number ────────────────────────────────────────
    if (dailyNumberResult.error || dailyNumberResult.data == null) {
      console.error('[Orders] Daily number generation failed:', dailyNumberResult.error)
      return NextResponse.json({ error: 'Failed to generate order number' }, { status: 500 })
    }
    const dailyOrderNumber = dailyNumberResult.data as number

    // ── 10. Generate cryptographically-secure order token ─────────────────────
    const token = generateSecureToken()

    // ── 11. Insert order ──────────────────────────────────────────────────────
    const { data: order, error: orderError } = await supabaseServer
      .from('orders')
      .insert({
        branch_id:           branchId,
        table_number:        trimmedTable,
        token,
        daily_order_number:  dailyOrderNumber,
        total,
        status:              'pending',
        session_token:       sessionToken,
      })
      .select('id')
      .single()

    if (orderError || !order) {
      console.error('[Orders] Order insert failed:', orderError)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // ── 12. Insert order items (rollback on failure) ───────────────────────────
    const { error: itemsError } = await supabaseServer
      .from('order_items')
      .insert(
        orderItemsToInsert.map((oi) => ({
          order_id: order.id,
          item_id:  oi.item_id,
          quantity: oi.quantity,
          price:    oi.price,
        })),
      )

    if (itemsError) {
      await supabaseServer.from('orders').delete().eq('id', order.id)
      console.error('[Orders] Items insert failed — order rolled back:', itemsError)
      return NextResponse.json({ error: 'Failed to save order items' }, { status: 500 })
    }

    // ── 13. Success ───────────────────────────────────────────────────────────
    const encryptedToken = encryptToken(token)
    return NextResponse.json({ token: encryptedToken, orderId: order.id, dailyOrderNumber, total })

  } catch (err) {
    console.error('[Orders] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}