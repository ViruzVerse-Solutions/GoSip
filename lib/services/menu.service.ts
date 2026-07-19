// lib/services/menu.service.ts
import { cacheLife, cacheTag } from "next/cache";
import { supabaseServer } from "../supabase/server";
import type {
  Branch,
  Category,
  MenuItem,
} from "../types";

// Derived at module init — never hardcoded
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!SUPABASE_URL && process.env.NODE_ENV === 'production') {
  throw new Error('[GoSip] NEXT_PUBLIC_SUPABASE_URL is required')
}

// ── URL helpers ───────────────────────────────────────────────────────────────
function resolveStorageUrl(path?: string | null, bucket?: string): string | undefined {
  if (!path) return undefined

  const storageIndex = path.indexOf('/storage/v1/object/public/')
  if (storageIndex !== -1 && SUPABASE_URL) {
    return `${SUPABASE_URL}${path.substring(storageIndex)}`
  }

  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) {
    return path
  }

  if (!SUPABASE_URL || !bucket) return undefined
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
}

const resolveLogoUrl      = (path?: string | null) => resolveStorageUrl(path, 'logos')
const resolveItemImageUrl = (path?: string | null) => resolveStorageUrl(path, 'menu-items')

// ── Branch ───────────────────────────────────────────────────────────────────
export const fetchBranchBySlug = async (slug: string): Promise<Branch | null> => {
  'use cache'
  cacheLife('seconds')
  cacheTag(`branch-${slug}`, 'branch')

  const { data, error } = await supabaseServer
    .from("branches")
    .select(`
      id, 
      name, 
      slug, 
      logo_url, 
      is_active,
      is_open,
      default_gst_rate,
      is_gst_inclusive,
      type,
      branch_subscriptions (
        status,
        plans (
          features
        )
      )
    `)
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("fetchBranchBySlug error:", error)
    }
    return null
  }

  if (!data) return null;

  // Determine features from active subscription
  let features: string[] = [];
  const sub = (Array.isArray(data.branch_subscriptions) ? data.branch_subscriptions[0] : data.branch_subscriptions) as any;
  if (sub) {
    const activeStatuses = ['active', 'trial', 'grace'];
    if (activeStatuses.includes(sub.status) && sub.plans) {
      const plans = Array.isArray(sub.plans) ? sub.plans[0] : sub.plans;
      if (plans?.features) {
        features = plans.features;
      }
    } else {
      features = [];
    }
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    logo_url: resolveLogoUrl(data.logo_url),
    is_active: data.is_active,
    is_open: data.is_open ?? true,
    default_gst_rate: data.default_gst_rate,
    is_gst_inclusive: data.is_gst_inclusive,
    type: data.type,
    features
  } as Branch;
};

// ── Full menu in ONE query — categories + items via nested select ─────────────
// Uses supabaseServer (service role key) since this runs inside a Server Component.
export const fetchMenuByBranch = async (branchId: string): Promise<{
  categories: Category[];
  items: MenuItem[];
}> => {
  'use cache'
  cacheLife('seconds')
  cacheTag(`menu-${branchId}`, 'menu')

  const [categoriesResult, itemsResult] = await Promise.all([
    supabaseServer
      .from("categories")
      .select("id, branch_id, name, image_url, sort_order, is_visible")
      .eq("branch_id", branchId)
      .eq("is_visible", true)
      .order("sort_order"),

    supabaseServer
      .from("menu_items")
      .select(
        "id, branch_id, category_id, name, description, price, image_url, is_veg, is_available, is_visible, sort_order, gst_rate, created_at, updated_at",
      )
      .eq("branch_id", branchId)
      .eq("is_visible", true)
      .order("sort_order"),
  ]);

  if (categoriesResult.error) {
    console.error("[fetchMenuByBranch] categories error:", categoriesResult.error)
  }
  if (itemsResult.error) {
    console.error("[fetchMenuByBranch] items error:", itemsResult.error)
  }

  return {
    categories: (categoriesResult.data || []) as Category[],
    items: ((itemsResult.data || []) as MenuItem[]).map(item => ({
      ...item,
      image_url: resolveItemImageUrl(item.image_url)
    })),
  };
};

// ── Signature dishes ──────────────────────────────────────────────────────────
// Uses supabaseServer since this runs in a Server Component (branch layout).
export const fetchSignatureItems = async (branchId: string, limit = 5): Promise<MenuItem[]> => {
  'use cache'
  cacheLife('seconds')
  cacheTag(`signature-${branchId}-${limit}`, 'menu')

  const { data, error } = await supabaseServer
    .from("menu_items")
    .select(`
      id, branch_id, category_id, name, description, price, original_price,
      image_url, is_veg, is_available, is_visible, sort_order, gst_rate, created_at, updated_at,
      item_tags!inner(tag)
    `)
    .eq("branch_id", branchId)
    .eq("is_visible", true)
    .eq("is_available", true)
    .in("item_tags.tag", ["bestseller", "chef_special"])
    .order("sort_order")
    .limit(limit);

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("fetchSignatureItems error:", error)
    }
    return [];
  }

  return (data || []).map(({ item_tags, ...item }) => ({
    ...item,
    image_url: resolveItemImageUrl(item.image_url)
  })) as MenuItem[];
};

