'use client'

import { useEffect, useState } from 'react'
import { fetchTablesByBranch } from '@/lib/services/menu.service'
import { motion, AnimatePresence } from 'framer-motion'
import { MdTableBar } from 'react-icons/md'
import useSWR from 'swr'

export default function TableSelectionModal({
  branchId,
  isOpen,
  onClose,
  onSelect,
}: {
  branchId: string
  isOpen: boolean
  onClose: () => void
  onSelect: (table: string) => void
}) {
  const { data: tables = [] } = useSWR(
    isOpen ? `tables-${branchId}` : null,
    () => fetchTablesByBranch(branchId),
    { revalidateOnFocus: false }
  )

  const handleSelect = (table: string) => {
    onSelect(table)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MdTableBar className="text-primary-600" />
              Select Your Table
            </h2>
            {tables.length > 0 ? (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {tables.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelect(t.table_number)}
                    className="p-3 bg-primary-50 border border-primary-200 rounded-xl text-primary-700 font-semibold hover:bg-primary-100 transition active:scale-95"
                  >
                    {t.table_number}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm mb-4">No tables available</p>
            )}
            <button
              onClick={onClose}
              className="w-full py-2 text-gray-500 font-medium text-sm"
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}