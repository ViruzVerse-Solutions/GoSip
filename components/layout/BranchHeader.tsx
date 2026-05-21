'use client'

import { motion } from 'framer-motion'
import type { Branch } from '@/lib/types'
import { MdReceiptLong } from 'react-icons/md'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/context/session-context'

import { Pacifico } from 'next/font/google'

const pacifico = Pacifico({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
})

export default function BranchHeader({ branch }: { branch: Branch }) {
  const { activeOrders } = useSession()
  const router = useRouter()

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-30 bg-white shadow-header"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-6">
        {/* Left: café logo + name */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo – if no logo, fallback to a stylish SVG icon */}
          {branch.logo_url ? (
            <img
              src={branch.logo_url}
              alt={branch.name}
              className="h-12 w-12 rounded-full object-cover border border-gray-200 shadow-sm"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-primary-600">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
              </svg>
            </div>
          )}
          <div className="min-w-0">
            <h1 className={`text-2xl text-primary-600 truncate leading-tight ${pacifico.className} pb-0.5`}>
              {branch.name}
            </h1>
            {branch.address && (
              <p className="text-xs text-gray-500 truncate mt-0.5">{branch.address}</p>
            )}
            <p className="text-[9px] text-gray-400 tracking-wide mt-0.5">Powered by <span className="font-semibold text-gray-500">Viruzverse</span></p>
          </div>
        </div>

        {/* Right: Order history button */}
        {activeOrders.length > 0 && (
          <button
            onClick={() => router.push(`/${branch.slug}/orders`)}
            className="relative p-2 rounded-full hover:bg-gray-50 transition-colors"
          >
            <MdReceiptLong className="w-6 h-6 text-gray-700" />
            <span className="absolute -top-0.5 -right-0.5 bg-primary-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
              {activeOrders.length > 9 ? '9+' : activeOrders.length}
            </span>
          </button>
        )}
      </div>
    </motion.header>
  )
}