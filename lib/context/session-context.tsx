"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { v4 as uuidv4 } from "uuid";

export interface ActiveOrder {
  token: string;
  orderId: string;
  dailyOrderNumber: number;
  expires: number;
  tableNumber: string;
  orderPlacedAt: number;
  status?: string;
}

interface SessionContextType {
  sessionToken: string | null;
  tableNumber: string | null;
  activeOrders: ActiveOrder[];
  selectTable: (table: string) => void;
  clearSession: () => void;
  addOrder: (order: ActiveOrder) => void;
  updateOrderStatus: (orderId: string, status: string) => void;
  removeOrder: (orderId: string) => void;
}

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem("gosip-session");
      if (savedSession) {
        const { token, table } = JSON.parse(savedSession);
        setSessionToken(token);
        setTableNumber(table);
      }

      const storedOrders = localStorage.getItem("activeOrders");
      if (storedOrders) {
        let orders = JSON.parse(storedOrders);
        if (Array.isArray(orders)) {
          const now = Date.now();
          const validOrders = orders.filter((o: ActiveOrder) => o.expires > now);
          if (validOrders.length !== orders.length) {
            localStorage.setItem("activeOrders", JSON.stringify(validOrders));
          }
          setActiveOrders(validOrders);
        }
      } else {
        const oldStored = localStorage.getItem("lastOrder");
        if (oldStored) {
          const order = JSON.parse(oldStored);
          if (order.expires > Date.now()) {
            setActiveOrders([order]);
            localStorage.setItem("activeOrders", JSON.stringify([order]));
          }
          localStorage.removeItem("lastOrder");
        }
      }
    } catch (_) {}

    setIsMounted(true);
  }, []);

  // Persist activeOrders whenever they change
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("activeOrders", JSON.stringify(activeOrders));
    }
  }, [activeOrders, isMounted]);

  const selectTable = (table: string) => {
    const token = uuidv4();
    setSessionToken(token);
    setTableNumber(table);
    localStorage.setItem("gosip-session", JSON.stringify({ token, table }));
  };

  const clearSession = () => {
    setSessionToken(null);
    setTableNumber(null);
    setActiveOrders([]);
    localStorage.removeItem("gosip-session");
    localStorage.removeItem("activeOrders");
  };

  const addOrder = (order: ActiveOrder) => {
    setActiveOrders((prev) => {
      const now = Date.now();
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

  // Called when admin marks payment as collected — immediately expires this order's session
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
        clearSession,
        addOrder,
        updateOrderStatus,
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