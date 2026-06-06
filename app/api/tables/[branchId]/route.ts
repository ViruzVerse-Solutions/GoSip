// app/api/tables/[branchId]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { isValidUUID } from '@/lib/security/sanitize'

export async function GET(
  _req: NextRequest,
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
        .select('table_number')
        .eq('branch_id', branchId)
        .in('status', ['pending', 'delivered']),
    ])

    if (tablesError || ordersError) {
      console.error('[Tables API] Fetch failed:', tablesError || ordersError)
      return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 })
    }

    const occupiedTables = new Set(activeOrders?.map((o) => o.table_number) ?? [])

    const tablesWithStatus = tables?.map((t) => ({
      id: t.id,
      table_number: t.table_number,
      is_free: !occupiedTables.has(t.table_number),
    })) ?? []

    return NextResponse.json(tablesWithStatus)
  } catch (err) {
    console.error('[Tables API] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
