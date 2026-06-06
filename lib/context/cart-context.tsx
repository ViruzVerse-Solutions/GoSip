'use client'

import { createContext, useContext, useReducer, useState, useEffect, ReactNode } from 'react'

interface CartItemData {
  itemId: string
  name: string
  price: number
  image_url: string | null
  quantity: number
}

interface CartState {
  items: CartItemData[]
}

export type AddItemPayload = Omit<CartItemData, 'quantity'>

type CartAction =
  | { type: 'ADD_ITEM'; payload: AddItemPayload }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { itemId: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'RESTORE_CART'; payload: CartItemData[] }

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(i => i.itemId === action.payload.itemId)
      if (existing) {
        return { ...state, items: state.items.map(i => i.itemId === action.payload.itemId ? { ...i, quantity: i.quantity + 1 } : i) }
      }
      return { ...state, items: [...state.items, { ...action.payload, quantity: 1 }] }
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.itemId !== action.payload) }
    case 'UPDATE_QUANTITY': {
      if (action.payload.quantity <= 0) {
        return { ...state, items: state.items.filter(i => i.itemId !== action.payload.itemId) }
      }
      return { ...state, items: state.items.map(i => i.itemId === action.payload.itemId ? { ...i, quantity: action.payload.quantity } : i) }
    }
    case 'CLEAR_CART':
      return { ...state, items: [] }
    case 'RESTORE_CART':
      return { ...state, items: action.payload }
    default:
      return state
  }
}

interface CartContextType {
  state: CartState
  dispatch: React.Dispatch<CartAction>
  totalItems: number
  totalPrice: number
  isCartOpen: boolean
  openCart: () => void
  closeCart: () => void
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] })
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('gosip-cart-ids')
    if (saved) {
      try {
        const items = JSON.parse(saved)
        if (items.length > 0) {
          // Check if it's the valid new schema. It must have price and itemId.
          const isValidSchema = items.every((i: any) => i.itemId !== undefined && i.price !== undefined)
          
          if (!isValidSchema) {
            localStorage.removeItem('gosip-cart-ids')
          } else {
            // Restore cart in a single dispatch
            dispatch({ type: 'RESTORE_CART', payload: items })
          }
        }
      } catch (e) {
        // Cart data in localStorage is corrupted or from an old schema — discard it safely.
        // Log in dev so developers notice, silently recover in production.
        if (process.env.NODE_ENV === 'development') {
          console.warn('[GoSip] Failed to restore cart from localStorage — clearing:', e)
        }
        localStorage.removeItem('gosip-cart-ids')
      }
    }
    setIsMounted(true)
  }, [])

  // Save to localStorage when items change, but only after mount
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('gosip-cart-ids', JSON.stringify(state.items))
    }
  }, [state.items, isMounted])

  const totalItems = state.items.reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0)
  const totalPrice = state.items.reduce((sum: number, i) => sum + i.price * i.quantity, 0)
  const openCart = () => setIsCartOpen(true)
  const closeCart = () => setIsCartOpen(false)

  return (
    <CartContext.Provider value={{ state, dispatch, totalItems, totalPrice, isCartOpen, openCart, closeCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}