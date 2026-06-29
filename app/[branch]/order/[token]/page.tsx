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
  MdReceipt,
  MdVerified,
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
  remarks?: string;
};

type Order = {
  id: string;
  token: string;
  created_at: string;
  status: string;
  table_number: number;
  daily_order_number: number;
  order_items: OrderItem[];
  session_token?: string;
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
  const { t } = useLanguage();
  const labels = [
    t('received'),
    isCancelled ? t('cancelled') : t('delivered'),
  ];

  const getStepVisuals = (s: StepState) => {
    if (s === "done")
      return {
        bg: "var(--color-primary-600)",
        borderColor: "var(--color-primary-500)",
        iconColor: "#ffffff",
        labelColor: "var(--color-primary-800)",
        shadow: "0 0 20px rgba(var(--color-primary-rgb), 0.25)",
      };
    if (s === "active")
      return {
        bg: "#ffffff",
        borderColor: "var(--color-primary-500)",
        iconColor: "var(--color-primary-600)",
        labelColor: "var(--color-primary-600)",
        shadow: "0 8px 20px rgba(0,0,0,0.06)",
      };
    if (s === "cancelled")
      return {
        bg: "#fee2e2",
        borderColor: "#fca5a5",
        iconColor: "#dc2626",
        labelColor: "#dc2626",
        shadow: "none",
      };
    return {
      bg: "#f8f9fa",
      borderColor: "#f1f3f5",
      iconColor: "#dee2e6",
      labelColor: "#adb5bd",
      shadow: "none",
    };
  };

  const icons = [
    <MdReceipt key="rcv" size={20} />,
    isCancelled ? <MdCancel key="x" size={22} /> : <MdVerified key="star" size={22} />
  ];

  return (
    <div className="relative px-10 py-8 bg-white/40" style={{ borderBottom: "1px solid rgba(0,0,0,0.03)" }}>
      <div className="relative flex justify-between items-start z-10">
        
        {/* Inactive Track Background */}
        <div 
          className="absolute top-[24px] h-[3px] bg-gray-100 rounded-full -z-10"
          style={{ left: "3.5rem", right: "3.5rem" }} 
        />
        
        {/* Active Track Fill */}
        <motion.div 
          className="absolute top-[24px] h-[3px] bg-gradient-to-r from-primary-400 to-primary-600 rounded-full -z-10"
          style={{ left: "3.5rem" }}
          initial={{ width: "0%" }}
          animate={{ width: states[1] === "done" || states[1] === "cancelled" ? "calc(100% - 7rem)" : "0%" }}
          transition={{ duration: 1, ease: "easeOut" }}
        />

        {states.map((s, i) => {
          const vis = getStepVisuals(s);
          const isPulsing = s === "active";
          return (
            <div key={i} className="flex flex-col items-center gap-3 relative">
              {/* Optional glow ring for active step */}
              {isPulsing && (
                <div 
                  className="absolute top-0 w-12 h-12 rounded-full border border-primary-300 animate-ping opacity-20" 
                  style={{ animationDuration: '2s' }}
                />
              )}
              <motion.div
                initial={false}
                animate={{ 
                  backgroundColor: vis.bg, 
                  borderColor: vis.borderColor,
                  boxShadow: vis.shadow,
                  scale: isPulsing ? 1.05 : 1
                }}
                className="w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors duration-500 relative z-10"
                style={{ color: vis.iconColor }}
              >
                {icons[i]}
              </motion.div>
              <span 
                className="font-bold tracking-[2px] uppercase"
                style={{ fontSize: 10, color: vis.labelColor, transition: "color 0.5s ease" }}
              >
                {labels[i]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Timer Display ────────────────────────────────────────────────────────────
const TimerDisplay = ({ remaining }: { remaining: number }) => {
  const { t } = useLanguage();
  const isDelayed = remaining < 0;
  const absRemaining = Math.abs(remaining);
  const mins = Math.floor(absRemaining / 60000);
  const secs = Math.floor((absRemaining % 60000) / 1000);
  const progress = isDelayed ? 1 : Math.min(1 - remaining / ESTIMATE_MS, 1);

  return (
    <div
      className="text-center px-5 py-10"
      style={{
        borderBottom: "1px solid #f5f5f5",
        background: isDelayed ? "#fff7ed" : "#fff",
        transition: "all 0.5s ease-in-out",
      }}
    >
      <div
        className="flex items-center justify-center gap-1.5 mb-2"
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: isDelayed ? "#ea580c" : "var(--color-primary-400)",
          letterSpacing: "2px",
          textTransform: "uppercase",
        }}
      >
        <MdAccessTime
          style={{ fontSize: 15, color: isDelayed ? "#ea580c" : "var(--color-primary-500)" }}
        />
        {isDelayed ? t('orderDelayed') : t('estimatedWait')}
      </div>
      
      <div className="flex items-center justify-center gap-1 mb-6">
        <span
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: 72,
            fontWeight: 300,
            lineHeight: 1,
            color: isDelayed ? "#ea580c" : "var(--color-primary-800)",
            letterSpacing: "-2px",
          }}
        >
          {isDelayed ? "+" : ""}{pad(mins)}
          <span style={{ animation: "blink-colon 1s step-end infinite", opacity: 0.5 }}>:</span>
          {pad(secs)}
        </span>
      </div>

      <div
        className="mx-auto mb-4 overflow-hidden rounded-full"
        style={{ height: 4, background: "#f0f0f0", maxWidth: 200 }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress * 100}%`,
            background: isDelayed ? "#ea580c" : "var(--color-primary-600)",
            borderRadius: 4,
            transition: "width 1s linear, background-color 0.5s ease",
          }}
        />
      </div>
      
      {isDelayed ? (
        <p className="px-4 text-xs font-semibold text-orange-600 leading-relaxed max-w-sm mx-auto animate-pulse">
          {t('orderDelayedApology')}
        </p>
      ) : (
        <p style={{ fontSize: 13, color: "#9e9e9e" }}>
          {t('untilDelivered')}
        </p>
      )}
    </div>
  );
};

// ─── Delivered Banner ──────────────────────────────────────────────────────────────
const ReadyBanner = () => {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="text-center px-6 py-12 relative overflow-hidden"
      style={{ borderBottom: "1px solid rgba(0,0,0,0.03)", background: "linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-100/50 via-transparent to-transparent pointer-events-none" />
      <div
        className="relative mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center shadow-lg shadow-green-500/10"
        style={{
          background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
          border: "4px solid #dcfce7",
        }}
      >
        <MdVerified className="text-white text-4xl drop-shadow-md" />
      </div>
      <p
        className="font-bold text-gray-900 mb-2 relative"
        style={{ fontSize: 32, fontFamily: "var(--font-cormorant)", letterSpacing: "-0.5px" }}
      >
        {t('orderDelivered')}
      </p>
      <p className="text-gray-500 text-sm font-bold tracking-widest relative uppercase" style={{ fontSize: "10px" }}>{t('hopeYouEnjoy')}</p>
    </motion.div>
  );
};

// ─── Collected / Payment Banner ───────────────────────────────────────────────
const CollectedBanner = () => {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="text-center px-6 py-12 relative overflow-hidden"
      style={{ borderBottom: "1px solid rgba(0,0,0,0.03)", background: "linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-100/50 via-transparent to-transparent pointer-events-none" />
      <div
        className="relative mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center shadow-lg shadow-green-500/10"
        style={{
          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          border: "4px solid #d1fae5",
        }}
      >
        <MdPayment className="text-white text-4xl drop-shadow-md" />
      </div>
      <p
        className="font-bold text-gray-900 mb-2 relative"
        style={{ fontSize: 32, fontFamily: "var(--font-cormorant)", letterSpacing: "-0.5px" }}
      >
        Payment Received
      </p>
      <p className="text-gray-500 text-sm font-bold tracking-widest relative uppercase" style={{ fontSize: "10px" }}>Thank you, we hope you enjoyed!</p>
    </motion.div>
  );
};

// ─── Cancelled Banner ──────────────────────────────────────────────────────────
const CancelledBanner = () => {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="text-center px-6 py-12 relative overflow-hidden"
      style={{ borderBottom: "1px solid rgba(0,0,0,0.03)", background: "linear-gradient(180deg, #fff1f2 0%, #ffffff 100%)" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-100/50 via-transparent to-transparent pointer-events-none" />
      <div
        className="relative mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center shadow-lg shadow-red-500/10"
        style={{
          background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
          border: "4px solid #fee2e2",
        }}
      >
        <MdCancel className="text-white text-4xl drop-shadow-md" />
      </div>
      <p
        className="font-bold mb-2 relative"
        style={{ fontSize: 32, fontFamily: "var(--font-cormorant)", color: "#b91c1c", letterSpacing: "-0.5px" }}
      >
        {t('orderCancelled')}
      </p>
      <p className="font-bold tracking-widest relative uppercase" style={{ fontSize: "10px", color: "#f87171" }}>
        {t('orderHasBeenCancelled')}
      </p>
    </motion.div>
  );
};

// ─── QR Panel ─────────────────────────────────────────────────────────────────
const QRPanel = ({
  orderId,
  orderNumber,
  disabled = false,
  totalAmount,
  sessionToken,
}: {
  orderId: string;
  orderNumber: number;
  disabled?: boolean;
  totalAmount: number;
  sessionToken?: string;
}) => {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-6 rounded-[2rem] overflow-hidden bg-white/80 backdrop-blur-xl relative"
      style={{ border: "1px solid rgba(255,255,255,0.8)", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.05)" }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent pointer-events-none" />
      <div
        className="relative flex items-center justify-between px-5 py-4 bg-gray-50/50"
        style={{ borderBottom: "1px solid rgba(0,0,0,0.03)" }}
      >
        <div className="flex items-center gap-2">
          <MdQrCode style={{ fontSize: 16, color: "var(--color-primary-500)" }} />
          <span
            className="font-bold uppercase tracking-[2px] text-gray-500"
            style={{ fontSize: 10 }}
          >
            {disabled ? "Bill Payment QR (Disabled)" : t('showToStaff')}
          </span>
        </div>
        {disabled && (
          <span className="text-[9px] font-bold bg-amber-50 border border-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm animate-pulse shrink-0">
            Preparing Food
          </span>
        )}
      </div>
      <div className="relative flex items-center gap-6 px-6 py-6">
        <div
          className={`rounded-2xl p-2.5 shrink-0 bg-white shadow-sm relative overflow-hidden transition-all duration-300 ${
            disabled ? "opacity-20 blur-[3px] pointer-events-none select-none" : ""
          }`}
          style={{ border: "1px solid #f0f0f0" }}
        >
          <QRCodeSVG
            value={sessionToken || orderId}
            size={90}
            level="M"
            bgColor="#ffffff"
            fgColor="#111827"
            includeMargin={false}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-4 items-baseline">
            <div>
              <p className="text-[10px] text-gray-400 font-bold tracking-[1.5px] uppercase">
                {t('orderNumber')}
              </p>
              <p
                className="text-primary-600 font-bold leading-none mt-1"
                style={{
                  fontFamily: "var(--font-cormorant)",
                  fontSize: 32,
                  letterSpacing: "-1.5px",
                }}
              >
                #{orderNumber}
              </p>
            </div>
            <div className="border-l border-gray-200 h-8 self-center mx-1" />
            <div>
              <p className="text-[10px] text-gray-400 font-bold tracking-[1.5px] uppercase">
                Total Bill
              </p>
              <p
                className="text-emerald-600 font-bold leading-none mt-1"
                style={{
                  fontFamily: "var(--font-cormorant)",
                  fontSize: 32,
                  letterSpacing: "-1px",
                }}
              >
                ₹{totalAmount}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 font-medium mt-2 leading-relaxed">
            {disabled 
              ? "This QR code will enable once all your ordered items are prepared by the kitchen to ensure bill consistency."
              : t('scanOrShow')}
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
  const [isOffline, setIsOffline] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
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

  // ── Offline detection ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleOnline  = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    // Set initial state (handles cases where page loads while already offline)
    setIsOffline(!navigator.onLine);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 1. Initial fetch — runs once per token, utilizing Stale-While-Revalidate
  useEffect(() => {
    // AbortController prevents state updates if the component unmounts before fetch resolves
    const controller = new AbortController();

    // Load from cache instantly for optimal UX
    if (orderCache.has(token)) {
      setOrder(orderCache.get(token)!);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const loadOrder = async () => {
      try {
        const data = await fetchOrder(token);
        if (controller.signal.aborted) return;

        if (data) {
          applyOrder(data as unknown as Order);
        } else {
          // If not found and not in cache, show not found
          if (!orderCache.has(token)) {
            setNotFound(true);
          }
          setLoading(false);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("[OrderPage] fetchOrder failed:", err);
        if (!orderCache.has(token)) {
          setNotFound(true);
          setLoading(false);
        }
      }
    };

    loadOrder();
    return () => {
      controller.abort();
    };
  }, [token, applyOrder]);


  // Reset fetchedRef when token changes (navigating between orders)
  useEffect(() => {
    fetchedRef.current = false;
  }, [token]);

  // Listen for local order placement (addons) to refresh details instantly
  useEffect(() => {
    const handleOrderPlaced = async () => {
      try {
        const freshData = await fetchOrder(token);
        if (freshData) {
          setOrder(freshData as unknown as Order);
          orderCache.set(token, freshData as unknown as Order);
          if (freshData.status) {
            updateOrderStatus(order?.id || freshData.id, freshData.status);
          }
        }
      } catch (err) {
        console.error("[OrderPage] Failed to refresh order on custom event:", err);
      }
    };

    window.addEventListener("gosip-order-placed", handleOrderPlaced);
    return () => {
      window.removeEventListener("gosip-order-placed", handleOrderPlaced);
    };
  }, [token, updateOrderStatus, order?.id]);

  // 2. Real-time subscription — subscribes as soon as we have order.id
  //    Fires immediately on any DB UPDATE to this order row or any other order in the session
useEffect(() => {
  if (!order?.id) return;

  const unsubscribe = subscribeToOrder(order.id, async (updated) => {
    try {
      // Re-fetch the combined order to get the full aggregated details
      const freshData = await fetchOrder(token);
      if (freshData) {
        setOrder(freshData as unknown as Order);
        orderCache.set(token, freshData as unknown as Order);
        if (freshData.status) {
          updateOrderStatus(order.id, freshData.status);
          if (freshData.status === "collected") {
            onOrderCollected(order.id);
          }
        }
      }
    } catch (err) {
      console.error("[OrderPage] Failed to refresh order on subscription update:", err);
    }
  }, order.session_token);

  return () => {
    unsubscribe();
  };
}, [order?.id, order?.session_token, token, branch, onOrderCollected, updateOrderStatus]);

  // 3. Initialise countdown from order timestamp
  useEffect(() => {
    if (!order) return;
    const placedAt = new Date(order.created_at).getTime();
    const newRemaining = ESTIMATE_MS - (Date.now() - placedAt);
    setTimeout(() => {
      setRemaining(newRemaining);
    }, 0);
  }, [order?.created_at]); // only re-init when the order itself changes, not on every status update

  // 4. Tick countdown (runs as long as order is not completed/cancelled/collected/delivered)
  useEffect(() => {
    if (remaining === null) return;

    const isCompleted =
      order?.status === "delivered" ||
      order?.status === "collected" ||
      order?.status === "cancelled";

    if (isCompleted) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setRemaining((prev) => (prev === null ? null : prev - 1000));
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [remaining, order?.status]);

  // ── derived state ─────────────────────────────────────────────────────────
  const isCollected = order?.status === "collected";
  const isCancelled = order?.status === "cancelled";
  const isReady =
    !isCancelled &&
    !isCollected &&
    order?.status === "delivered";
  const total =
    order?.order_items.reduce((sum, i) => sum + i.price * i.quantity, 0) ?? 0;
  const { time, ampm, date } = order
    ? formatOrderTime(order.created_at)
    : { time: "", ampm: "", date: "" };

  // ── render guards ─────────────────────────────────────────────────────────
  if (loading) return <LoadingSkeleton />;
  if (notFound) return <NotFoundState router={router} branch={branch} />;
  if (!order) return <LoadingSkeleton />; // fetch resolved but order not yet in state (edge case)

  const stepStates: [StepState, StepState] = isCancelled
    ? ["done", "cancelled"]
    : isReady || isCollected
      ? ["done", "done"]
      : ["done", "pending"];

  const headerBgClass = isCancelled 
    ? "bg-red-800" 
    : isCollected 
      ? "bg-green-800" 
      : "bg-gradient-to-br from-primary-700 to-primary-900";

  return (
    <div className={`min-h-screen relative overflow-hidden bg-[#fbfbfb] pb-12`}>
      {/* Offline Banner */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ y: -48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -48, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 px-4 py-2.5 text-white text-xs font-semibold tracking-wide"
            style={{ background: '#dc2626' }}
          >
            <span>⚠️</span>
            <span>No internet connection — showing last known order status</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Ambient Background Blobs */}
      <div className="fixed top-[10%] -left-20 w-96 h-96 bg-primary-200/20 rounded-full blur-[80px] pointer-events-none" />
      <div className="fixed top-[40%] -right-20 w-[30rem] h-[30rem] bg-primary-100/30 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div
        className={`relative px-6 pt-12 pb-24 rounded-b-[2.5rem] overflow-hidden ${headerBgClass}`}
        style={{ boxShadow: "0 20px 40px -15px rgba(0,0,0,0.3)" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-60 pointer-events-none" />
        <div
          className="absolute -top-12 -right-12 w-64 h-64 rounded-full blur-3xl opacity-40 pointer-events-none"
          style={{ background: "rgba(255,255,255,0.15)" }}
        />
        <div
          className="absolute -bottom-10 -left-10 w-56 h-56 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ background: "rgba(255,255,255,0.1)" }}
        />
        <button
          onClick={() => router.push(`/${branch}/orders`)}
          className="relative z-10 flex items-center gap-2 mb-8 px-5 py-2 rounded-full text-sm font-bold text-white backdrop-blur-md transition-transform active:scale-95"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 100%)",
            border: "1px solid rgba(255,255,255,0.3)",
            boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.1)"
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
                className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight drop-shadow-md"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                Order Cancelled
              </h1>
              <p className="text-white/70 text-sm">
                This order has been cancelled
              </p>
            </motion.div>
          ) : isCollected ? (
            <motion.div
              key="collected"
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
                <span className="w-1.5 h-1.5 rounded-full bg-white" /> Paid
              </div>
              <h1
                className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight drop-shadow-md"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                Payment Received
              </h1>
              <p className="text-white/70 text-sm">
                Thank you for your order
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
                className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight drop-shadow-md"
                style={{ fontFamily: "var(--font-cormorant)" }}
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
                className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight drop-shadow-md"
                style={{ fontFamily: "var(--font-cormorant)" }}
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 -mt-12 relative z-10"
      >
        <div
          className="rounded-[2rem] overflow-hidden backdrop-blur-xl relative"
          style={{
            background: "rgba(255, 255, 255, 0.8)",
            boxShadow: "0 20px 50px -15px rgba(0,0,0,0.1)",
            border: "1px solid rgba(255,255,255,0.9)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-white/20 pointer-events-none" />
          <div className="relative">
            <AnimatePresence mode="wait">
            {isCancelled ? (
              <CancelledBanner key="cb" />
            ) : isCollected ? (
              <CollectedBanner key="pcb" />
            ) : isReady ? (
              <ReadyBanner key="rb" />
            ) : remaining !== null ? (
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
            className="px-6 pt-6 pb-2 font-bold uppercase text-gray-400 tracking-[2px]"
            style={{ fontSize: 10 }}
          >
            {t('yourOrder')} <span className="mx-1.5 opacity-40">|</span> {order.order_items.length}{" "}
            {order.order_items.length === 1 ? t('item') : t('items')}
          </div>

          {/* Items */}
          <div className="flex flex-col px-4 mb-4 mt-2">
            {order.order_items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 py-3.5 border-b border-gray-100/60 last:border-0"
                style={{
                  opacity: isCancelled ? 0.5 : 1,
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 text-primary-700 bg-gray-50/80"
                  style={{
                    fontSize: 13,
                    border: "1px solid #f0f0f0",
                  }}
                >
                  {item.quantity}×
                </div>
                <div className="flex-1 flex items-baseline relative overflow-hidden group">
                  <span
                    className="font-bold text-gray-900 z-10 pr-2 bg-transparent flex items-center gap-2"
                    style={{
                      fontSize: 15,
                      textDecoration: isCancelled ? "line-through" : "none",
                    }}
                  >
                    <span>{item.menu_items?.name}</span>
                    {item.remarks === 'Addon' && (
                      <span className="text-[9px] font-bold tracking-wider uppercase bg-amber-50 border border-amber-100 text-amber-700 px-1.5 py-0.5 rounded shadow-sm shrink-0">
                        Addon
                      </span>
                    )}
                  </span>
                  <div className="flex-1 border-b-2 border-dotted border-gray-200 opacity-50 mx-2 relative top-[-4px]" />
                  <span
                    className="font-bold text-gray-900 z-10 pl-2 bg-transparent"
                    style={{
                      fontFamily: "var(--font-cormorant)",
                      fontSize: 18,
                      textDecoration: isCancelled ? "line-through" : "none",
                    }}
                  >
                    ₹{item.price * item.quantity}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div
            className="flex items-center justify-between mx-4 mt-4 mb-5 px-6 py-5 rounded-[1.5rem] relative overflow-hidden"
            style={{ 
              background: "linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)",
              border: "1px solid #f0f0f0",
              boxShadow: "inset 0 2px 10px rgba(0,0,0,0.01)" 
            }}
          >
            <div className="flex items-center gap-2.5 text-sm font-bold tracking-wide uppercase text-gray-400" style={{ fontSize: 11 }}>
              <MdPayment
                style={{
                  fontSize: 18,
                  color: isCancelled ? "#e53935" : "var(--color-primary-500)",
                }}
              />
              {t('total')}
            </div>
            <span
              style={{
                fontFamily: "var(--font-cormorant)",
                fontSize: 36,
                fontWeight: 700,
                color: isCancelled ? "#e53935" : "var(--color-primary-800)",
                letterSpacing: "-1px",
                lineHeight: 1,
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
        </div>
      </motion.div>

      <QRPanel orderId={order.id} orderNumber={order.daily_order_number} disabled={order.status === 'pending'} totalAmount={total} sessionToken={order.session_token} />
    </div>
  );
}
