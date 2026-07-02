import { supabaseBrowser } from '../supabase/client'

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
  location?: { latitude: number; longitude: number; accuracy: number; isMocked: boolean }
): Promise<PlaceOrderResult> {
  // Only send what the server needs — strip any extra fields (name, price, image_url)
  // The server re-validates all prices from the DB; client-provided values are ignored.
  const trimmedItems = items.map(({ itemId, quantity }) => ({ itemId, quantity }))
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionToken,
      tableNumber,
      branchId,
      items: trimmedItems,
      latitude: location?.latitude,
      longitude: location?.longitude,
      accuracy: location?.accuracy,
      isMocked: location?.isMocked,
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `Order failed (${res.status})`)
  return json as PlaceOrderResult
}

export async function fetchOrder(token: string) {
  const res = await fetch(`/api/orders/${token}`, {
    method: 'GET',
    cache: 'no-store',
  })
  if (!res.ok) {
    if (res.status === 404) return null
    throw new Error(`Failed to fetch order (${res.status})`)
  }
  return res.json()
}

export function subscribeToOrder(
  orderId: string,
  onUpdate: (updatedOrder: any) => void,
  sessionToken?: string | null,
) {
  const uniqueId = Math.random().toString(36).substring(7);

  const handleReconnect = (channel: ReturnType<typeof supabaseBrowser.channel>) => {
    channel.on('system' as any, { event: 'disconnect' }, () => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[GoSip] Realtime disconnected for order ${orderId}. Reconnecting...`)
      }
    })
  }

  if (sessionToken) {
    const channel = supabaseBrowser
      .channel(`order-session-${sessionToken}-${uniqueId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          const newRec = payload.new as any;
          const oldRec = payload.old as any;
          if (
            (newRec && newRec.session_token === sessionToken) ||
            (oldRec && oldRec.session_token === sessionToken)
          ) {
            onUpdate(newRec || oldRec || {});
          }
        },
      )
      .subscribe()

    handleReconnect(channel)

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }

  const channel = supabaseBrowser
    .channel(`order-${orderId}-${uniqueId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
        filter: `id=eq.${orderId}`,
      },
      (payload) => {
        onUpdate(payload.new || payload.old || {});
      },
    )
    .subscribe()

  handleReconnect(channel)

  return () => {
    supabaseBrowser.removeChannel(channel);
  };
}