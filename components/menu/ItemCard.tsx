import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { MenuItem } from '@/lib/types'
import { useCart } from '@/lib/context/cart-context'
import QuantityControl from '../ui/QuantityControl'
import AddButton from '../ui/AddButton'
import { MdOutlineRestaurant } from 'react-icons/md'

export default function ItemCard({
  item,
  branchSlug,
  layout = 'row'
}: {
  item: MenuItem
  branchSlug: string
  layout?: 'row' | 'col'
}) {
  const { state, dispatch } = useCart()
  const isOutOfStock = !item.is_available

  const cartItem = state.items.find((i) => i.itemId === item.id)
  const quantity = cartItem ? cartItem.quantity : 0

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isOutOfStock)
      dispatch({
        type: 'ADD_ITEM',
        payload: { itemId: item.id, name: item.name, price: item.price, image_url: item.image_url ?? null },
      })
  }
  const handleIncrease = (e: React.MouseEvent) => {
    e.preventDefault()
    dispatch({
      type: 'ADD_ITEM',
      payload: { itemId: item.id, name: item.name, price: item.price, image_url: item.image_url ?? null },
    })
  }
  const handleDecrease = (e: React.MouseEvent) => {
    e.preventDefault()
    if (quantity > 0) {
      dispatch({ type: 'UPDATE_QUANTITY', payload: { itemId: item.id, quantity: quantity - 1 } })
    }
  }

  if (layout === 'col') {
    return (
      <Link href={`/${branchSlug}/item/${item.id}`} className="shrink-0 w-36 block">
        <motion.div
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          className={`bg-white rounded-2xl shadow-card overflow-hidden h-full flex flex-col ${isOutOfStock ? 'opacity-70' : ''}`}
        >
          <div className="h-24 bg-gray-100 relative shrink-0">
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className={`w-full h-full object-cover ${isOutOfStock ? 'grayscale' : ''}`} loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <MdOutlineRestaurant className="w-8 h-8" />
              </div>
            )}
            <div className={`absolute top-2 left-2 flex items-center justify-center w-[18px] h-[18px] rounded-[4px] bg-white/90 backdrop-blur-sm border-[1.5px] shadow-sm ${item.is_veg ? 'border-green-600' : 'border-red-500'}`}>
              <div className={`w-2.5 h-2.5 rounded-full ${item.is_veg ? 'bg-green-600' : 'bg-red-500'}`} />
            </div>
            {isOutOfStock && (
              <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px] flex items-center justify-center">
                <span className="bg-gray-900 text-white text-[9px] tracking-widest font-semibold uppercase px-2 py-1 rounded-full">Sold out</span>
              </div>
            )}
          </div>
          <div className="p-2 flex flex-col flex-1">
            <p className="text-xs font-semibold text-gray-900 truncate">{item.name}</p>
            <p className="text-xs font-bold text-green-600 mt-1">₹{item.price}</p>
            <div className="mt-auto pt-2" onClick={(e) => e.preventDefault()}>
              {!isOutOfStock && (
                quantity > 0 ? (
                  <QuantityControl quantity={quantity} onIncrease={handleIncrease} onDecrease={handleDecrease} />
                ) : (
                  <AddButton onClick={handleAdd} className="w-full" />
                )
              )}
            </div>
          </div>
        </motion.div>
      </Link>
    )
  }

  return (
    <Link href={`/${branchSlug}/item/${item.id}`} className="w-full block">
      <motion.div
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.985 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`
          group relative flex h-[100px] sm:h-[108px] rounded-2xl overflow-hidden
          transition-all duration-300
          ${
            isOutOfStock
              ? 'bg-gray-50 border border-gray-200'
              : 'bg-white border border-gray-100 shadow-card hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] hover:border-primary-200'
          }
        `}
      >
        {/* Left accent bar */}
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl bg-gradient-to-b from-primary-400 to-primary-600"
          initial={{ scaleY: 0, opacity: 0 }}
          whileHover={{ scaleY: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          style={{ transformOrigin: 'center' }}
        />

        {/* Image Section */}
        <div className="relative w-[90px] sm:w-[104px] shrink-0 overflow-hidden">
          {item.image_url ? (
            <motion.img
              src={item.image_url}
              alt={item.name}
              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${
                isOutOfStock ? 'opacity-40 grayscale' : ''
              }`}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-50 via-primary-100 to-primary-200 flex items-center justify-center">
              <MdOutlineRestaurant
                className={`w-8 h-8 sm:w-9 sm:h-9 transition-transform duration-300 group-hover:scale-110 ${
                  isOutOfStock ? 'text-gray-400' : 'text-primary-400'
                }`}
              />
            </div>
          )}

          {/* Veg / Non-veg indicator */}
          <div
            className={`absolute top-2 left-2 flex items-center justify-center w-[18px] h-[18px] rounded-[4px] bg-white/90 backdrop-blur-sm border-[1.5px] shadow-sm ${
              item.is_veg ? 'border-green-600' : 'border-red-500'
            }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${item.is_veg ? 'bg-green-600' : 'bg-red-500'}`} />
          </div>

          {/* Out of stock overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px] flex items-center justify-center">
              <span className="bg-gray-900 text-white text-[9px] tracking-widest font-semibold uppercase px-2 py-1 rounded-full">
                Sold out
              </span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 flex flex-col justify-between px-3.5 py-3 min-w-0">
          <div className="min-w-0">
            <h3
              className={`font-semibold text-sm sm:text-[15px] leading-snug line-clamp-1 transition-colors duration-200 ${
                isOutOfStock ? 'text-gray-400' : 'text-gray-900 group-hover:text-primary-800'
              }`}
            >
              {item.name}
            </h3>
            {item.description && (
              <p className="text-gray-500 text-[11px] sm:text-xs mt-0.5 line-clamp-1 hidden sm:block leading-relaxed">
                {item.description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            {/* Price */}
            <div className="flex items-baseline gap-0.5">
              <span className={`text-[11px] font-medium ${isOutOfStock ? 'text-gray-400' : 'text-green-600'}`}>₹</span>
              <span
                className={`font-bold text-base sm:text-lg leading-none tabular-nums ${
                  isOutOfStock ? 'text-gray-400' : 'text-green-600'
                }`}
              >
                {item.price}
              </span>
            </div>

            {/* Add / Quantity control */}
            <AnimatePresence mode="wait">
              {!isOutOfStock && (
                <motion.div
                  key={quantity > 0 ? 'qty' : 'add'}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  onClick={(e) => e.preventDefault()}
                >
                  {quantity > 0 ? (
                    <QuantityControl quantity={quantity} onIncrease={handleIncrease} onDecrease={handleDecrease} />
                  ) : (
                    <AddButton onClick={handleAdd} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}