//app/[branch]/order/[token]/page.tsx

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  MdArrowBack,
  MdPayment,
  MdTimer,
  MdRestaurant,
  MdCancel,
  MdQrCode,
  MdAccessTime,
} from "react-icons/md";
import { fetchOrder, subscribeToOrder } from "@/lib/services/order.service";
import { useSession } from "@/lib/context/session-context";
import { useLanguage } from "@/lib/context/language-context";

const ESTIMATE_MS = 5 * 60 * 1000;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

type OrderItem = {
  id: string;
  price: number;
  quantity: number;
  menu_items: { id: string; name: string; image_url: string };
};

type Order = {
  id: string;
  token: string;
  created_at: string;
  status: string;
  table_number: number;
  daily_order_number: number;
  order_items: OrderItem[];
};

// Module-level cache — survives client-side navigation, cleared on hard refresh
const orderCache = new Map<string, Order>();

const pad = (n: number) => String(n).padStart(2, "0");

const formatOrderTime = (iso: string) => {
  const date = new Date(iso);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return {
    time: `${String(hours % 12 || 12).padStart(2, "0")}:${minutes}`,
    ampm: hours >= 12 ? "PM" : "AM",
    date: `${date.getDate()} ${MONTHS[date.getMonth()]}`,
  };
};

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
const LoadingSkeleton = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="w-full max-w-md mx-4 space-y-3">
      <div className="h-40 rounded-2xl skeleton" />
      <div className="h-28 rounded-2xl skeleton" />
      <div className="h-20 rounded-2xl skeleton" />
    </div>
  </div>
);

// ─── Step Indicator ───────────────────────────────────────────────────────────
type StepState = "done" | "active" | "pending" | "cancelled";

