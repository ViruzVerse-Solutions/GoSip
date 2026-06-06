//app/[branch]/orders/page.tsx

"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useSession } from "@/lib/context/session-context";
import { useLanguage } from "@/lib/context/language-context";
import { subscribeToOrder, fetchOrder } from "@/lib/services/order.service";
import {
  MdArrowBack,
  MdReceipt,
  MdTableBar,
  MdChevronRight,
  MdInbox,
  MdAccessTime,
} from "react-icons/md";

const STATUS_STYLE: Record<
  string,
  { color: string; bg: string; border: string; labelKey: string }
> = {
  pending: {
    labelKey: 'pending',
    color: "#b45309",
    bg: "#fffbeb",
    border: "#fde68a",
  },
  delivered: {
    labelKey: 'delivered',
    color: "#15803d",
    bg: "#f0fdf4",
    border: "#bbf7d0",
  },
  cancelled: {
    labelKey: 'cancelled',
    color: "#b91c1c",
    bg: "#fff1f2",
    border: "#fecdd3",
  },
  collected: {
    labelKey: 'collected',
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
  },
};

function placedAt(orderPlacedAt: number): string {
  const d = new Date(orderPlacedAt);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${String(h % 12 || 12).padStart(2, "0")}:${m} ${h >= 12 ? "PM" : "AM"}`;
}

export default function OrdersHistoryPage() {
  const { activeOrders, updateOrderStatus, onOrderCollected } = useSession();
  const router = useRouter();
  const params = useParams();
  const branchSlug = params.branch as string;
  const { t } = useLanguage();

  function timeAgoLocale(orderPlacedAt: number): string {
    const diff = Math.floor((Date.now() - orderPlacedAt) / 1000);
    if (diff < 60) return t('justNow');
    if (diff < 3600) return `${Math.floor(diff / 60)}${t('mAgo')}`;
    return `${Math.floor(diff / 3600)}${t('hAgo')}`;
  }

  const [tick, setTick] = useState(0);
  // Track which orderIds we're already subscribed to
  const subscribedIds = useRef<Set<string>>(new Set());
  const unsubscribeFns = useRef<Map<string, () => void>>(new Map());
  const updateOrderStatusRef = useRef(updateOrderStatus);

  useEffect(() => {
    updateOrderStatusRef.current = updateOrderStatus;
  }, [updateOrderStatus]);

  // Synchronize active order statuses from database on mount
  useEffect(() => {
    let active = true;
    const syncOrders = async () => {
      for (const order of activeOrders) {
        try {
          const data = await fetchOrder(order.token);
          if (!active) return;
          if (data && data.status) {
            if (data.status === "collected") {
              onOrderCollected(order.orderId);
            } else {
              updateOrderStatusRef.current(order.orderId, data.status);
            }
          }
        } catch (err) {
          console.error(`Failed to sync order ${order.orderId}:`, err);
        }
      }
    };
    if (activeOrders.length > 0) {
      syncOrders();
    }
    return () => {
      active = false;
    };
  }, [activeOrders, onOrderCollected]);

  // Tick for timeAgo refresh
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // Subscribe to realtime updates for every active order
  useEffect(() => {
    activeOrders.forEach((order) => {
      // Skip if already subscribed
      if (subscribedIds.current.has(order.orderId)) return;

      subscribedIds.current.add(order.orderId);

const unsub = subscribeToOrder(order.orderId, (updated) => {
  if (updated.status) {
    updateOrderStatusRef.current(order.orderId, updated.status);
  }
});

      unsubscribeFns.current.set(order.orderId, unsub);
    });

    // Unsubscribe from orders that are no longer active
    unsubscribeFns.current.forEach((unsub, orderId) => {
      const stillActive = activeOrders.some((o) => o.orderId === orderId);
      if (!stillActive) {
        unsub();
        unsubscribeFns.current.delete(orderId);
        subscribedIds.current.delete(orderId);
      }
    });
  }, [activeOrders, updateOrderStatus]);

  // Cleanup all subscriptions on unmount
  useEffect(() => {
    return () => {
      unsubscribeFns.current.forEach((unsub) => unsub());
      unsubscribeFns.current.clear();
      subscribedIds.current.clear();
    };
  }, []);

  const sortedOrders = [...activeOrders].sort(
    (a, b) => b.orderPlacedAt - a.orderPlacedAt,
  );

  return (
    <div className="min-h-screen pb-32 bg-gray-50">
      {/* Header */}
      <div
        className="bg-primary-600 text-white px-5 pt-10 pb-14 rounded-b-3xl relative overflow-hidden"
        style={{ boxShadow: "var(--shadow-header)" }}
      >
        <div
          className="absolute -top-10 -right-10 w-36 h-36 rounded-full"
          style={{ background: "rgba(255,255,255,0.06)" }}
        />

        <button
          onClick={() => router.push(`/${branchSlug}`)}
          className="relative z-10 flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full text-sm font-semibold"
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <MdArrowBack className="w-4 h-4" /> {t('back')}
        </button>

        <div className="relative flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <MdReceipt style={{ fontSize: 22, color: "#fff" }} />
          </div>
          <div>
            <h1
              className="text-2xl font-bold text-white"
              style={{ letterSpacing: "-0.5px" }}
            >
              {t('yourOrders')}
            </h1>
            <p className="text-white/70 text-sm">
              {activeOrders.length > 0
                ? `${activeOrders.length} ${activeOrders.length !== 1 ? t('orders') : t('order')}`
                : t('noOrdersYet')}
            </p>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="max-w-lg mx-auto px-4 -mt-6 relative z-10 space-y-3 pb-6">
        {sortedOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl flex flex-col items-center justify-center py-14 px-6 text-center"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3 bg-gray-100">
              <MdInbox style={{ fontSize: 26, color: "#9E9E9E" }} />
            </div>
            <p className="font-semibold text-gray-400 text-sm mb-1">
              {t('noOrdersYet')}
            </p>
            <p className="text-xs text-gray-300">
              {t('ordersWillAppear')}
            </p>
          </motion.div>
        ) : (
          sortedOrders.map((order, i) => {
            const statusStyle =
              STATUS_STYLE[order.status ?? "pending"] ?? STATUS_STYLE.pending;
            const statusLabel = t(statusStyle.labelKey as Parameters<typeof t>[0]);
            return (
              <motion.button
                key={order.token}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                whileTap={{ scale: 0.98 }}
                onClick={() =>
                  router.push(`/${branchSlug}/order/${order.token}`)
                }
                className="w-full text-left bg-white rounded-2xl overflow-hidden transition-shadow hover:shadow-md"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                {/* Top row */}
                <div
                  className="flex items-center justify-between px-5 pt-4 pb-3"
                  style={{ borderBottom: "1px solid #f5f5f5" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary-600 text-base">
                      Order #{order.dailyOrderNumber}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    <span className="flex items-center gap-1 text-gray-400 text-xs">
                      <MdTableBar className="w-3.5 h-3.5 text-primary-500" />
                      {t('table')} {order.tableNumber}
                    </span>
                  </div>
                  <MdChevronRight className="w-5 h-5 text-gray-300" />
                </div>

                {/* Bottom row */}
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <MdAccessTime className="w-3.5 h-3.5" />
                    {placedAt(order.orderPlacedAt)} ·{" "}
                    {timeAgoLocale(order.orderPlacedAt)}
                  </span>
                  <motion.span
                    key={order.status}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{
                      color: statusStyle.color,
                      background: statusStyle.bg,
                      border: `1px solid ${statusStyle.border}`,
                    }}
                  >
                    {statusLabel}
                  </motion.span>
                </div>
              </motion.button>
            );
          })
        )}
      </div>

      {/* Footer CTA */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-white/90 backdrop-blur-sm border-t border-gray-200 px-4 py-3">
        <button
          onClick={() => router.push(`/${branchSlug}`)}
          className="w-full max-w-lg mx-auto block bg-primary-600 hover:bg-primary-700 active:scale-[0.98] text-white font-semibold py-3.5 rounded-xl transition-all"
          style={{ boxShadow: "var(--shadow-btn)" }}
        >
          {t('backToMenu')}
        </button>
      </div>
    </div>
  );
}
