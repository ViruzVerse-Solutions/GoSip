'use client'

import { useCart } from '@/lib/context/cart-context'
import { MenuItem } from '@/lib/types'
import { MdShoppingCart } from 'react-icons/md'

export default function CartBar() {
  const { totalItems, totalPrice, openCart } = useCart()
  if (totalItems === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg p-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div>
          {totalPrice !== undefined && (
            <p className="font-bold text-primary-600 text-2xl">₹{totalPrice}</p>
          )}
          <p className="text-sm text-gray-500">{totalItems} item{totalItems > 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCart} className="bg-primary-600 text-white font-semibold px-6 py-3 rounded-full shadow-btn flex items-center gap-2">
          <MdShoppingCart className="w-5 h-5" /> View Cart →
        </button>
      </div>
    </div>
  )
}