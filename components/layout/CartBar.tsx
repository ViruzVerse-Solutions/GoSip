'use client'

import { memo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MdShoppingCart } from 'react-icons/md'
import { useCart } from '@/lib/context/cart-context'

// ─── Constants ────────────────────────────────────────────────────────────────
const CURRENCY = '₹'

// ─── CartBar ──────────────────────────────────────────────────────────────────
function CartBar() {
  const { totalItems, totalPrice, openCart } = useCart()
  const handleOpen = useCallback(() => openCart(), [openCart])

  return (
    <AnimatePresence>
      {totalItems > 0 && (
        <motion.div
          key="cart-bar"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="
            fixed bottom-0 left-0 right-0 z-50
            bg-white/95 backdrop-blur-md
            border-t border-gray-100
            shadow-[0_-4px_24px_0_rgba(0,0,0,0.08)]
            pb-[env(safe-area-inset-bottom)]
          "
          role="region"
          aria-label="Cart summary"
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 py-3">

            {/* Price + item count */}
            <div className="min-w-0">
              <p className="text-xl font-bold text-gray-900 leading-tight tabular-nums">
                {CURRENCY}{totalPrice?.toLocaleString('en-IN') ?? '0'}
              </p>
              <p className="text-[11px] text-gray-400 leading-tight mt-0.5">
                {totalItems} item{totalItems !== 1 ? 's' : ''} in cart
              </p>
            </div>

            {/* CTA */}
            <motion.button
              onClick={handleOpen}
              whileTap={{ scale: 0.96 }}
              aria-label={`View cart — ${totalItems} items, ${CURRENCY}${totalPrice}`}
              className="
                flex items-center gap-2
                bg-primary-600 hover:bg-primary-700 active:bg-primary-800
                text-white text-sm font-semibold
                px-5 py-2.5 rounded-full
                shadow-[0_2px_12px_0_rgba(var(--color-primary-rgb),0.35)]
                transition-colors duration-150
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-primary-400 focus-visible:ring-offset-2
                whitespace-nowrap
              "
            >
              <MdShoppingCart className="w-[18px] h-[18px] shrink-0" aria-hidden />
              View Cart
              <span aria-hidden className="opacity-70">→</span>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default memo(CartBar)