'use client'

import { useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MdClose, MdRestaurant, MdTakeoutDining } from 'react-icons/md'
import { useLanguage } from '@/lib/context/language-context'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelect: (type: 'Dining' | 'Takeaway') => void
}

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

const buttonVariants = {
  tap: { scale: 0.97 },
  hover: { scale: 1.02, transition: { duration: 0.1 } }
}

export default function CartOrderTypeModal({ isOpen, onClose, onSelect }: Props) {
  const titleId = useId()
  const { t } = useLanguage()

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
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
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
            className="fixed z-[60] w-full bottom-0 left-0 right-0
                       sm:inset-0 sm:m-auto sm:max-w-sm sm:w-full sm:h-fit
                       bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl"
          >
            <div className="p-5">
              <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
              
              <div className="flex items-center justify-between mb-5 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 
                                rounded-xl flex items-center justify-center shadow-sm">
                    <MdRestaurant className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 id={titleId} className="text-lg font-semibold text-gray-900">
                      Order Type
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Select how you want your order
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

              <div className="grid grid-cols-2 gap-4 mb-6">
                <motion.button
                  variants={buttonVariants}
                  whileTap="tap"
                  whileHover="hover"
                  onClick={() => onSelect('Dining')}
                  className="flex flex-col items-center gap-3 py-6 px-4 rounded-2xl
                             bg-gradient-to-br from-primary-50 to-primary-100/50 
                             border border-primary-200 hover:border-primary-300 
                             text-primary-700 hover:shadow-md transition-all"
                >
                  <MdRestaurant className="w-8 h-8 opacity-80" />
                  <span className="font-semibold">Dining</span>
                </motion.button>
                
                <motion.button
                  variants={buttonVariants}
                  whileTap="tap"
                  whileHover="hover"
                  onClick={() => onSelect('Takeaway')}
                  className="flex flex-col items-center gap-3 py-6 px-4 rounded-2xl
                             bg-gradient-to-br from-orange-50 to-orange-100/50 
                             border border-orange-200 hover:border-orange-300 
                             text-orange-700 hover:shadow-md transition-all"
                >
                  <MdTakeoutDining className="w-8 h-8 opacity-80" />
                  <span className="font-semibold">Takeaway</span>
                </motion.button>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl text-sm font-medium text-gray-600
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
