export interface Branch {
  id: string
  name: string
  slug: string
  address?: string
  phone?: string
  logo_url?: string
  is_active: boolean
}

export interface Category {
  id: string
  branch_id: string
  name: string
  description?: string
  image_url?: string
  sort_order: number
  is_visible: boolean
}

export interface MenuItem {
  id: string
  branch_id: string
  category_id?: string
  name: string
  description?: string
  image_url?: string
  price: number
  original_price?: number
  is_veg: boolean
  is_available: boolean
  is_visible: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ItemVariant {
  id: string
  item_id: string
  name: string
  price: number        // or price_delta: number
  is_available: boolean
  sort_order: number
}

export interface ItemTag {
  id: string
  item_id: string
  tag: string          // the enum value — keep this
  label: string        // human-readable display
  color: string        // hex colour for the chip
}


export interface OrderWithItems {
  id: string
  branch_id: string
  table_number: string
  status: string
  token: string
  daily_order_number: number
  created_at: string
  order_items: {
    id: string
    order_id: string
    item_id: string
    quantity: number
    price: number
    menu_items: MenuItem
  }[]
}