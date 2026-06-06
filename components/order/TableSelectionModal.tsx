// components/order/TableSelectionModal.tsx
'use client'

import { useEffect, useId, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MdTableBar, MdClose, MdRestaurant, MdErrorOutline } from 'react-icons/md'
import { IoTabletLandscape } from 'react-icons/io5'
import useSWR from 'swr'
import { useLanguage } from '@/lib/context/language-context'
import { useSession } from '@/lib/context/session-context'
import { supabaseBrowser } from '@/lib/supabase/client'

interface Props {
  branchId: string
  isOpen: boolean
  onClose: () => void
  onSelect: (tableNumber: string) => void
}

// No module-level static cache since table occupancy status is highly dynamic

// Simplified variants without explicit transition (fixed TS error)
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
}

const modalVariants = {
  hidden: { y: '100%', opacity: 0 },
  visible: { y: 0, opacity: 1 },
  exit: { y: '100%', opacity: 0 }
}

const tableButtonVariants = {
  tap: { scale: 0.97 },
  hover: { scale: 1.02, transition: { duration: 0.1 } }
}

function TableSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-16 rounded-xl bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] animate-shimmer"
          style={{ animationDelay: `${i * 0.05}s` }}
        />
      ))}
    </div>
  )
}

function EmptyState() {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <MdRestaurant className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-gray-900 font-medium mb-1">{t('noTablesAvailable')}</h3>
      <p className="text-sm text-gray-500">{t('noTablesSetup')}</p>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
        <MdErrorOutline className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-gray-900 font-medium mb-1">{t('failedLoadTables')}</h3>
      <p className="text-sm text-gray-500 mb-4">{t('errorLoadingTables')}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 
                   hover:bg-primary-50 rounded-lg transition-colors"
      >
        {t('tryAgain')}
      </button>
    </div>
  )
}

export default function TableSelectionModal({ branchId, isOpen, onClose, onSelect }: Props) {
  const titleId = useId()
  const { t } = useLanguage()
  const { sessionToken, tableNumber: sessionTableNumber } = useSession()

  const { data: tables, isLoading, error, mutate } = useSWR<{ id: string; table_number: string; is_free?: boolean }[]>(
    isOpen ? `tables-${branchId}-${sessionToken || ''}` : null,
    async () => {
      const url = sessionToken
        ? `/api/tables/${branchId}?sessionToken=${sessionToken}`
        : `/api/tables/${branchId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch tables');
      const data = await res.json();
      return data;
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 0, // disable dedupe to always query live status
      errorRetryCount: 2,
    }
  )

  // Revalidate immediately on modal open to clear stale cached state
  useEffect(() => {
    if (isOpen) {
      mutate()
    }
  }, [isOpen, mutate])

  // Real-time subscription to order changes to update table occupancy instantly
  useEffect(() => {
    if (!isOpen) return

    const channel = supabaseBrowser
      .channel('table-occupancy-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `branch_id=eq.${branchId}`,
        },
        () => {
          mutate()
        }
      )
      .subscribe()

    return () => {
      supabaseBrowser.removeChannel(channel)
    }
  }, [isOpen, branchId, mutate])

  // Handle escape key and body scroll
  useEffect(() => {
    if (!isOpen) return
    const originalStyle = window.getComputedStyle(document.body).overflow
    document.body.style.overflow = 'hidden'

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = originalStyle
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const handleSelect = useCallback((tableNumber: string) => {
    onSelect(tableNumber)
    onClose()
  }, [onSelect, onClose])

  const handleRetry = useCallback(() => {
    mutate()
  }, [mutate])

  const renderContent = () => {
    if (isLoading) return <TableSkeleton />
    if (error) return <ErrorState onRetry={handleRetry} />
    if (!tables || tables.length === 0) return <EmptyState />

    return (
      <>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 max-h-[320px] overflow-y-auto 
                        pr-1 custom-scrollbar">
          {tables.map((table) => {
            const isCurrentTable = sessionTableNumber === table.table_number
            const isSelectable = table.is_free !== false || isCurrentTable

            return (
              <motion.button
                key={table.id}
                disabled={!isSelectable}
                variants={tableButtonVariants}
                whileTap={!isSelectable ? undefined : "tap"}
                whileHover={!isSelectable ? undefined : "hover"}
                onClick={() => isSelectable && handleSelect(table.table_number)}
                className={`
                  group relative py-4 px-2 rounded-xl text-center transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${isCurrentTable
                    ? "bg-gradient-to-br from-green-50 to-green-100/50 border-2 border-green-500 text-green-700 hover:shadow shadow-sm"
                    : !isSelectable
                      ? "bg-gray-50 border border-gray-100 text-gray-300 cursor-not-allowed"
                      : "bg-gradient-to-br from-primary-50 to-primary-100/50 border border-primary-200 hover:border-primary-300 text-primary-700 hover:shadow shadow-sm"
                  }
                `}
              >
                <div className="flex flex-col items-center gap-1">
                  <IoTabletLandscape className={`w-4 h-4 transition-opacity ${
                    isCurrentTable
                      ? "opacity-80 text-green-600"
                      : !isSelectable
                        ? "opacity-30"
                        : "opacity-60 group-hover:opacity-100"
                  }`} />
                  <span className="truncate text-sm">{table.table_number}</span>
                  {isCurrentTable ? (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-green-600 mt-0.5">
                      Your Table
                    </span>
                  ) : !isSelectable ? (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-red-400 mt-0.5">
                      Occupied
                    </span>
                  ) : null}
                </div>
              </motion.button>
            )
          })}
        </div>
        
        <div className="text-center text-xs text-gray-400">
          {t('showingTables').replace('{count}', String(tables.length))}
        </div>
      </>
    )
  }

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            key="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.8 }}
            className="fixed z-50 w-full bottom-0 left-0 right-0
                       sm:inset-0 sm:m-auto sm:max-w-md sm:w-full sm:h-fit
                       bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl"
          >
            <div className="p-5">
              <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
              
              <div className="flex items-center justify-between mb-5 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 
                                rounded-xl flex items-center justify-center shadow-sm">
                    <MdTableBar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 id={titleId} className="text-lg font-semibold text-gray-900">
                      {t('selectYourTable')}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t('chooseSeated')}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="w-9 h-9 flex items-center justify-center rounded-full
                           text-gray-400 hover:text-gray-600 hover:bg-gray-100
                           transition-all duration-200 focus:outline-none focus:ring-2 
                           focus:ring-gray-300 active:scale-95"
                >
                  <MdClose className="w-5 h-5" />
                </button>
              </div>

              <div className="min-h-[240px]">
                {renderContent()}
              </div>

              <button
                onClick={onClose}
                className="w-full mt-4 py-3 rounded-xl text-sm font-medium text-gray-600
                         bg-gray-50 hover:bg-gray-100 hover:text-gray-800
                         border border-gray-200 transition-all duration-200
                         focus:outline-none focus:ring-2 focus:ring-gray-300
                         active:scale-[0.98]"
              >
                {t('cancel')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}