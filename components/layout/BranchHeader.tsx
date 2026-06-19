//components/layout/BranchHeader.tsx

'use client'

import { memo, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Pacifico } from 'next/font/google'
import { MdReceiptLong } from 'react-icons/md'

import { useSession } from '@/lib/context/session-context'
import LanguageSelector from '@/components/ui/LanguageSelector'
import type { Branch } from '@/lib/types'

// ─── Font ─────────────────────────────────────────────────────────────────────
const pacifico = Pacifico({ weight: '400', subsets: ['latin'], display: 'swap' })

// ─── Constants ────────────────────────────────────────────────────────────────
const BADGE_MAX = 9

// ─── BranchAvatar ─────────────────────────────────────────────────────────────
const BranchAvatar = memo(({ logoUrl, name }: { logoUrl?: string | null; name: string }) => {
  const [imgError, setImgError] = useState(false)
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  if (logoUrl && !imgError) {
    return (
      <div className="shrink-0 relative h-11 w-11 min-w-[44px] rounded-full overflow-hidden border border-gray-200/80 shadow-sm ring-2 ring-white">
        <Image
          src={logoUrl}
          alt={`${name} logo`}
          fill
          sizes="44px"
          className="object-cover"
          priority
          unoptimized
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  return (
    <div
      aria-hidden
      className={`
        shrink-0 h-11 w-11 rounded-full
        bg-gradient-to-br from-primary-50 to-primary-100
        border border-primary-200/60 shadow-sm ring-2 ring-white
        flex items-center justify-center select-none
        ${pacifico.className}
      `}
    >
      <span className="text-sm text-primary-600 leading-none">{initials}</span>
    </div>
  )
})
BranchAvatar.displayName = 'BranchAvatar'

// ─── OrderButton ──────────────────────────────────────────────────────────────
const OrderButton = memo(({ count, slug }: { count: number; slug: string }) => {
  const router = useRouter()
  const handleClick = useCallback(() => router.push(`/${slug}/orders`), [router, slug])
  const label = count > BADGE_MAX ? `${BADGE_MAX}+` : String(count)

  return (
    <motion.button
      suppressHydrationWarning
      onClick={handleClick}
      aria-label={`${count} active order${count !== 1 ? 's' : ''} — view details`}
      whileTap={{ scale: 0.9 }}
      className="
        relative p-2.5 rounded-full
        text-gray-500 hover:text-primary-600
        hover:bg-primary-50 active:bg-primary-100
        transition-colors duration-150
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-primary-400 focus-visible:ring-offset-2
      "
    >
      <MdReceiptLong className="w-[22px] h-[22px]" aria-hidden />

      <AnimatePresence>
        <motion.span
          key="badge"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          className="
            absolute -top-0.5 -right-0.5
            min-w-[18px] h-[18px] px-1
            bg-primary-500 text-white
            text-[10px] font-bold leading-none
            rounded-full flex items-center justify-center
            shadow-sm tabular-nums pointer-events-none
          "
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
})
OrderButton.displayName = 'OrderButton'

// ─── BranchHeader ─────────────────────────────────────────────────────────────
function BranchHeader({ branch }: { branch: Branch }) {
  const { activeOrders } = useSession()

  return (
    <motion.header
      initial={{ y: -14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="
        sticky top-0 z-30
        bg-white/90 backdrop-blur-md
        border-b border-gray-100
        shadow-[0_1px_8px_0_rgba(0,0,0,0.06)]
      "
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 py-3">

        {/* Left — avatar + branch info */}
        <div className="flex items-center gap-3 min-w-0">
          <BranchAvatar logoUrl={branch.logo_url} name={branch.name} />

          <div className="min-w-0">
            <h1
              className={`
                text-xl leading-tight truncate text-primary-600
                ${pacifico.className}
              `}
            >
              {branch.name}
            </h1>

            {branch.address && (
              <p className="text-[11px] text-gray-400 truncate mt-0.5 leading-tight">
                {branch.address}
              </p>
            )}

            <p className="text-[9px] text-gray-300 tracking-widest uppercase mt-1 leading-none">
              Powered by{' '}
              <span className="font-semibold text-gray-400">Viruzverse</span>
            </p>
          </div>
        </div>

        {/* Right — language selector + active orders */}
        <div className="flex items-center gap-1">
          <LanguageSelector />
          {activeOrders.length > 0 && (
            <OrderButton count={activeOrders.length} slug={branch.slug} />
          )}
        </div>
      </div>
    </motion.header>
  )
}

export default memo(BranchHeader)