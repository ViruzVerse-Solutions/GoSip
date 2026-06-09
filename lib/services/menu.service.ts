import { unstable_cache } from "next/cache";
import { supabaseBrowser } from "../supabase/client";
import type {
  Branch,
  Category,
  MenuItem,
} from "../types";

// ── Branch ──────────────────────────────────────────────────────────────────
export const fetchBranchBySlug = async (slug: string): Promise<Branch | null> => {
  const fetchFn = async () => {
    const { data, error } = await supabaseBrowser
      .from("branches")
      .select("id, name, slug, logo_url, is_active")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) console.error("fetchBranchBySlug error:", error);
    return (data as Branch) ?? null;
  };

  if (process.env.NODE_ENV === 'development') {
    return fetchFn();
  }

  return unstable_cache(
    fetchFn,
    [`branch-by-slug-v2-${slug}`],
    { revalidate: 3600, tags: ["branch"] }
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
      items: (itemsResult.data || []) as MenuItem[],
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
    return (data || []).map(({ item_tags, ...item }) => item) as MenuItem[];
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
