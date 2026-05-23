'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import useSWR from 'swr'
import {
  MdArrowBack, MdCheckCircle, MdAccessTime,
  MdRestaurant, MdPayment, MdCelebration, MdTimer
} from 'react-icons/md'
import { fetchOrderByToken, subscribeToOrderUpdates } from '@/lib/services/menu.service'
import { useSession } from '@/lib/context/session-context'

const ESTIMATE_MS = 5 * 60 * 1000
const SESSION_TTL = 120 * 60 * 1000
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const GREEN   = '#1A9E3F'
const GREEN_D = '#158033'
const GREEN_XD= '#0f6028'
const GREEN_L = '#e8f7ed'
const GREEN_M = '#b3e4c2'

type OrderItem = {
  id: string
  price: number
  quantity: number
  menu_items: { name: string }
}

type Order = {
  id: string
  token: string
  created_at: string
  status: string
  table_number: number
  daily_order_number: number
  order_items: OrderItem[]
}

const formatCountdown = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}

const formatOrderTime = (iso: string) => {
  const date = new Date(iso)
  const hours = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return {
    time: `${String(hours % 12 || 12).padStart(2, '0')}:${minutes}`,
    ampm: hours >= 12 ? 'PM' : 'AM',
    date: `${date.getDate()} ${MONTHS[date.getMonth()]}`
  }
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
const LoadingSkeleton = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: GREEN_L }}>
    <div className="w-full max-w-md mx-4">
      <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
        <div className="h-56 animate-pulse" style={{ background: GREEN_M }} />
        <div className="p-6 space-y-4">
          <div className="h-8 rounded-xl animate-pulse" style={{ background: GREEN_L, width: '60%' }} />
          <div className="h-20 rounded-xl animate-pulse" style={{ background: GREEN_L }} />
          <div className="h-12 rounded-xl animate-pulse" style={{ background: GREEN_L }} />
        </div>
      </div>
    </div>
  </div>
)

