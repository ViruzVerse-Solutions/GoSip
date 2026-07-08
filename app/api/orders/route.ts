// app/api/orders/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
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
    if (await isIpRateLimited(clientIp)) {
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

    const { sessionToken, tableNumber, branchId, items, notes } = body as {
      sessionToken: string
      tableNumber:  string
      branchId:     string
      items:        { itemId: string; quantity: number }[]
      notes?:       string
    }

    // ── 4. Session-based rate limiting (Layer 2 — per user, not per table) ────
    // A session token is a UUID generated when the user selects their table.
    // It persists 4 hours in localStorage. Limit: 3 orders per session.
    if (await isSessionRateLimited(sessionToken)) {
      return NextResponse.json(
        { error: 'You have reached the order limit for this session. Please start a new session.' },
        { status: 429, headers: { 'Retry-After': '7200' } },
      )
    }

    const trimmedTable = tableNumber.trim()
    const today        = getIstDate()
    const itemIds      = items.map((i) => i.itemId)
    const orderNotes   = notes?.trim()

    // ── 5 + 6. Verify branch + table in ONE parallel round-trip ───────────────
    const [
      { data: branch, error: branchError },
      { data: tableRow, error: tableError },
    ] = await Promise.all([
      supabaseServer
        .from('branches')
        .select(`
          id, 
          slug, 
          is_open, 
          default_gst_rate, 
          is_gst_inclusive,
          branch_subscriptions (
            status,
            plans (
              features
            )
          )
        `)
        .eq('id', branchId)
        .eq('is_active', true)
        .single(),

      supabaseServer
        .from('tables')
        .select('id')
        .eq('branch_id', branchId)
        .eq('table_number', tableNumber.trim())
        .eq('is_active', true)
        .single(),
    ])

    if (branchError || !branch) {
      return NextResponse.json({ error: 'Invalid or inactive branch' }, { status: 400 })
    }
    if (tableError || !tableRow) {
      return NextResponse.json({ error: 'Invalid or inactive table selection' }, { status: 400 })
    }

    // ── Check if order notes are allowed for this branch ──────────────────────
    let finalNotes = null;
    let features: string[] = [];
    const sub = (Array.isArray(branch.branch_subscriptions) ? branch.branch_subscriptions[0] : branch.branch_subscriptions) as any;
    if (sub) {
      const activeStatuses = ['active', 'trial', 'grace'];
      if (activeStatuses.includes(sub.status) && sub.plans) {
        const plans = Array.isArray(sub.plans) ? sub.plans[0] : sub.plans;
        if (plans?.features) {
          features = plans.features;
        }
      }
    }

    if (orderNotes && features.includes('order_notes')) {
      finalNotes = orderNotes;
    }

    // ── 5.1. Verify session token matches HttpOnly cookie ──────────────────────
    // Production resilience: In serverless/edge environments, cookies may be absent
    // on the very first request after a cold start, or after a QR redirect where the
    // POST /api/session cookie Set-header hasn't been committed yet.
    //
    // Strategy:
    //   A) Cookie present + matches client token → allow (normal path)
    //   B) Cookie missing → re-register (write the cookie now) and allow
    //      The session token itself is still rate-limited above so this is safe.
    //   C) Cookie present but MISMATCHES client token → reject (tamper attempt)
    const cookieStore = await cookies()
    const cookieToken = cookieStore.get(`gosip-session-${branch.slug}`)?.value

    if (cookieToken && cookieToken !== sessionToken) {
      // Case C: A cookie exists but holds a different token — reject
      return NextResponse.json(
        { error: 'Session expired or invalid. Please scan the table QR code again.' },
        { status: 401 }
      )
    }

    if (!cookieToken) {
      // Case B: No cookie — re-register silently so subsequent requests work normally
      cookieStore.set(`gosip-session-${branch.slug}`, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 2 * 60 * 60,
      })
      cookieStore.set(`gosip-table-${branch.slug}`, trimmedTable, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 2 * 60 * 60,
      })
    }
    // Case A: cookie === sessionToken → proceed normally (no action needed)

    if (!branch.is_open) {
      return NextResponse.json({ error: 'This branch is currently closed and not accepting orders' }, { status: 400 })
    }

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

    // ── 6.1. Verify table is not occupied by another active order ─────────────
    const { data: existingActiveOrders, error: checkOccupiedError } = await supabaseServer
      .from('orders')
        .select('id, session_token, total, status')
      .eq('branch_id', branchId)
      .eq('table_number', trimmedTable)
      .in('status', ['pending', 'delivered'])
      .gte('created_at', twoHoursAgo)

    if (checkOccupiedError) {
      console.error('[Orders] Table check failed:', checkOccupiedError)
      return NextResponse.json({ error: 'Failed to verify table status' }, { status: 500 })
    }

    if (existingActiveOrders && existingActiveOrders.length > 0) {
      // Block if there is a pending or delivered order from another session
      const hasOtherSessionPendingOrder = existingActiveOrders.some(
        (order) => ['pending', 'delivered'].includes(order.status) && (!order.session_token || order.session_token !== sessionToken)
      )
      if (hasOtherSessionPendingOrder) {
        return NextResponse.json({ error: 'This table is occupied. Please wait for the previous order to be served.' }, { status: 409 })
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
        .select('id, price, is_available, gst_rate')
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

    // ── 8. Validate every item & Calculate GST ───────────────────────────────
    const menuItemsMap = new Map(menuItems.map((mi) => [mi.id, mi]))
    let calculatedSubtotal = 0
    let calculatedCgst = 0
    let calculatedSgst = 0
    const orderItemsToInsert: { item_id: string; quantity: number; price: number }[] = []

    const isInclusive = branch.is_gst_inclusive ?? false
    const branchDefaultGst = branch.default_gst_rate ?? 5.0

    for (const { itemId, quantity } of items) {
      const menuItem = menuItemsMap.get(itemId)
      if (!menuItem) {
        return NextResponse.json({ error: 'Item not found in this branch' }, { status: 400 })
      }
      if (!menuItem.is_available) {
        return NextResponse.json({ error: 'An item in your cart is no longer available' }, { status: 400 })
      }
      
      const itemGst = menuItem.gst_rate ?? branchDefaultGst
      const basePrice = menuItem.price * quantity

      if (isInclusive) {
        const base = basePrice / (1 + itemGst / 100)
        const tax = basePrice - base
        calculatedSubtotal += base
        calculatedCgst += tax / 2
        calculatedSgst += tax / 2
      } else {
        calculatedSubtotal += basePrice
        const tax = basePrice * (itemGst / 100)
        calculatedCgst += tax / 2
        calculatedSgst += tax / 2
      }

      orderItemsToInsert.push({ item_id: itemId, quantity, price: menuItem.price })
    }

    const total = calculatedSubtotal + calculatedCgst + calculatedSgst

    // ── 9. Generate daily order number ────────────────────────────────────────
    if (dailyNumberResult.error || dailyNumberResult.data == null) {
      console.error('[Orders] Daily number generation failed:', dailyNumberResult.error)
      return NextResponse.json({ error: 'Failed to generate order number' }, { status: 500 })
    }
    const dailyOrderNumber = dailyNumberResult.data as number

    // ── 10. Generate cryptographically-secure order token ─────────────────────
    const token = generateSecureToken()

    // ── 11. Insert order and items atomically via RPC (with manual fallback) ──
    let orderId = ''
    let useFallback = false

    try {
      const { data: resultData, error: rpcError } = await supabaseServer.rpc('place_order_atomic', {
        p_branch_id:           branchId,
        p_table_number:        trimmedTable,
        p_token:               token,
        p_daily_order_number:  dailyOrderNumber,
        p_total:               parseFloat(total.toFixed(2)),
        p_subtotal:            parseFloat(calculatedSubtotal.toFixed(2)),
        p_cgst:                parseFloat(calculatedCgst.toFixed(2)),
        p_sgst:                parseFloat(calculatedSgst.toFixed(2)),
        p_session_token:       sessionToken,
        p_notes:               finalNotes,
        p_items:               orderItemsToInsert
      })

      if (rpcError) {
        // 42883 is the PG code for undefined_function (meaning the place_order_atomic SQL has not been executed yet)
        if (rpcError.code === '42883' || rpcError.message.includes('function') || rpcError.message.includes('does not exist')) {
          useFallback = true
        } else {
          console.error('[Orders] Atomic placement failed:', rpcError)
          return NextResponse.json({ error: 'Failed to place order atomically' }, { status: 500 })
        }
      } else {
        orderId = resultData as string
      }
    } catch {
      useFallback = true
    }

    if (useFallback) {
      // ── Fallback: Manual sequential inserts (original behavior) ─────────────
      const { data: order, error: orderError } = await supabaseServer
        .from('orders')
        .insert({
          branch_id:           branchId,
          table_number:        trimmedTable,
          token,
          daily_order_number:  dailyOrderNumber,
          total:               parseFloat(total.toFixed(2)),
          subtotal:            parseFloat(calculatedSubtotal.toFixed(2)),
          cgst_amount:         parseFloat(calculatedCgst.toFixed(2)),
          sgst_amount:         parseFloat(calculatedSgst.toFixed(2)),
          status:              'pending',
          session_token:       sessionToken,
          notes:               finalNotes,
        })
        .select('id')
        .single()

      if (orderError || !order) {
        console.error('[Orders] Order insert failed:', orderError)
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
      }

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

      orderId = order.id
    }

    // ── 13. Success ───────────────────────────────────────────────────────────
    const encryptedToken = encryptToken(token)
    return NextResponse.json({ token: encryptedToken, orderId, dailyOrderNumber, total })

  } catch (err) {
    console.error('[Orders] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}