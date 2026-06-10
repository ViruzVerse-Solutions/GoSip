"use client";
// lib/context/session-context.tsx
// ── Session — table identity, active orders, time-based auto-expiry ───────────

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

// ── Constants ─────────────────────────────────────────────────────────────────
/** A table session lives for 4 hours from when the table was first selected. */
const SESSION_MAX_AGE_MS = 4 * 60 * 60 * 1000  // 4 hours

/** Active orders expire 2 hours after placement. */
const ORDER_TTL_MS = 2 * 60 * 60 * 1000        // 2 hours (same as cart places)

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ActiveOrder {
  token:            string;
  orderId:          string;
  dailyOrderNumber: number;
  expires:          number;
  tableNumber:      string;
  orderPlacedAt:    number;
  status?:          string;
}

interface SessionContextType {
  sessionToken:     string | null;
  tableNumber:      string | null;
  activeOrders:     ActiveOrder[];
  selectTable:      (table: string) => string;
  /** Clear the table identity (token + tableNumber) — called after payment collected. */
  clearTableSession: () => void;
  /** Full nuclear clear — clears table identity AND all active orders. */
  clearSession:     () => void;
  addOrder:         (order: ActiveOrder) => void;
  updateOrderStatus:(orderId: string, status: string) => void;
  /** Remove one order AND clear table session (call on 'collected' status). */
  onOrderCollected: (orderId: string) => void;
  removeOrder:      (orderId: string) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────
const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [tableNumber,  setTableNumber]  = useState<string | null>(null);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [isMounted,    setIsMounted]    = useState(false);

  const params = useParams();
  const branchSlug = params?.branch as string | undefined;

  // ── On Mount: restore + validate ─────────────────────────────────────────
  useEffect(() => {
    if (!branchSlug) return;
    try {
      // ── Restore table session ───────────────────────────────────────────
      const sessionKey = `gosip-session-${branchSlug}`;
      const savedSession = localStorage.getItem(sessionKey);
      if (savedSession) {
        const { token, table, createdAt } = JSON.parse(savedSession);

        // Time-based expiry: clear session if older than SESSION_MAX_AGE_MS
        const sessionAge = Date.now() - (createdAt ?? 0);
        if (sessionAge < SESSION_MAX_AGE_MS) {
          setSessionToken(token);
          setTableNumber(table);
        } else {
          // Session expired — clear it silently
          localStorage.removeItem(sessionKey);
          setSessionToken(null);
          setTableNumber(null);
        }
      } else {
        setSessionToken(null);
        setTableNumber(null);
      }

      // ── Restore active orders ───────────────────────────────────────────
      const ordersKey = `activeOrders-${branchSlug}`;
      const storedOrders = localStorage.getItem(ordersKey);
      if (storedOrders) {
        const orders = JSON.parse(storedOrders);
        if (Array.isArray(orders)) {
          const now         = Date.now();
          const validOrders = orders.filter((o: ActiveOrder) => o.expires > now);
          // Prune expired orders from storage
          if (validOrders.length !== orders.length) {
            localStorage.setItem(ordersKey, JSON.stringify(validOrders));
          }
          setActiveOrders(validOrders);
        } else {
          setActiveOrders([]);
        }
      } else {
        setActiveOrders([]);
        // Migration: old schema used 'lastOrder' key
        const oldStored = localStorage.getItem("lastOrder");
        if (oldStored) {
          const order = JSON.parse(oldStored);
          if (order.expires > Date.now()) {
            setActiveOrders([order]);
            localStorage.setItem(ordersKey, JSON.stringify([order]));
          }
          localStorage.removeItem("lastOrder");
        }
      }
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[GoSip] Session restore failed — starting fresh:", e);
      }
      setSessionToken(null);
      setTableNumber(null);
      setActiveOrders([]);
    }

    setIsMounted(true);
  }, [branchSlug]);

  // Removed aggressive auto-clear useEffect that was destroying the session on first table selection

  // ── Persist orders ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isMounted && branchSlug) {
      localStorage.setItem(`activeOrders-${branchSlug}`, JSON.stringify(activeOrders));
    }
  }, [activeOrders, isMounted, branchSlug]);

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Select a table — generates a fresh session token with a creation timestamp. */
  const selectTable = (table: string) => {
    const token     = uuidv4();
    const createdAt = Date.now();
    setSessionToken(token);
    setTableNumber(table);
    if (branchSlug) {
      localStorage.setItem(
        `gosip-session-${branchSlug}`,
        JSON.stringify({ token, table, createdAt }),
      );
    }
    return token;
  };

  /**
   * Clear only the table identity (sessionToken + tableNumber).
   * Active order history is kept so the user can still see their order status.
   * Called after payment is collected.
   */
  const clearTableSession = () => {
    setSessionToken(null);
    setTableNumber(null);
    if (branchSlug) {
      localStorage.removeItem(`gosip-session-${branchSlug}`);
    }
  };

  /** Full session wipe — used on logout / hard reset. */
  const clearSession = () => {
    setSessionToken(null);
    setTableNumber(null);
    setActiveOrders([]);
    if (branchSlug) {
      localStorage.removeItem(`gosip-session-${branchSlug}`);
      localStorage.removeItem(`activeOrders-${branchSlug}`);
    }
  };

  const addOrder = (order: ActiveOrder) => {
    setActiveOrders((prev) => {
      const now      = Date.now();
      const filtered = prev.filter(
        (o) => o.token !== order.token && o.expires > now,
      );
      return [...filtered, order];
    });
  };

  const updateOrderStatus = (orderId: string, status: string) => {
    setActiveOrders((prev) =>
      prev.map((o) => (o.orderId === orderId ? { ...o, status } : o)),
    );
  };

  /**
   * Called when the admin marks an order as "collected" (cash paid).
   * We update the status so the order history stays visible for 2 hours,
   * but we CLEAR the table session so the table is instantly freed visually
   * and no longer shows as "Your Table" for this user.
   */
  const onOrderCollected = (orderId: string) => {
    setActiveOrders((prev) =>
      prev.map((o) => (o.orderId === orderId ? { ...o, status: 'collected' } : o)),
    );
    setSessionToken(null);
    setTableNumber(null);
    if (branchSlug) {
      localStorage.removeItem(`gosip-session-${branchSlug}`);
    }
  };

  /** Remove one order without clearing the table session. */
  const removeOrder = (orderId: string) => {
    setActiveOrders((prev) => prev.filter((o) => o.orderId !== orderId));
  };

  return (
    <SessionContext.Provider
      value={{
        sessionToken,
        tableNumber,
        activeOrders,
        selectTable,
        clearTableSession,
        clearSession,
        addOrder,
        updateOrderStatus,
        onOrderCollected,
        removeOrder,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context)
    throw new Error("useSession must be used within SessionProvider");
  return context;
}