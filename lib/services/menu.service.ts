// lib/services/menu.service.ts
import { unstable_cache } from "next/cache";
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
  if (storageIndex !== -1) {
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
  const fetchFn = async () => {
    const { data, error } = await supabaseServer
      .from("branches")
      .select(`
        id, 
        name, 
        slug, 
        logo_url, 
        is_active,
        is_open,
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

// ── Full menu in ONE query — categories + items via nested select ─────────────
// Uses supabaseServer (service role key) since this runs inside a Server Component.
export const fetchMenuByBranch = async (branchId: string): Promise<{
  categories: Category[];
  items: MenuItem[];
}> => {
  const fetchFn = async () => {
    const [categoriesResult, itemsResult] = await Promise.all([
      supabaseServer
        .from("categories")
        .select("id, branch_id, name, image_url, sort_order")
        .eq("branch_id", branchId)
        .eq("is_visible", true)
        .order("sort_order"),

      supabaseServer
        .from("menu_items")
        .select(
          "id, branch_id, category_id, name, description, price, image_url, is_veg, is_available, is_visible, sort_order, created_at, updated_at",
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

  if (process.env.NODE_ENV === 'development') {
    return fetchFn();
  }

  return unstable_cache(
    fetchFn,
    [`menu-by-branch-v2-${branchId}`],
    { revalidate: 60, tags: ["menu"] }
  )();
};

// ── Signature dishes ──────────────────────────────────────────────────────────
// Uses supabaseServer since this runs in a Server Component (branch layout).
export const fetchSignatureItems = async (branchId: string, limit = 5): Promise<MenuItem[]> => {
  const fetchFn = async () => {
    const { data, error } = await supabaseServer
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

  if (process.env.NODE_ENV === 'development') {
    return fetchFn();
  }

  return unstable_cache(
    fetchFn,
    [`signature-items-v3-${branchId}-${limit}`],
    { revalidate: 60, tags: ["menu"] }
  )();
};

// ── Real-time order updates ───────────────────────────────────────────────────
// Note: This uses the browser client (supabaseBrowser) since it's called from
// client components and Supabase Realtime requires a persistent WebSocket connection.
import { supabaseBrowser } from "../supabase/client";

export function subscribeToOrderUpdates(
  orderId: string,
  onUpdate: (updatedOrder: any) => void,
  sessionToken?: string | null,
) {
  const uniqueId = Math.random().toString(36).substring(7);

  const handleReconnect = (channel: ReturnType<typeof supabaseBrowser.channel>) => {
    channel.on('system' as any, { event: 'disconnect' }, () => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[GoSip] Realtime disconnected for order ${orderId}. Reconnecting...`)
      }
      setTimeout(() => channel.subscribe(), 2000)
    })
  }

  if (sessionToken) {
    const channel = supabaseBrowser
      .channel(`order-session-${sessionToken}-${uniqueId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          const newRec = payload.new as any;
          const oldRec = payload.old as any;
          if (
            (newRec && newRec.session_token === sessionToken) ||
            (oldRec && oldRec.session_token === sessionToken)
          ) {
            onUpdate(newRec || oldRec || {});
          }
        },
      )
      .subscribe()

    handleReconnect(channel)

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }

  const channel = supabaseBrowser
    .channel(`order-${orderId}-${uniqueId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
        filter: `id=eq.${orderId}`,
      },
      (payload) => {
        onUpdate(payload.new || payload.old || {});
      },
    )
    .subscribe()

  handleReconnect(channel)

  return () => {
    supabaseBrowser.removeChannel(channel);
  };
}
