'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import useSWR from 'swr'
import {
  MdCheckCircle,
  MdTableBar,
  MdAccessTime,
  MdFastfood,
  MdArrowBack,
  MdSchedule,
} from 'react-icons/md'
import { fetchOrderByToken, subscribeToOrderUpdates } from '@/lib/services/menu.service'
import { useSession } from '@/lib/context/session-context'

const ESTIMATE_MS = 5 * 60 * 1000
const SESSION_TTL_MS = 120 * 60 * 1000

function formatCountdown(ms: number) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export default function OrderPage() {
  const params = useParams()
  const router = useRouter()
  const branch = params.branch as string
  const token = params.token as string
  const { addOrder } = useSession()

  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  const { data: order, isLoading, mutate } = useSWR(
    token ? `/api/orders/${token}` : null,
    () => fetchOrderByToken(token),
    {
      revalidateOnFocus: true,
      onSuccess(data) {
        if (!data) return
        const created = new Date(data.created_at).getTime()
        setTimeLeft(prev => prev ?? Math.max(0, created + ESTIMATE_MS - Date.now()))
        addOrder({
          token: data.token,
          dailyOrderNumber: data.daily_order_number,
          expires: created + SESSION_TTL_MS,
          tableNumber: data.table_number,
        })
      },
    }
  )

  // Real-time order updates
  useEffect(() => {
    if (!order?.id) return
    const unsub = subscribeToOrderUpdates(order.id, updated =>
      mutate({ ...order, ...updated }, false)
    )
    return unsub
  }, [order?.id, mutate])

  // Countdown tick
  useEffect(() => {
    if (!timeLeft) return
    const id = setInterval(
      () => setTimeLeft(p => (p && p > 1000 ? p - 1000 : 0)),
      1000
    )
    return () => clearInterval(id)
  }, [timeLeft])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="skeleton h-64 w-full max-w-md rounded-2xl mx-4" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <p className="text-gray-500 text-sm">Order not found.</p>
      </div>
    )
  }

  const total: number = order.order_items.reduce(
    (sum: number, oi: any) => sum + oi.price * oi.quantity,
    0
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-gray-50 pb-28"
    >
      {/* Header */}
      <div className="bg-primary-600 text-white px-4 pt-5 pb-10 rounded-b-3xl">
        <button
          aria-label="Go back"
          onClick={() => router.push(`/${branch}`)}
          className="mb-5 p-1 -ml-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <MdArrowBack className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-3">
          <MdCheckCircle className="w-9 h-9 shrink-0" />
          <div>
            <h1 className="text-xl font-bold leading-tight">Order Placed!</h1>
            <p className="text-white/75 text-sm">Your order has been confirmed</p>
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="max-w-lg mx-auto px-4 -mt-5">
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">

          {/* Meta pills */}
          <div className="flex flex-wrap gap-2 px-5 pt-5">
            <Pill icon={<MdTableBar className="w-4 h-4" />} color="primary">
              Table {order.table_number}
            </Pill>

            {timeLeft !== null && timeLeft > 0 && (
              <Pill icon={<MdAccessTime className="w-4 h-4" />} color="amber">
                Est. wait: {formatCountdown(timeLeft)}
              </Pill>
            )}
            {timeLeft === 0 && (
              <Pill icon={<MdAccessTime className="w-4 h-4" />} color="amber">
                Hang tight — being prepared!
              </Pill>
            )}

            <Pill icon={<MdSchedule className="w-4 h-4" />} color="gray">
              Placed at {formatTime(order.created_at)}
            </Pill>
          </div>

          {/* Order meta */}
          <div className="px-5 pt-4 pb-3 flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">
              Order #{order.daily_order_number}
            </span>
            <span className="text-xs font-bold uppercase tracking-wide bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">
              {order.status}
            </span>
          </div>

          <div className="border-t border-gray-100 mx-5" />

          {/* Items */}
          <ul className="px-5 py-3 space-y-3">
            {order.order_items.map((oi: any) => (
              <li key={oi.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <MdFastfood className="w-4 h-4 text-gray-300 shrink-0" />
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {oi.menu_items.name}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">×{oi.quantity}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900 shrink-0">
                  ₹{oi.price * oi.quantity}
                </span>
              </li>
            ))}
          </ul>

          {/* Total */}
          <div className="border-t border-gray-100 mx-5 mb-5" />
          <div className="flex justify-between items-center px-5 pb-5">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-bold text-primary-600 text-lg">₹{total}</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-sm border-t border-gray-200 px-4 py-3 safe-area-pb">
        <button
          onClick={() => router.push(`/${branch}`)}
          className="w-full max-w-lg mx-auto block bg-primary-600 hover:bg-primary-700 active:scale-[0.98] text-white font-semibold py-3.5 rounded-xl transition-all duration-150 shadow-sm"
        >
          Continue Browsing
        </button>
      </div>
    </motion.div>
  )
}

// ─── Pill helper ──────────────────────────────────────────────────────────────

type PillColor = 'primary' | 'amber' | 'gray'

const pillStyles: Record<PillColor, string> = {
  primary: 'bg-primary-50 text-primary-700 border-primary-200',
  amber:   'bg-amber-50  text-amber-700  border-amber-200',
  gray:    'bg-gray-100  text-gray-600   border-gray-200',
}

function Pill({
  icon,
  color,
  children,
}: {
  icon: React.ReactNode
  color: PillColor
  children: React.ReactNode
}) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${pillStyles[color]}`}
    >
      {icon}
      {children}
    </div>
  )
}