'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import useSWR from 'swr'
import { fetchOrderByToken, subscribeToOrderUpdates } from '@/lib/services/menu.service'
import {
  MdCheckCircle,
  MdTableBar,
  MdAccessTime,
  MdFastfood,
  MdArrowBack,
  MdSchedule,
} from 'react-icons/md'
import { useSession } from '@/lib/context/session-context'

export default function OrderPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  const { addOrder } = useSession()

  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  const { data: order, isLoading: loading, mutate } = useSWR(
    token ? `/api/orders/${token}` : null,
    () => fetchOrderByToken(token),
    {
      revalidateOnFocus: true,
      onSuccess: (orderData) => {
        if (!orderData) return
        const created = new Date(orderData.created_at).getTime()
        const expires = created + 120 * 60 * 1000

        setTimeLeft((prev) => {
          if (prev === null) {
            return Math.max(0, created + 5 * 60 * 1000 - Date.now())
          }
          return prev
        })

        addOrder({
          token: orderData.token,
          dailyOrderNumber: orderData.daily_order_number,
          expires,
          tableNumber: orderData.table_number,
        })
      }
    }
  )

  useEffect(() => {
    if (!order?.id) return

    const unsubscribe = subscribeToOrderUpdates(order.id, (updatedOrder) => {
      mutate({ ...order, ...updatedOrder }, false)
    })

    return () => {
      unsubscribe()
    }
  }, [order?.id, mutate])

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1000) {
          clearInterval(interval)
          return 0
        }
        return prev - 1000
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [timeLeft])

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const formatPlacedTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="skeleton h-64 w-64 rounded-2xl" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Order not found</p>
      </div>
    )
  }

  const total = order.order_items.reduce(
    (sum: number, oi: any) => sum + oi.price * oi.quantity,
    0
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-50 pb-24"
    >
      {/* Header */}
      <div className="bg-primary-600 text-white p-6 rounded-b-3xl">
        <button
          onClick={() => router.push(`/${params.branch}`)}
          className="mb-4"
        >
          <MdArrowBack className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          <MdCheckCircle className="w-10 h-10" />
          <div>
            <h1 className="text-2xl font-bold">Order Placed!</h1>
            <p className="text-white/80 text-sm">
              Your order has been confirmed
            </p>
          </div>
        </div>
      </div>

      {/* Order details card */}
      <div className="max-w-2xl mx-auto px-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-md p-6">
          {/* Highlighted Table & Timer & Placed Time Row */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6">
            {/* Table pill */}
            <div className="flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-full border border-primary-200">
              <MdTableBar className="w-5 h-5" />
              <span className="text-sm font-semibold">
                Table {order.table_number}
              </span>
            </div>

            {/* Timer / expired message */}
            {timeLeft !== null && timeLeft > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full border border-amber-200">
                <MdAccessTime className="w-5 h-5" />
                <span className="text-sm font-semibold">
                  Est. wait: {formatTime(timeLeft)}
                </span>
              </div>
            )}
            {timeLeft === 0 && (
              <div className="flex items-center gap-2 bg-amber-50 text-amber-600 px-4 py-2 rounded-full border border-amber-200">
                <MdAccessTime className="w-5 h-5" />
                <span className="text-sm font-medium">
                  Hang tight – your order is being prepared!
                </span>
              </div>
            )}

            {/* Placed at */}
            <div className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-full border border-gray-200">
              <MdSchedule className="w-5 h-5" />
              <span className="text-sm font-medium">
                Placed at {formatPlacedTime(order.created_at)}
              </span>
            </div>
          </div>

          {/* Status badge */}
          <div className="mb-4">
            <span className="inline-block bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full uppercase">
              {order.status}
            </span>
          </div>

          <div className="border-t border-gray-100 pt-4 mb-4">
            <p className="text-sm text-gray-500 mb-2">
              Order #{order.daily_order_number}
            </p>
            {/* Token hidden */}
          </div>

          {/* Items */}
          <div className="space-y-3">
            {order.order_items.map((oi: any) => (
              <div key={oi.id} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <MdFastfood className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-800">
                    {oi.menu_items.name}
                  </span>
                  <span className="text-xs text-gray-400">x{oi.quantity}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  ₹{oi.price * oi.quantity}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-4 mt-4 flex justify-between">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-bold text-primary-600 text-lg">₹{total}</span>
          </div>
        </div>
      </div>

      {/* Continue browsing */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <button
          onClick={() => router.push(`/${params.branch}`)}
          className="w-full bg-primary-600 text-white font-semibold py-3 rounded-xl shadow-btn"
        >
          Continue Browsing
        </button>
      </div>
    </motion.div>
  )
}