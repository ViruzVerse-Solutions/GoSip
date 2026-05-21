import { supabaseBrowser } from '../supabase/client'
import type { Branch, Category, MenuItem, ItemVariant, ItemTag } from '../types'

// ── Branch ──────────────────────────────────────────────────────────────────
export async function fetchBranchBySlug(slug: string): Promise<Branch | null> {
  const { data } = await supabaseBrowser
    .from('branches')
    .select('id, name, slug, logo_url, is_active')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()
  return (data as Branch) ?? null
}

// ── Full menu in ONE query (branch page) ────────────────────────────────────
export async function fetchMenuByBranch(branchId: string): Promise<{
  categories: Category[]
  items: MenuItem[]
}> {
  const [categoriesResult, itemsResult] = await Promise.all([
    supabaseBrowser
      .from('categories')
      .select('id, branch_id, name, image_url, sort_order')
      .eq('branch_id', branchId)
      .eq('is_visible', true)
      .order('sort_order'),

    supabaseBrowser
      .from('menu_items')
      .select(
        'id, branch_id, category_id, name, description, price, image_url, is_veg, is_available, is_visible, sort_order'
      )
      .eq('branch_id', branchId)
      .eq('is_visible', true)
      .order('sort_order'),
  ])

  return {
    categories: (categoriesResult.data || []) as Category[],
    items: (itemsResult.data || []) as MenuItem[],
  }
}

// ── Item detail with variants + tags in ONE query ────────────────────────────
export async function fetchItemDetail(itemId: string): Promise<{
  item: MenuItem | null
  variants: ItemVariant[]
  tags: ItemTag[]
}> {
  if (!itemId) return { item: null, variants: [], tags: [] }

  const { data } = await supabaseBrowser
    .from('menu_items')
    .select(`
      id, branch_id, category_id, name, description, price,
      image_url, is_veg, is_available, is_visible, sort_order,
      item_variants ( id, item_id, name, price_delta, is_available ),
      item_tags     ( id, item_id, label, color )
    `)
    .eq('id', itemId)
    .single()

  if (!data) return { item: null, variants: [], tags: [] }

  const { item_variants, item_tags, ...item } = data as any
  return {
    item: item as MenuItem,
    variants: (item_variants || []) as ItemVariant[],
    tags: (item_tags || []) as ItemTag[],
  }
}

// ── Tables ───────────────────────────────────────────────────────────────────
export async function fetchTablesByBranch(
  branchId: string
): Promise<{ id: string; table_number: string }[]> {
  const { data } = await supabaseBrowser
    .from('tables')
    .select('id, table_number')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .order('table_number')
  return (data || []) as { id: string; table_number: string }[]
}

// ── Suggested items ──────────────────────────────────────────────────────────
export async function fetchSuggestedItems(
  branchId: string,
  excludeId: string,
  limit = 6
): Promise<MenuItem[]> {
  if (!branchId || !excludeId) return []

  const { data } = await supabaseBrowser
    .from('menu_items')
    .select(
      'id, branch_id, category_id, name, price, image_url, is_veg, is_available, sort_order'
    )
    .eq('branch_id', branchId)
    .neq('id', excludeId)
    .eq('is_visible', true)
    .limit(limit)
    .order('id', { ascending: false })
  return (data || []) as MenuItem[]
}

// ── Order confirmation ───────────────────────────────────────────────────────
export async function fetchOrderByToken(token: string) {
  const { data, error } = await supabaseBrowser
    .from('orders')
    .select(`
      id, token, table_number, status, daily_order_number, total, created_at,
      order_items (
        id, quantity, price,
        menu_items ( id, name, image_url )
      )
    `)
    .eq('token', token)
    .single()
  if (error || !data) return null
  return data
}

// ── Signature dishes ─────────────────────────────────────────────────────
export async function fetchSignatureItems(
  branchId: string,
  limit = 5
): Promise<MenuItem[]> {
  // Get items that have the tags 'bestseller' or 'chef_special'
  const { data: tagRows } = await supabaseBrowser
    .from('item_tags')
    .select('item_id')
    .in('tag', ['bestseller', 'chef_special'])

  if (!tagRows || tagRows.length === 0) return []

  const itemIds = [...new Set(tagRows.map((r) => r.item_id))]

  const { data: items } = await supabaseBrowser
    .from('menu_items')
    .select('id, name, description, price, image_url, is_veg')
    .in('id', itemIds)
    .eq('branch_id', branchId)
    .eq('is_visible', true)
    .eq('is_available', true)
    .order('sort_order')
    .limit(limit)

  return (items || []) as MenuItem[]
}

// ── Real-time order updates ──────────────────────────────────────────────
export function subscribeToOrderUpdates(
  orderId: string,
  onUpdate: (updatedOrder: any) => void
) {
  const channel = supabaseBrowser
    .channel(`order-${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`,
      },
      (payload) => {
        onUpdate(payload.new)
      }
    )
    .subscribe()

  // Return an unsubscribe function
  return () => {
    supabaseBrowser.removeChannel(channel)
  }
}