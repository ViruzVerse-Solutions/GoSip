import { unstable_cache } from "next/cache";
import { supabaseBrowser } from "../supabase/client";
import { supabaseServer } from "../supabase/server";
import type {
  Branch,
  Category,
  MenuItem,
} from "../types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ypmplltikpknlmwftveu.supabase.co';

function resolveLogoUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  
  const storageIndex = path.indexOf('/storage/v1/object/public/');
  if (storageIndex !== -1) {
    return `${SUPABASE_URL}${path.substring(storageIndex)}`;
  }

  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) {
    return path;
  }
  return `${SUPABASE_URL}/storage/v1/object/public/logos/${path}`;
}

function resolveItemImageUrl(path?: string | null): string | undefined {
  if (!path) return undefined;

  const storageIndex = path.indexOf('/storage/v1/object/public/');
  if (storageIndex !== -1) {
    return `${SUPABASE_URL}${path.substring(storageIndex)}`;
  }

  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) {
    return path;
  }
  return `${SUPABASE_URL}/storage/v1/object/public/menu-items/${path}`;
}

// ── Branch ──────────────────────────────────────────────────────────────────
export const fetchBranchBySlug = async (slug: string): Promise<Branch | null> => {
  const fetchFn = async () => {
    const { data, error } = await supabaseServer
      .from("branches")
      .select(`
        id, 
        name, 
        slug, 
        logo_url, 
        is_active,
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
      
    if (error) console.error("fetchBranchBySlug error:", error);
    
    if (!data) return null;

    // Determine features from active subscription
    let features: string[] = []; // Default to no features if subscription cannot be verified
    const sub = (Array.isArray(data.branch_subscriptions) ? data.branch_subscriptions[0] : data.branch_subscriptions) as any;
    if (sub) {
      const activeStatuses = ['active', 'trial', 'grace'];
      if (activeStatuses.includes(sub.status) && sub.plans) {
        const plans = Array.isArray(sub.plans) ? sub.plans[0] : sub.plans;
        if (plans?.features) {
          features = plans.features;
        }
      } else {
        // Expired or cancelled subscriptions have no active features
        features = [];
      }
    }

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      logo_url: resolveLogoUrl(data.logo_url),
      is_active: data.is_active,
      features
    } as Branch;
  };

  if (process.env.NODE_ENV === 'development') {
    return fetchFn();
  }

  return unstable_cache(
    fetchFn,
    [`branch-by-slug-v2-${slug}`],
    { revalidate: 60, tags: ["branch"] }
  )();
};

// ── Full menu in ONE query (branch page) ────────────────────────────────────
export const fetchMenuByBranch = async (branchId: string): Promise<{
  categories: Category[];
  items: MenuItem[];
}> => {
  const fetchFn = async () => {
    const [categoriesResult, itemsResult] = await Promise.all([
      supabaseBrowser
        .from("categories")
        .select("id, branch_id, name, image_url, sort_order")
        .eq("branch_id", branchId)
        .eq("is_visible", true)
        .order("sort_order"),

      supabaseBrowser
        .from("menu_items")
        .select(
          "id, branch_id, category_id, name, description, price, image_url, is_veg, is_available, is_visible, sort_order",
        )
        .eq("branch_id", branchId)
        .eq("is_visible", true)
        .order("sort_order"),
    ]);

    return {
      categories: (categoriesResult.data || []) as Category[],
      items: ((itemsResult.data || []) as MenuItem[]).map(item => ({
        ...item,
        image_url: resolveItemImageUrl(item.image_url)
      })),
    };
  };

  if (process.env.NODE_ENV === 'development') {
    return fetchFn();
  }

  return unstable_cache(
    fetchFn,
    [`menu-by-branch-v2-${branchId}`],
    { revalidate: 60, tags: ["menu"] }
  )();
};

// ── Signature dishes ─────────────────────────────────────────────────────
export const fetchSignatureItems = async (branchId: string, limit = 5): Promise<MenuItem[]> => {
  const fetchFn = async () => {
    // Get menu items that have 'bestseller' or 'chef_special' tags using an inner join.
    // This collapses two network queries into a single highly optimized database call.
    const { data, error } = await supabaseBrowser
      .from("menu_items")
      .select(`
        id, branch_id, category_id, name, description, price, original_price,
        image_url, is_veg, is_available, is_visible, sort_order, created_at, updated_at,
        item_tags!inner(tag)
      `)
      .eq("branch_id", branchId)
      .eq("is_visible", true)
      .eq("is_available", true)
      .in("item_tags.tag", ["bestseller", "chef_special"])
      .order("sort_order")
      .limit(limit);

    if (error) {
      console.error("fetchSignatureItems error:", error);
      return [];
    }

    // Map the result to strip out the nested join data and match the MenuItem type signature.
    return (data || []).map(({ item_tags, ...item }) => ({
      ...item,
      image_url: resolveItemImageUrl(item.image_url)
    })) as MenuItem[];
  };

  if (process.env.NODE_ENV === 'development') {
    return fetchFn();
  }

  return unstable_cache(
    fetchFn,
    [`signature-items-v3-${branchId}-${limit}`],
    { revalidate: 60, tags: ["menu"] }
  )();
};

// ── Real-time order updates ──────────────────────────────────────────────
export function subscribeToOrderUpdates(
  orderId: string,
  onUpdate: (updatedOrder: any) => void,
) {
  const uniqueId = Math.random().toString(36).substring(7);
  const channel = supabaseBrowser
    .channel(`order-${orderId}-${uniqueId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `id=eq.${orderId}`,
      },
      (payload) => {
        onUpdate(payload.new);
      },
    )
    .subscribe();

  // Return an unsubscribe function
  return () => {
    supabaseBrowser.removeChannel(channel);
  };
}
