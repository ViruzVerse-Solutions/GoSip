import { unstable_cache } from "next/cache";
import { supabaseBrowser } from "../supabase/client";
import type {
  Branch,
  Category,
  MenuItem,
} from "../types";

// ── Branch ──────────────────────────────────────────────────────────────────
export const fetchBranchBySlug = async (slug: string): Promise<Branch | null> => {
  return unstable_cache(
    async () => {
      const { data, error } = await supabaseBrowser
        .from("branches")
        .select("id, name, slug, logo_url, is_active")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();
      if (error) console.error("fetchBranchBySlug error:", error);
      return (data as Branch) ?? null;
    },
    [`branch-by-slug-v2-${slug}`],
    { revalidate: 3600, tags: ["branch"] }
  )();
};

// ── Full menu in ONE query (branch page) ────────────────────────────────────
export const fetchMenuByBranch = async (branchId: string): Promise<{
  categories: Category[];
  items: MenuItem[];
}> => {
  return unstable_cache(
    async () => {
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
    },
    [`menu-by-branch-v2-${branchId}`],
    { revalidate: 60, tags: ["menu"] }
  )();
};

// ── Signature dishes ─────────────────────────────────────────────────────
export const fetchSignatureItems = async (branchId: string, limit = 5): Promise<MenuItem[]> => {
  return unstable_cache(
    async () => {
      // Get items that have the tags 'bestseller' or 'chef_special'
      const { data: tagRows } = await supabaseBrowser
        .from("item_tags")
        .select("item_id")
        .in("tag", ["bestseller", "chef_special"]);

      if (!tagRows || tagRows.length === 0) return [];

      const itemIds = [...new Set(tagRows.map((r) => r.item_id))];

      const { data: items } = await supabaseBrowser
        .from("menu_items")
        .select("id, name, description, price, image_url, is_veg")
        .in("id", itemIds)
        .eq("branch_id", branchId)
        .eq("is_visible", true)
        .eq("is_available", true)
        .order("sort_order")
        .limit(limit);

      return (items || []) as MenuItem[];
    },
    [`signature-items-v2-${branchId}-${limit}`],
    { revalidate: 60, tags: ["menu"] }
  )();
};

// ── Real-time order updates ──────────────────────────────────────────────
export function subscribeToOrderUpdates(
  orderId: string,
  onUpdate: (updatedOrder: any) => void,
) {
  const channel = supabaseBrowser
    .channel(`order-${orderId}`)
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
