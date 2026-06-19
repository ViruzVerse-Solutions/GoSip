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
import { Cormorant_Garamond } from "next/font/google";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

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

  const syncedRef = useRef(false);

  // Synchronize active order statuses from database once on mount
  useEffect(() => {
    if (syncedRef.current) return;
    if (activeOrders.length === 0) return;

    syncedRef.current = true;
    let active = true;

    const syncOrders = async () => {
      const ordersToSync = [...activeOrders];
      for (const order of ordersToSync) {
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

    syncOrders();

    return () => {
      active = false;
    };
  }, [activeOrders.length, onOrderCollected]);

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
    <div className={`min-h-screen pb-32 relative overflow-hidden bg-[#fbfbfb] ${cormorant.variable}`}>
      {/* Ambient Background Blobs */}
      <div className="fixed top-[10%] -left-20 w-96 h-96 bg-primary-200/20 rounded-full blur-[80px] pointer-events-none" />
      <div className="fixed top-[40%] -right-20 w-[30rem] h-[30rem] bg-primary-100/30 rounded-full blur-[100px] pointer-events-none" />

      {/* Luxury Header */}
      <div
        className="bg-gradient-to-br from-primary-800 via-primary-900 to-black text-white px-6 pt-14 pb-24 rounded-b-[2.5rem] relative overflow-hidden"
        style={{ boxShadow: "0 20px 40px -15px rgba(0,0,0,0.3)" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary-400/20 via-transparent to-transparent opacity-60" />
        <div
          className="absolute -top-12 -right-12 w-64 h-64 rounded-full blur-3xl opacity-40 pointer-events-none"
          style={{ background: "rgba(255,255,255,0.15)" }}
        />
        <div
          className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ background: "rgba(255,255,255,0.1)" }}
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

        <div className="relative flex items-center gap-4 mt-2">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-xl"
            style={{ 
              background: "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 100%)",
              border: "1px solid rgba(255,255,255,0.2)",
              boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.1)"
            }}
          >
            <MdReceipt style={{ fontSize: 26, color: "#fff" }} />
          </div>
          <div>
            <h1
              className="text-4xl md:text-5xl font-bold text-white tracking-tight drop-shadow-lg"
              style={{ fontFamily: "var(--font-cormorant)", letterSpacing: "-1px" }}
            >
              {t('yourOrders')}
            </h1>
            <p className="text-white/80 text-sm font-medium tracking-wide uppercase" style={{ fontSize: "10px", letterSpacing: "1.5px" }}>
              {activeOrders.length > 0
                ? `${activeOrders.length} ${activeOrders.length !== 1 ? t('orders') : t('order')}`
                : t('noOrdersYet')}
            </p>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="max-w-lg mx-auto px-4 -mt-10 relative z-10 space-y-4 pb-6">
        {sortedOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[2rem] flex flex-col items-center justify-center py-20 px-6 text-center backdrop-blur-xl relative overflow-hidden"
            style={{ 
              background: "rgba(255, 255, 255, 0.7)",
              border: "1px solid rgba(255,255,255,0.8)",
              boxShadow: "0 10px 40px -10px rgba(0,0,0,0.05)"
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5 bg-white shadow-xl shadow-primary-900/5 relative z-10">
              <MdInbox style={{ fontSize: 32, color: "var(--color-primary-300)" }} />
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, type: "spring", stiffness: 100 }}
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(`/${branchSlug}/order/${order.token}`)}
                className="w-full text-left relative overflow-hidden group rounded-3xl backdrop-blur-xl transition-all"
                style={{ 
                  background: "rgba(255, 255, 255, 0.8)",
                  border: "1px solid rgba(255,255,255,0.9)",
                  boxShadow: "0 12px 30px -10px rgba(0,0,0,0.05)"
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-white/20 pointer-events-none" />
                
                {/* Top row */}
                <div className="relative flex items-center justify-between px-6 pt-6 pb-4">
                  <div className="flex flex-col gap-1">
                    <span 
                      className="font-bold text-gray-900 text-2xl"
                      style={{ fontFamily: "var(--font-cormorant)", letterSpacing: "-0.5px" }}
                    >
                      Order #{order.dailyOrderNumber}
                    </span>
                    <span className="flex items-center gap-1.5 text-gray-500 text-xs font-medium tracking-wide uppercase">
                      <MdTableBar className="w-4 h-4 text-primary-500" />
                      {t('table')} {order.tableNumber}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                    <MdChevronRight className="w-6 h-6" />
                  </div>
                </div>

                {/* Bottom row */}
                <div className="relative flex items-center justify-between px-6 py-4 bg-gradient-to-r from-gray-50/50 to-transparent">
                  <span className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold uppercase tracking-wider" style={{ fontSize: "10px" }}>
                    <MdAccessTime className="w-4 h-4 text-primary-400" />
                    {placedAt(order.orderPlacedAt)} <span className="opacity-40">|</span> {timeAgoLocale(order.orderPlacedAt)}
                  </span>
                  <motion.span
                    key={order.status}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm"
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
      <div className="fixed bottom-0 inset-x-0 z-50 p-6 pointer-events-none">
        <div className="max-w-lg mx-auto relative">
          <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent -bottom-6 -inset-x-6 -top-12 -z-10" />
          <button
            onClick={() => router.push(`/${branchSlug}`)}
            className="w-full block bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 active:scale-[0.98] text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-primary-900/20 pointer-events-auto"
            style={{ fontFamily: "var(--font-cormorant)", fontSize: "20px", letterSpacing: "1px" }}
          >
            {t('backToMenu')}
          </button>
        </div>
      </div>
    </div>
  );
}