const StepRow = ({
  states,
  isCancelled,
}: {
  states: [StepState, StepState];
  isCancelled?: boolean;
}) => {
  const { t } = useLanguage()
  const labels = [
    t('received'),
    isCancelled ? t('cancelled') : t('delivered'),
  ];

  const stepStyle = (s: StepState) => {
    if (s === "done")
      return {
        bg: "var(--color-primary-600)",
        border: "none",
        color: "#fff",
        labelColor: "var(--color-primary-700)",
      };
    if (s === "active")
      return {
        bg: "#fff",
        border: "2px solid var(--color-primary-500)",
        color: "var(--color-primary-600)",
        labelColor: "var(--color-primary-600)",
      };
    if (s === "cancelled")
      return {
        bg: "#fff0f0",
        border: "1.5px solid #ffb3b3",
        color: "#e53935",
        labelColor: "#e53935",
      };
    return {
      bg: "#f0f0f0",
      border: "1.5px solid #e0e0e0",
      color: "#bdbdbd",
      labelColor: "#bdbdbd",
    };
  };

  const icons = [
    <svg
      key="check"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>,
    <svg
      key="star"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>,
  ];

  const cancelIcon = (
    <svg
      key="x"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );

  return (
    <div
      className="flex items-center px-5 py-4"
      style={{ borderBottom: "1px solid #f0f0f0" }}
    >
      {states.map((s, i) => {
        const style = stepStyle(s);
        return (
          <div key={i} className="contents">
            <div className="flex flex-col items-center shrink-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: style.bg,
                  border: style.border,
                  color: style.color,
                }}
              >
                {s === "cancelled" ? cancelIcon : icons[i]}
              </div>
              <span
                className="mt-1.5 font-bold uppercase"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.4px",
                  color: style.labelColor,
                }}
              >
                {labels[i]}
              </span>
            </div>
            {i < 1 && (
              <div
                className="flex-1 h-0.5 mx-1 mb-5 rounded-sm"
                style={{
                  background:
                    s === "done" ? "var(--color-primary-400)" : "#e8e8e8",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── Timer Display ────────────────────────────────────────────────────────────
const TimerDisplay = ({ remaining }: { remaining: number }) => {
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const progress = Math.min(1 - remaining / ESTIMATE_MS, 1);
  const { t } = useLanguage();

  return (
    <div
      className="text-center px-5 py-6"
      style={{ borderBottom: "1px solid #f0f0f0", background: "#f8fdf8" }}
    >
      <div
        className="flex items-center justify-center gap-1.5 mb-4"
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#9e9e9e",
          letterSpacing: "2px",
          textTransform: "uppercase",
          fontFamily: "var(--font-cormorant)"
        }}
      >
        <MdAccessTime
          style={{ fontSize: 13, color: "var(--color-primary-500)" }}
        />
        {t('estimatedWait')}
      </div>
      <div className="flex items-center justify-center gap-1 mb-1">
        {[pad(mins)[0], pad(mins)[1]].map((d, i) => (
          <div
            key={i}
            className="flex items-center justify-center rounded-xl"
            style={{
              width: 44,
              height: 60,
              background: "#fff",
              border: "1px solid #e8e8e8",
              fontFamily: "'DM Mono', monospace",
              fontSize: 40,
              fontWeight: 500,
              color: "var(--color-primary-700)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            {d}
          </div>
        ))}
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 36,
            fontWeight: 400,
            color: "#bdbdbd",
            padding: "0 3px",
            animation: "blink-colon 1s step-end infinite",
          }}
        >
          :
        </span>
        {[pad(secs)[0], pad(secs)[1]].map((d, i) => (
          <div
            key={i}
            className="flex items-center justify-center rounded-xl"
            style={{
              width: 44,
              height: 60,
              background: "#fff",
              border: "1px solid #e8e8e8",
              fontFamily: "'DM Mono', monospace",
              fontSize: 40,
              fontWeight: 500,
              color: "var(--color-primary-700)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            {d}
          </div>
        ))}
      </div>
      <div
        className="flex justify-center mb-4"
        style={{
          fontSize: 10,
          color: "#bdbdbd",
          letterSpacing: "1px",
          textTransform: "uppercase",
        }}
      >
        <span style={{ width: 90, textAlign: "center" }}>min</span>
        <span style={{ width: 90, textAlign: "center" }}>sec</span>
      </div>
      <div
        className="mx-auto mb-3 overflow-hidden rounded-full"
        style={{ height: 4, background: "#e8e8e8", maxWidth: 200 }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress * 100}%`,
            background: "var(--color-primary-500)",
            borderRadius: 4,
            transition: "width 1s linear",
          }}
        />
      </div>
      <p style={{ fontSize: 12, color: "#9e9e9e" }}>
        {t('untilDelivered')}
      </p>
    </div>
  );
};

// ─── Delivered Banner ──────────────────────────────────────────────────────────────
const ReadyBanner = () => {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center px-5 py-8"
      style={{ borderBottom: "1px solid #f0f0f0", background: "#f8fdf8" }}
    >
      <div
        className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center"
        style={{
          background: "var(--color-primary-50)",
          border: "2px solid var(--color-primary-200)",
        }}
      >
        <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
          <path
            d="M9 18.5L15 24.5L27 12"
            stroke="var(--color-primary-600)"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p
        className="font-extrabold text-gray-900 mb-1"
        style={{ fontSize: 22, letterSpacing: "-0.5px" }}
      >
        {t('orderDelivered')}
      </p>
      <p className="text-gray-400 text-sm">{t('hopeYouEnjoy')}</p>
    </motion.div>
  );
};

// ─── Collected / Payment Banner ───────────────────────────────────────────────
const CollectedBanner = ({ countdown }: { countdown: number }) => {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center px-5 py-8"
      style={{ borderBottom: "1px solid #e0f2e9", background: "#f0fdf4" }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center"
        style={{
          background: "var(--color-primary-50)",
          border: "2px solid var(--color-primary-300)",
        }}
      >
        <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
          <motion.path
            d="M8 18l6 6L28 10"
            stroke="var(--color-primary-600)"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          />
        </svg>
      </motion.div>
      <p
        className="font-extrabold text-gray-900 mb-1"
        style={{ fontSize: 22, letterSpacing: "-0.5px" }}
      >
        {t('paymentReceived')}
      </p>
      <p className="text-gray-500 text-sm mb-3">{t('thankYouEnjoy')}</p>
      <p style={{ fontSize: 11, color: "#9e9e9e" }}>
        {t('redirectingInN').replace('{n}', String(countdown))}
      </p>
    </motion.div>
  );
};

// ─── Cancelled Banner ──────────────────────────────────────────────────────────
const CancelledBanner = () => {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center px-5 py-7"
      style={{ borderBottom: "1px solid #ffe0e0", background: "#fff8f8" }}
    >
      <div
        className="mx-auto mb-3 w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: "#fff0f0", border: "1.5px solid #ffb3b3" }}
      >
        <MdCancel style={{ fontSize: 28, color: "#e53935" }} />
      </div>
      <p
        className="font-extrabold mb-1"
        style={{ fontSize: 20, color: "#c62828" }}
      >
        {t('orderCancelled')}
      </p>
      <p className="text-sm" style={{ color: "#ef9a9a" }}>
        {t('orderHasBeenCancelled')}
      </p>
    </motion.div>
  );
};

// ─── QR Panel ─────────────────────────────────────────────────────────────────
const QRPanel = ({
  orderId,
  orderNumber,
}: {
  orderId: string;
  orderNumber: number;
}) => {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-3 rounded-2xl overflow-hidden bg-white"
      style={{ border: "1px solid #e8e8e8", boxShadow: "var(--shadow-card)" }}
    >
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: "1px solid #f0f0f0" }}
      >
        <MdQrCode style={{ fontSize: 15, color: "var(--color-primary-500)" }} />
        <span
          className="font-bold uppercase"
          style={{ fontSize: 10, letterSpacing: "2px", color: "#9e9e9e" }}
        >
          {t('showToStaff')}
        </span>
      </div>
      <div className="flex items-center gap-5 px-4 py-4">
        <div
          className="rounded-xl p-2 shrink-0"
          style={{ background: "#f8f8f8", border: "1px solid #e8e8e8" }}
        >
          <QRCodeSVG
            value={orderId}
            size={84}
            level="M"
            bgColor="#f8f8f8"
            fgColor="#1a1a1a"
            includeMargin={false}
          />
        </div>
        <div className="flex flex-col gap-1">
          <p
            style={{
              fontSize: 11,
              color: "#9e9e9e",
              fontWeight: 600,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            {t('orderNumber')}
          </p>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 44,
              fontWeight: 600,
              color: "var(--color-primary-600)",
              letterSpacing: "-2px",
              lineHeight: 1,
            }}
          >
            #{orderNumber}
          </p>
          <p style={{ fontSize: 11, color: "#bdbdbd", marginTop: 2 }}>
            {t('scanOrShow')}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Not Found ────────────────────────────────────────────────────────────────
const NotFoundState = ({
  router,
  branch,
}: {
  router: ReturnType<typeof useRouter>;
  branch: string;
}) => {
  const { t } = useLanguage()
  return (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-gray-100">
        <MdRestaurant style={{ fontSize: 30, color: "#9e9e9e" }} />
      </div>
      <h2 className="text-lg font-bold text-gray-700 mb-1">{t('orderNotFound')}</h2>
      <p className="text-sm text-gray-400 mb-5">
        {t('orderLinkInvalid')}
      </p>
      <button
        onClick={() => router.push(`/${branch}`)}
        className="px-7 py-3 rounded-xl font-bold text-sm text-white"
        style={{ background: "var(--color-primary-600)" }}
      >
        {t('backToMenu')}
      </button>
    </div>
  </div>
  )
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrderPage() {
  const { branch, token } = useParams<{ branch: string; token: string }>();
  const router = useRouter();
  const { activeOrders, updateOrderStatus, onOrderCollected } = useSession();
  const { t } = useLanguage();

  const [order, setOrder] = useState<Order | null>(
    () => orderCache.get(token) ?? null,
  );
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [collectCountdown, setCollectCountdown] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const collectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fetchedRef = useRef(false); // prevents double-fetch in Strict Mode

  // ── helpers ──────────────────────────────────────────────────────────────
  const applyOrder = useCallback(
    (data: Order) => {
      orderCache.set(token, data);
      setOrder(data);
      setLoading(false);
      setNotFound(false);
    },
    [token],
  );

  // 1. Initial fetch — runs once per token, skips if already cached
  useEffect(() => {
    // Already have it in cache — no need to fetch
    if (orderCache.has(token)) {
      setOrder(orderCache.get(token)!);
      setLoading(false);
      return;
    }

    // Strict Mode double-invoke guard
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    let cancelled = false;

    const loadOrder = async () => {
      try {
        const data = await fetchOrder(token);
        if (cancelled) return;

        if (data) {
          applyOrder(data as unknown as Order);
        } else {
          // fetchOrder returned null — order doesn't exist
          setNotFound(true);
          setLoading(false);
        }
      } catch (err) {
        console.error("[OrderPage] fetchOrder failed:", err);
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
      }
    };

    loadOrder();
    return () => {
      cancelled = true;
    };
  }, [token, applyOrder]);

  // Reset fetchedRef when token changes (navigating between orders)
  useEffect(() => {
    fetchedRef.current = false;
  }, [token]);

  // 2. Real-time subscription — subscribes as soon as we have order.id
  //    Fires immediately on any DB UPDATE to this order row
useEffect(() => {
  if (!order?.id) return;

const unsubscribe = subscribeToOrder(order.id, (updated) => {
  if (updated.status) {
    updateOrderStatus(order.id, updated.status);

    // ── Collected: expire session & auto-redirect ──────────────────────────
    if (updated.status === "collected") {
      // Remove order AND clear table session — diner has paid, session is over
      onOrderCollected(order.id);
      orderCache.delete(token);

      // Countdown 3 → 0 then redirect
      let count = 3;
      setCollectCountdown(count);
      collectTimerRef.current = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          clearInterval(collectTimerRef.current!);
          router.replace(`/${branch}`);
        } else {
          setCollectCountdown(count);
        }
      }, 1000);
    }
  }
  setOrder((prev) => {
    if (!prev) return prev;
    const merged = { ...prev, ...updated } as Order;
    orderCache.set(token, merged);
    return merged;
  });
});

  return () => {
    unsubscribe();
    if (collectTimerRef.current) clearInterval(collectTimerRef.current);
  };
}, [order?.id, token, branch, onOrderCollected, router]);

  // 3. Initialise countdown from order timestamp
  useEffect(() => {
    if (!order) return;
    const placedAt = new Date(order.created_at).getTime();
    const newRemaining = Math.max(0, ESTIMATE_MS - (Date.now() - placedAt));
    setRemaining(newRemaining);
  }, [order?.created_at]); // only re-init when the order itself changes, not on every status update

  // 4. Tick countdown
  useEffect(() => {
    if (remaining === null || remaining <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setRemaining((prev) => (!prev || prev <= 1000 ? 0 : prev - 1000));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [remaining]);

  // ── derived state ─────────────────────────────────────────────────────────
  const isCollected = order?.status === "collected";
  const isCancelled = order?.status === "cancelled";
  const isReady =
    !isCancelled &&
    !isCollected &&
    (order?.status === "delivered" ||
      remaining === 0);
  const total =
    order?.order_items.reduce((sum, i) => sum + i.price * i.quantity, 0) ?? 0;
  const { time, ampm, date } = order
    ? formatOrderTime(order.created_at)
    : { time: "", ampm: "", date: "" };

  // ── render guards ─────────────────────────────────────────────────────────
  if (loading) return <LoadingSkeleton />;
  if (notFound) return <NotFoundState router={router} branch={branch} />;
  if (!order) return <LoadingSkeleton />; // fetch resolved but order not yet in state (edge case)

  // If collected show fullscreen payment confirmation
  if (isCollected || collectCountdown !== null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-white rounded-3xl overflow-hidden"
          style={{ boxShadow: "var(--shadow-card)", border: "1px solid #e8e8e8" }}
        >
          <CollectedBanner countdown={collectCountdown ?? 0} />
          <div className="px-5 py-4">
            <div
              className="flex items-center justify-between"
              style={{ borderBottom: "1px solid #f5f5f5", paddingBottom: 12, marginBottom: 12 }}
            >
              <span className="text-sm text-gray-400">{t('order')}</span>
              <span className="font-bold text-gray-700">#{order.daily_order_number}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">{t('amountPaid')}</span>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 22,
                  fontWeight: 600,
                  color: "var(--color-primary-700)",
                }}
              >
                ₹{order.order_items.reduce((s, i) => s + i.price * i.quantity, 0)}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const stepStates: [StepState, StepState] = isCancelled
    ? ["done", "cancelled"]
    : isReady
      ? ["done", "done"]
      : ["done", "pending"];

  const headerBg = isCancelled ? "#c62828" : "var(--color-primary-600)";

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div
        className="relative px-5 pt-10 pb-14 rounded-b-3xl overflow-hidden"
        style={{ background: headerBg, boxShadow: "var(--shadow-header)" }}
      >
        <div
          className="absolute -top-10 -right-10 w-36 h-36 rounded-full pointer-events-none"
          style={{ background: "rgba(255,255,255,0.07)" }}
        />
        <button
          onClick={() => router.push(`/${branch}/orders`)}
          className="relative z-10 flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full text-sm font-semibold text-white"
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.25)",
          }}
        >
          <MdArrowBack className="w-4 h-4" /> Back
        </button>

        <AnimatePresence mode="wait">
          {isCancelled ? (
            <motion.div
              key="cancelled"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#fff",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white" /> Cancelled
              </div>
              <h1
                className="text-3xl font-extrabold text-white mb-1"
                style={{ letterSpacing: "-0.8px" }}
              >
                Order Cancelled
              </h1>
              <p className="text-white/70 text-sm">
                This order has been cancelled
              </p>
            </motion.div>
          ) : isReady ? (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#fff",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white" /> {t('delivered')}
              </div>
              <h1
                className="text-3xl font-extrabold text-white mb-1"
                style={{ letterSpacing: "-0.8px" }}
              >
                {t('enjoyYourMeal')}
              </h1>
              <p className="text-white/70 text-sm">
                {t('orderHasBeenDelivered')}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#fff",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full bg-white"
                  style={{ animation: "pulse 1.5s ease-in-out infinite" }}
                />
                {order.status}
              </div>
              <h1
                className="text-3xl font-extrabold text-white mb-1"
                style={{ letterSpacing: "-0.8px" }}
              >
                {t('orderPlaced')}
              </h1>
              <p className="text-white/70 text-sm">
                {t('preparingMeal')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 -mt-6 relative z-10"
      >
        <div
          className="rounded-2xl overflow-hidden bg-white"
          style={{
            boxShadow: "var(--shadow-card)",
            border: "1px solid #e8e8e8",
          }}
        >
          <AnimatePresence mode="wait">
            {isCancelled ? (
              <CancelledBanner key="cb" />
            ) : isReady ? (
              <ReadyBanner key="rb" />
            ) : remaining !== null && remaining > 0 ? (
              <motion.div
                key="timer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <TimerDisplay remaining={remaining} />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <StepRow states={stepStates} isCancelled={isCancelled} />

          {/* Meta */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: "1px solid #f0f0f0" }}
          >
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <MdTimer
                style={{ fontSize: 13, color: "var(--color-primary-500)" }}
              />
              {time} {ampm} · {date}
            </span>
            <div className="flex gap-1.5">
              {[
                `Table ${order.table_number}`,
                `#${order.daily_order_number}`,
              ].map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-xl font-semibold text-primary-700 bg-primary-50"
                  style={{
                    fontSize: 11,
                    border: "1px solid var(--color-primary-100)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Items header */}
          <div
            className="px-5 pt-4 pb-2 font-bold uppercase text-gray-400"
            style={{ fontSize: 10, letterSpacing: "2px" }}
          >
            {t('yourOrder')} · {order.order_items.length}{" "}
            {order.order_items.length === 1 ? t('item') : t('items')}
          </div>

          {/* Items */}
          <div className="flex flex-col">
            {order.order_items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2.5 px-5 py-2.5"
                style={{
                  borderTop: "1px solid #f5f5f5",
                  opacity: isCancelled ? 0.5 : 1,
                }}
              >
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-bold shrink-0 text-primary-700 bg-primary-50"
                  style={{
                    fontSize: 11,
                    border: "1px solid var(--color-primary-100)",
                  }}
                >
                  {item.quantity}×
                </span>
                <span
                  className="flex-1 font-medium text-gray-800"
                  style={{
                    fontSize: 14,
                    textDecoration: isCancelled ? "line-through" : "none",
                  }}
                >
                  {item.menu_items?.name}
                </span>
                <span
                  className="font-semibold text-gray-600"
                  style={{
                    fontSize: 14,
                    textDecoration: isCancelled ? "line-through" : "none",
                  }}
                >
                  ₹{item.price * item.quantity}
                </span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div
            className="flex items-center justify-between mx-4 my-3 px-5 py-4 rounded-2xl bg-gray-50"
            style={{ border: "1px solid #e8e8e8" }}
          >
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <MdPayment
                style={{
                  fontSize: 16,
                  color: isCancelled ? "#e53935" : "var(--color-primary-500)",
                }}
              />
              {t('total')}
            </div>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 28,
                fontWeight: 500,
                color: isCancelled ? "#e53935" : "var(--color-primary-700)",
                letterSpacing: "-1px",
                textDecoration: isCancelled ? "line-through" : "none",
                opacity: isCancelled ? 0.6 : 1,
              }}
            >
              ₹{total}
            </span>
          </div>

          {/* CTA */}
          <div className="px-4 pt-1 pb-5">
            <button
              onClick={() => router.push(`/${branch}`)}
              className="w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 text-white"
              style={{
                background: isCancelled
                  ? "#c62828"
                  : "var(--color-primary-600)",
                boxShadow: "var(--shadow-btn)",
                border: "none",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              {t('backToMenu')}
            </button>
            {!isReady && !isCancelled && (
              <p className="text-center mt-2.5 text-xs text-gray-300">
                {t('notifyWhenReady')}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      <QRPanel orderId={order.id} orderNumber={order.daily_order_number} />
      <div style={{ height: 16 }} />
    </div>
  );
}
