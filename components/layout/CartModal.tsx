"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/lib/context/cart-context";
import { placeOrder } from "@/lib/services/order.service";
import { MenuItem } from "@/lib/types";
import QuantityControl from "../ui/QuantityControl";
import TableSelectionModal from "../order/TableSelectionModal";
import {
  MdClose,
  MdDeleteOutline,
  MdShoppingCart,
  MdRemoveShoppingCart,
} from "react-icons/md";
import { useSession } from "@/lib/context/session-context";
import { useLanguage } from "@/lib/context/language-context";

export default function CartModal({
  branchSlug,
  branchId,
}: {
  branchSlug?: string;
  branchId?: string;
}) {
  const { state, dispatch, totalItems, totalPrice, isCartOpen, closeCart } =
    useCart();
  const { tableNumber, selectTable, sessionToken, addOrder, activeOrders } = useSession();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const handlePlaceOrder = async (table: string, activeSessionToken?: string | null) => {
    if (!branchId || !branchSlug) return;
    setLoading(true);
    setError(null);
    setShowTableModal(false);

    try {
      let currentSessionToken = sessionToken;
      if (activeSessionToken) {
        currentSessionToken = selectTable(table, activeSessionToken);
      } else if (!tableNumber || !currentSessionToken || table !== tableNumber) {
        currentSessionToken = selectTable(table);
      }
      const result = await placeOrder(
        currentSessionToken,
        table,
        branchId,
        state.items,
      );

      addOrder({
        token: result.token,
        orderId: result.orderId,
        dailyOrderNumber: result.dailyOrderNumber,
        tableNumber: table,
        orderPlacedAt: Date.now(),
        expires: Date.now() + 2 * 60 * 60 * 1000, // 2 hours
        status: "pending",
        sessionToken: currentSessionToken || undefined,
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gosip-order-placed'));
      }

      // Find if we have a main active order in this session to redirect back to
      const mainOrder = activeOrders.find(
        (o) => o.status !== "collected" && o.status !== "cancelled"
      );
      const tokenToRedirect = mainOrder ? mainOrder.token : result.token;

      dispatch({ type: "CLEAR_CART" });
      closeCart();
      router.push(`/${branchSlug}/order/${tokenToRedirect}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const onProceedClick = () => {
    setError(null);
    // Always show table selector so user confirms/selects table
    // This covers: new session, expired session, and between orders
    setShowTableModal(true);
  };

  const handleClearAll = () => {
    dispatch({ type: "CLEAR_CART" });
    closeCart();
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          />

          {/* Cart sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[80vh] flex flex-col shadow-2xl"
          >
            <div className="w-10 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-2" />
            <div className="flex items-center justify-between px-5 py-2 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {t('yourCart')} · {totalItems} {totalItems !== 1 ? t('items') : t('item')}
              </h2>
              <div className="flex items-center gap-2">
                {totalItems > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded-full hover:bg-red-50 transition"
                  >
                    {t('clearAll')}
                  </button>
                )}
                <button
                  onClick={closeCart}
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  <MdClose className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-2 space-y-3">
              {state.items.map((cartItem, idx) => {
                return (
                  <div
                    key={cartItem.itemId || `cart-item-${idx}`}
                    className="flex items-center gap-3 py-3 border-b border-gray-50"
                  >
                    <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                      {cartItem.image_url ? (
                        <img
                          src={cartItem.image_url}
                          alt={cartItem.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <MdShoppingCart className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {cartItem.name || "Item"}
                      </p>
                      <p className="text-sm font-bold text-green-600 mt-0.5">
                        ₹{cartItem.price}
                      </p>
                    </div>
                    <QuantityControl
                      quantity={cartItem.quantity}
                      onIncrease={(e) => {
                        e.stopPropagation();
                        dispatch({
                          type: "ADD_ITEM",
                          payload: {
                            itemId: cartItem.itemId,
                            name: cartItem.name,
                            price: cartItem.price,
                            image_url: cartItem.image_url,
                          },
                        });
                      }}
                      onDecrease={(e) => {
                        e.stopPropagation();
                        if (cartItem.quantity > 1) {
                          dispatch({
                            type: "UPDATE_QUANTITY",
                            payload: {
                              itemId: cartItem.itemId,
                              quantity: cartItem.quantity - 1,
                            },
                          });
                        } else {
                          dispatch({
                            type: "REMOVE_ITEM",
                            payload: cartItem.itemId,
                          });
                        }
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch({
                          type: "REMOVE_ITEM",
                          payload: cartItem.itemId,
                        });
                      }}
                      className="p-1.5 text-red-400 hover:text-red-600 transition"
                    >
                      <MdDeleteOutline className="w-5 h-5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {totalItems > 0 && (
              <div className="border-t border-gray-100 px-5 py-4">
                {totalPrice !== undefined && (
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-700 font-medium">{t('total')}</span>
                    <span className="text-xl font-bold text-primary-600">
                      ₹{totalPrice}
                    </span>
                  </div>
                )}

                {error && (
                  <div className="mb-3 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100 text-center animate-pulse">
                    {error}
                  </div>
                )}

                {tableNumber ? (
                  <div className="space-y-2 mt-2">
                    <button
                      onClick={() => handlePlaceOrder(tableNumber)}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 active:scale-[0.98] text-white font-bold py-3.5 rounded-xl disabled:opacity-50 transition-all shadow-md shadow-primary-900/10 cursor-pointer"
                    >
                      {loading
                        ? t('placingOrder')
                        : `${t('confirmTableAndOrder').replace('{table}', tableNumber)} · ₹${totalPrice}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTableModal(true)}
                      disabled={loading}
                      className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all border border-gray-200/60 cursor-pointer"
                    >
                      {t('selectDifferentTable')}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={onProceedClick}
                    disabled={loading}
                    className="w-full bg-primary-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 cursor-pointer"
                  >
                    {loading
                      ? t('placingOrder')
                      : `${t('proceedToOrder')} · ₹${totalPrice}`}
                  </button>
                )}
              </div>
            )}
          </motion.div>

          {/* Table selection modal */}
          {branchId && (
            <TableSelectionModal
              branchId={branchId}
              isOpen={showTableModal}
              onClose={() => setShowTableModal(false)}
              onSelect={(table: string, activeSessionToken?: string | null) => handlePlaceOrder(table, activeSessionToken)}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}
