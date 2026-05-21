//item/[itemId]/page.tsx

'use client'

import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useCart } from '@/lib/context/cart-context'
import { useBranchData } from '@/lib/context/branch-context'
import SuggestedItems from '@/components/menu/SuggestedItems'
import QuantityControl from '@/components/ui/QuantityControl'
import { MdArrowBack, MdShoppingCart, MdOutlineRestaurant } from 'react-icons/md'

export default function ItemPage() {
  const params = useParams()
  const router = useRouter()
  const branchSlug = params.branch as string
  const itemId = params.itemId as string

  const { state, dispatch } = useCart()

  const { items } = useBranchData()
  const item = items.find((i) => i.id === itemId)

  // Use the pre-fetched item details directly
  const cartItem = state.items.find((i) => i.itemId === itemId)
  const cartQuantity = cartItem?.quantity ?? 0

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Item not found</div>
      </div>
    )
  }

  const isOutOfStock = !item.is_available

  const handleIncrease = () => dispatch({ type: 'ADD_ITEM', payload: { itemId: item.id, name: item.name, price: item.price, image_url: item.image_url ?? null } })
  const handleDecrease = () => {
    if (cartQuantity > 0)
      dispatch({ type: 'UPDATE_QUANTITY', payload: { itemId: item.id, quantity: cartQuantity - 1 } })
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="relative w-full h-72">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-amber-100 to-amber-50 flex items-center justify-center">
            <MdOutlineRestaurant className="w-16 h-16 text-amber-300" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
        <button
          onClick={() => router.back()}
          className="absolute top-6 left-6 z-10 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center"
        >
          <MdArrowBack className="w-5 h-5 text-gray-900" />
        </button>
        <span
          className={`absolute top-6 right-6 w-5 h-5 rounded border-2 flex items-center justify-center bg-white/80 ${item.is_veg ? 'border-green-600' : 'border-red-500'}`}
        >
          <span className={`w-2.5 h-2.5 rounded-full ${item.is_veg ? 'bg-green-600' : 'bg-red-500'}`} />
        </span>
      </div>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-t-3xl -mt-6 relative z-10 px-4 pt-6"
      >
        <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
        {item.description && (
          <p className="text-gray-400 text-sm mt-2 line-clamp-3">{item.description}</p>
        )}
        <div className="flex items-center gap-3 mt-4">
          <span className="text-xl font-bold text-green-600">₹{item.price}</span>
          {item.original_price && item.original_price > item.price && (
            <span className="text-sm line-through text-gray-400">₹{item.original_price}</span>
          )}
        </div>

        {!isOutOfStock && (
          <div className="mt-6">
            {cartQuantity === 0 ? (
              <button
                onClick={handleIncrease}
                className="w-full h-12 bg-primary-600 text-white font-bold text-lg rounded-2xl shadow-btn active:scale-95 transition flex items-center justify-center gap-2"
              >
                <MdShoppingCart className="w-5 h-5" />
                Add to Cart — ₹{item.price}
              </button>
            ) : (
              <div className="flex items-center justify-between bg-primary-50 p-4 rounded-2xl">
                <span className="text-gray-700 font-medium">Quantity</span>
                <QuantityControl
                  quantity={cartQuantity}
                  onIncrease={handleIncrease}
                  onDecrease={handleDecrease}
                />
              </div>
            )}
          </div>
        )}

        <SuggestedItems currentItemId={item.id} />
      </motion.div>

      {/* Out of stock – fixed bottom banner */}
      {isOutOfStock && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-red-50 border-t border-red-200 px-5 py-4 flex items-center justify-center gap-2 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
          <span className="text-red-600 font-semibold text-sm">This item is currently out of stock</span>
        </div>
      )}
    </div>
  )
}