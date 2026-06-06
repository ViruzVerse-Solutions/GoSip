// components/menu/ItemCard.tsx
'use client'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { MenuItem } from '@/lib/types'
import { useCart } from '@/lib/context/cart-context'
import { useLanguage } from '@/lib/context/language-context'
import QuantityControl from '../ui/QuantityControl'
import AddButton from '../ui/AddButton'
import { MdOutlineRestaurant } from 'react-icons/md'

interface ItemCardProps {
  item: MenuItem
  branchSlug: string
  layout?: 'row' | 'col'
}

export default function ItemCard({ item, branchSlug, layout = 'row' }: ItemCardProps) {
  const { state, dispatch } = useCart()
  const { t } = useLanguage()
  const isOutOfStock = !item.is_available

  const cartItem = state.items.find((i) => i.itemId === item.id)
  const quantity = cartItem?.quantity ?? 0

  // Unified handler — avoids duplicating ADD_ITEM payload in 3 places
  const addPayload = {
    itemId: item.id,
    name: item.name,
    price: item.price,
    image_url: item.image_url ?? null,
  }

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    dispatch({ type: 'ADD_ITEM', payload: addPayload })
  }

  const handleDecrease = (e: React.MouseEvent) => {
    e.preventDefault()
    dispatch({ type: 'UPDATE_QUANTITY', payload: { itemId: item.id, quantity: quantity - 1 } })
  }

  // --- Shared sub-components ---

  const VegDot = () => (
    <div
      className={`absolute top-2 left-2 flex items-center justify-center w-[16px] h-[16px] rounded-[3px] bg-white/90 border-[1.5px] ${item.is_veg ? 'border-green-600' : 'border-red-500'
        }`}
    >
      <div className={`w-2 h-2 rounded-full ${item.is_veg ? 'bg-green-600' : 'bg-red-500'}`} />
    </div>
  )

  const SoldOutBadge = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-white/30">
      <span className="bg-gray-900 text-white text-[9px] tracking-widest font-semibold uppercase px-2 py-1 rounded-full">
        {t('soldOut')}
      </span>
    </div>
  )

  const ItemImage = ({ className = '' }: { className?: string }) =>
    item.image_url ? (
      <img
        src={item.image_url}
        alt={item.name}
        className={`w-full h-full object-cover ${isOutOfStock ? 'grayscale opacity-60' : ''} ${className}`}
        loading="lazy"
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center bg-primary-50">
        <MdOutlineRestaurant className={`w-8 h-8 ${isOutOfStock ? 'text-gray-300' : 'text-primary-400'}`} />
      </div>
    )

  const AddControl = ({ stopPropagation = false }) => {
    if (isOutOfStock) return null
    return (
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={quantity > 0 ? 'qty' : 'add'}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          onClick={stopPropagation ? (e) => e.preventDefault() : undefined}
        >
          {quantity > 0 ? (
            <QuantityControl quantity={quantity} onIncrease={handleAdd} onDecrease={handleDecrease} />
          ) : (
            <AddButton onClick={handleAdd} />
          )}
        </motion.div>
      </AnimatePresence>
    )
  }

  // --- Layouts ---

  if (layout === 'col') {
    return (
      <Link href={`/${branchSlug}/item/${item.id}`} className="shrink-0 w-32 block">
        <motion.div
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          className={`bg-white rounded-2xl shadow-card overflow-hidden h-full flex flex-col ${isOutOfStock ? 'opacity-70' : ''}`}
        >
          <div className="h-24 bg-gray-100 relative shrink-0 overflow-hidden">
            <ItemImage />
            <VegDot />
            {isOutOfStock && <SoldOutBadge />}
          </div>
          <div className="p-2 flex flex-col flex-1 gap-1">
            <p className="text-xs font-semibold text-gray-900 truncate">{item.name}</p>
            <p className={`text-xs font-bold ${isOutOfStock ? 'text-gray-400' : 'text-green-600'}`}>₹{item.price}</p>
            <div className="mt-auto pt-1" onClick={(e) => e.preventDefault()}>
              <AddControl />
            </div>
          </div>
        </motion.div>
      </Link>
    )
  }

  return (
    <Link href={`/${branchSlug}/item/${item.id}`} className="w-full block">
      <motion.div
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.985 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`group flex h-[100px] sm:h-[108px] rounded-2xl overflow-hidden transition-shadow duration-200 ${isOutOfStock
            ? 'bg-gray-50 border border-gray-200'
            : 'bg-white border border-gray-100 shadow-card hover:shadow-md hover:border-primary-200'
          }`}
      >
        {/* Image */}
        <div className="relative w-24 sm:w-[104px] shrink-0 overflow-hidden">
          <ItemImage className="group-hover:scale-105 transition-transform duration-500" />
          <VegDot />
          {isOutOfStock && <SoldOutBadge />}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-between px-3.5 py-3 min-w-0">
          <div className="min-w-0">
            <h3 className={`font-semibold text-sm sm:text-[15px] leading-snug line-clamp-1 ${isOutOfStock ? 'text-gray-400' : 'text-gray-900'
              }`}>
              {item.name}
            </h3>
            {item.description && (
              <p className="text-gray-400 text-[11px] sm:text-xs mt-0.5 line-clamp-1 hidden sm:block">
                {item.description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className={`font-bold text-base sm:text-lg tabular-nums ${isOutOfStock ? 'text-gray-400' : 'text-green-600'
              }`}>
              ₹{item.price}
            </span>

            {isOutOfStock ? (
              <span className="text-[11px] text-gray-400 font-medium">{t('unavailable')}</span>
            ) : (
              <div onClick={(e) => e.preventDefault()}>
                <AddControl />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  )
}