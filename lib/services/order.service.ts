import { fetchOrderByToken, subscribeToOrderUpdates } from './menu.service'

export interface PlaceOrderResult {
  token: string
  orderId: string
  dailyOrderNumber: number
  total: number
}

export async function placeOrder(
  sessionToken: string,
  tableNumber: string,
  branchId: string,
  items: { itemId: string; quantity: number }[],
): Promise<PlaceOrderResult> {
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken, tableNumber, branchId, items }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `Order failed (${res.status})`)
  return json as PlaceOrderResult
}

// Re-export so UI pages only import from order.service
export { fetchOrderByToken as fetchOrder, subscribeToOrderUpdates as subscribeToOrder }