// ─── Step Indicator ───────────────────────────────────────────────────────────
type StepState = 'done' | 'active' | 'pending'
const StepRow = ({ states }: { states: [StepState, StepState, StepState] }) => {
  const labels = ['Received', 'Preparing', 'Ready!']
  const icons = [
    <path key="c" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 6L9 17l-5-5" />,
    <><circle key="c1" cx="12" cy="12" r="10" /><polyline key="c2" points="12 6 12 12 16 14" /></>,
    <path key="s" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2}
      d="M12 3v1M12 20v1M4.22 4.22l.7.7M19.08 19.08l.7.7M3 12H4M20 12h1M4.22 19.78l.7-.7M19.08 4.92l.7-.7M9 12l2 2 4-4" />,
  ]

  return (
    <div className="flex items-center px-5 py-4">
      {states.map((s, i) => (
        <>
          <div key={i} className="flex flex-col items-center" style={{ flex: '0 0 auto' }}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: s === 'done' ? GREEN : s === 'active' ? '#fff' : GREEN_L,
                border: s === 'active' ? `2.5px solid ${GREEN}` : s === 'pending' ? `2px solid ${GREEN_M}` : 'none',
                color: s === 'done' ? '#fff' : s === 'active' ? GREEN : '#aac8b4',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                {icons[i]}
              </svg>
            </div>
            <span className="text-xs font-semibold mt-1.5" style={{
              color: s === 'pending' ? '#aac8b4' : s === 'active' ? GREEN_D : GREEN,
              fontSize: 10, letterSpacing: '0.2px'
            }}>
              {labels[i]}
            </span>
          </div>
          {i < 2 && (
            <div
              key={`line-${i}`}
              className="flex-1 h-0.5 mx-1 mb-4"
              style={{ background: states[i] === 'done' ? GREEN : GREEN_M }}
            />
          )}
        </>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrderPage() {
  const { branch, token } = useParams<{ branch: string; token: string }>()
  const router = useRouter()
  const { addOrder } = useSession()
  const [remaining, setRemaining] = useState<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const { data: order, isLoading, mutate } = useSWR<Order>(
    token ? `/api/orders/${token}` : null,
    () => fetchOrderByToken(token),
    {
      revalidateOnFocus: true,
      onSuccess: (data) => {
        if (!data) return
        const createdTime = new Date(data.created_at).getTime()
        const timeRemaining = Math.max(0, createdTime + ESTIMATE_MS - Date.now())
        setRemaining(timeRemaining)
        addOrder({
          token: data.token,
          dailyOrderNumber: data.daily_order_number,
          expires: createdTime + SESSION_TTL,
          tableNumber: data.table_number
        })
      }
    }
  )

  useEffect(() => {
    if (!order?.id) return
    return subscribeToOrderUpdates(order.id, (updated) => mutate({ ...order, ...updated }, false))
  }, [order?.id, mutate])

  useEffect(() => {
    if (remaining === null || remaining <= 0) return
    timerRef.current = setInterval(() => {
      setRemaining(prev => (!prev || prev <= 1000) ? 0 : prev - 1000)
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [remaining !== null])

  const isReady = remaining === 0
  const total = order?.order_items.reduce((sum, i) => sum + i.price * i.quantity, 0) || 0
  const { time, ampm, date } = order ? formatOrderTime(order.created_at) : { time: '', ampm: '', date: '' }

  if (isLoading) return <LoadingSkeleton />
  if (!order) return <NotFoundState router={router} branch={branch} />

  const stepStates: [StepState, StepState, StepState] = isReady
    ? ['done', 'done', 'active']
    : ['done', 'active', 'pending']

  return (
    <div className="min-h-screen" style={{ background: '#f0faf4' }}>
      {/* ── Header ── */}
      <div
        className="relative overflow-hidden px-5 pt-10 pb-14"
        style={{ background: GREEN }}
      >
        {/* decorative circles */}
        <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.07)' }} />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.05)' }} />

        <button
          onClick={() => router.push(`/${branch}`)}
          className="relative z-10 flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors"
          style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)', border: 'none' }}
        >
          <MdArrowBack className="w-4 h-4" /> Back
        </button>

        <AnimatePresence mode="wait">
          {isReady ? (
            <motion.div key="ready" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#a8ffb8' }} />
                  Ready
                </span>
              </div>
              <h1 className="text-4xl font-extrabold text-white mb-1" style={{ letterSpacing: '-1px' }}>
                Order Ready!
              </h1>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Your meal is waiting for you
              </p>
            </motion.div>
          ) : (
            <motion.div key="waiting" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
                  <span className="w-2 h-2 rounded-full inline-block animate-pulse" style={{ background: '#a8ffb8' }} />
                  {order.status}
                </span>
              </div>
              <h1 className="text-4xl font-extrabold text-white mb-1" style={{ letterSpacing: '-1px' }}>
                Order Placed
              </h1>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
                We're preparing your meal with care
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Main Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 -mt-8"
      >
        <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: '0 4px 24px rgba(26,158,63,0.12)' }}>

          {/* Timer / Ready banner */}
          <AnimatePresence mode="wait">
            {isReady ? (
              <motion.div
                key="ready-banner"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-6 text-center"
                style={{ background: GREEN_D }}
              >
                <div className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.18)' }}>
                  <MdCelebration className="w-8 h-8 text-white" />
                </div>
                <p className="text-white font-bold text-lg">Your order is ready!</p>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  Please pick up at the counter
                </p>
              </motion.div>
            ) : remaining !== null && remaining > 0 ? (
              <motion.div
                key="timer-banner"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-6 text-center relative overflow-hidden"
                style={{ background: GREEN }}
              >
                <div className="absolute inset-0 pointer-events-none" style={{
                  backgroundImage: 'repeating-linear-gradient(45deg,transparent,transparent 12px,rgba(255,255,255,0.03) 12px,rgba(255,255,255,0.03) 13px)'
                }} />
                <MdTimer className="w-7 h-7 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.7)' }} />
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Estimated Time
                </p>
                <p className="font-extrabold text-white" style={{ fontSize: 52, letterSpacing: '-2px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {formatCountdown(remaining)}
                </p>
                <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.55)' }}>until your order is ready</p>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Progress steps */}
          <StepRow states={stepStates} />

          {/* Divider */}
          <div className="mx-5 h-px" style={{ background: GREEN_L }} />

          {/* Order meta */}
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2 text-sm" style={{ color: '#5a6a61' }}>
              <MdAccessTime className="w-4 h-4" style={{ color: GREEN }} />
              {time} {ampm} · {date}
            </div>
            <div className="flex gap-2">
              {[`Table ${order.table_number}`, `#${order.daily_order_number}`].map(tag => (
                <span key={tag} className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: GREEN_L, color: GREEN_XD }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="mx-5 h-px" style={{ background: GREEN_L }} />

          {/* Items */}
          <div className="px-5 pt-4 pb-2">
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#aac8b4', letterSpacing: '1.2px' }}>
              Your Order · {order.order_items.length} {order.order_items.length === 1 ? 'item' : 'items'}
            </p>
            <div className="flex flex-col gap-2.5">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0"
                    style={{ background: GREEN_L, color: GREEN }}>
                    {item.quantity}×
                  </span>
                  <span className="flex-1 text-sm font-medium" style={{ color: '#1a2e23' }}>
                    {item.menu_items.name}
                  </span>
                  <span className="text-sm font-bold" style={{ color: '#1a2e23' }}>
                    ₹{item.price * item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between px-5 py-4 mt-3"
            style={{ background: GREEN_L }}>
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#5a6a61' }}>
              <MdPayment className="w-5 h-5" style={{ color: GREEN }} />
              Total
            </div>
            <span className="font-extrabold" style={{ fontSize: 28, letterSpacing: '-1px', color: GREEN_XD }}>
              ₹{total}
            </span>
          </div>

          {/* CTA */}
          <div className="px-5 pt-4 pb-6">
            <button
              onClick={() => router.push(`/${branch}`)}
              className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-95"
              style={{ background: GREEN, border: 'none', letterSpacing: '0.2px' }}
              onMouseEnter={e => (e.currentTarget.style.background = GREEN_D)}
              onMouseLeave={e => (e.currentTarget.style.background = GREEN)}
            >
              {isReady ? 'Back to Menu' : 'Continue to Explore'}
            </button>
            {!isReady && (
              <p className="text-center text-xs mt-3" style={{ color: '#aac8b4', fontWeight: 500 }}>
                We'll update you when your order is ready
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Not Found ────────────────────────────────────────────────────────────────
const NotFoundState = ({ router, branch }: { router: any; branch: string }) => (
  <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#f0faf4' }}>
    <div className="text-center">
      <div className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center"
        style={{ background: '#e8f7ed' }}>
        <MdRestaurant className="w-10 h-10" style={{ color: '#1A9E3F' }} />
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: '#1a2e23' }}>Order Not Found</h2>
      <p className="text-sm mb-6" style={{ color: '#5a6a61' }}>This order link seems to be invalid</p>
      <button
        onClick={() => router.push(`/${branch}`)}
        className="px-8 py-3 rounded-xl font-bold text-white text-sm"
        style={{ background: '#1A9E3F', border: 'none' }}
      >
        Back to Menu
      </button>
    </div>
  </div>
)