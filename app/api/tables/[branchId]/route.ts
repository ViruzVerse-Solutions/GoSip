// app/api/tables/[branchId]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { isValidUUID } from '@/lib/security/sanitize'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> },
) {
  try {
    const { branchId } = await params

    // Validate branchId is a proper UUID — prevents SQL injection and probing
    if (!isValidUUID(branchId)) {
      return NextResponse.json({ error: 'Invalid branch ID' }, { status: 400 })
    }

    // Verify the branch is active before serving table data
    const { data: branch, error: branchError } = await supabaseServer
      .from('branches')
      .select('id')
      .eq('id', branchId)
      .eq('is_active', true)
      .single()

    if (branchError || !branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    const sessionToken = req.nextUrl.searchParams.get('sessionToken')
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

    // Fetch tables and active orders in parallel to determine table occupancy
    const [
      { data: tables, error: tablesError },
      { data: activeOrders, error: ordersError }
    ] = await Promise.all([
      supabaseServer
        .from('tables')
        .select('id, table_number')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('table_number'),

      supabaseServer
        .from('orders')
        .select('table_number, session_token')
        .eq('branch_id', branchId)
        .in('status', ['pending'])
        .gte('created_at', twoHoursAgo),
    ])

    if (tablesError || ordersError) {
      console.error('[Tables API] Fetch failed:', tablesError || ordersError)
      return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 })
    }

    // A table is occupied if it has active orders, unless ALL active orders on it belong to the current session token
    const occupiedTables = new Set<string>()
    if (activeOrders) {
      const ordersByTable = new Map<string, typeof activeOrders>()
      for (const order of activeOrders) {
        if (!ordersByTable.has(order.table_number)) {
          ordersByTable.set(order.table_number, [])
        }
        ordersByTable.get(order.table_number)!.push(order)
      }

      for (const [tableNum, orders] of ordersByTable.entries()) {
        const isOccupiedByOthers = orders.some(
          (order) => !order.session_token || order.session_token !== sessionToken
        )
        if (isOccupiedByOthers) {
          occupiedTables.add(tableNum)
        }
      }
    }

    const tablesWithStatus = tables?.map((t) => ({
      id: t.id,
      table_number: t.table_number,
      is_free: !occupiedTables.has(t.table_number),
    })) ?? []

    return NextResponse.json(tablesWithStatus, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    })
  } catch (err) {
    console.error('[Tables API] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
