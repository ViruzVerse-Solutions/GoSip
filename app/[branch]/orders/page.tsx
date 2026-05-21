//app/branch/orders/page.tsx

'use client'

import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useSession } from '@/lib/context/session-context'
import { MdArrowBack, MdReceipt, MdTableBar, MdAccessTime } from 'react-icons/md'

export default function OrdersHistoryPage() {
  const { activeOrders } = useSession()
  const router = useRouter()
  const params = useParams()
  const branchSlug = params.branch as string

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-50 pb-24"
    >
      {/* Header */}
      <div className="bg-primary-600 text-white p-6 rounded-b-3xl">
        <button onClick={() => router.push(`/${branchSlug}`)} className="mb-4">
          <MdArrowBack className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          <MdReceipt className="w-10 h-10" />
          <div>
            <h1 className="text-2xl font-bold">Your Orders</h1>
            <p className="text-white/80 text-sm">
              {activeOrders.length} active order{activeOrders.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Orders list */}
      <div className="max-w-2xl mx-auto px-4 -mt-4">
        {activeOrders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-6 text-center text-gray-500">
            No active orders
          </div>
        ) : (
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <motion.button
                key={order.token}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(`/${branchSlug}/order/${order.token}`)}
                className="w-full bg-white rounded-2xl shadow-md p-5 flex flex-col gap-3 text-left hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-primary-600">
                      Order #{order.dailyOrderNumber}
                    </span>
                    <span className="w-1 h-1 bg-gray-400 rounded-full" />
                    <span className="flex items-center gap-1 text-gray-500 text-xs">
                      <MdTableBar className="w-4 h-4" />
                      Table {order.tableNumber}
                    </span>
                  </div>
                  <MdAccessTime className="w-5 h-5 text-gray-400" />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Back to menu */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <button
          onClick={() => router.push(`/${branchSlug}`)}
          className="w-full bg-primary-600 text-white font-semibold py-3 rounded-xl shadow-btn"
        >
          Continue Browsing
        </button>
      </div>
    </motion.div>
  )
}