'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MdNotificationsActive } from 'react-icons/md'
import { useSession } from '@/lib/context/session-context'
import { useBranchData } from '@/lib/context/branch-context'
export default function OrderReadyAlertModal() {
  const { activeOrders } = useSession()
  const { branch } = useBranchData()
  
  // Track which orders have had their alarms dismissed
  const [acknowledgedOrders, setAcknowledgedOrders] = useState<Set<string>>(new Set())
  
  // Find the first ready order that hasn't been acknowledged
  const readyOrder = activeOrders.find(
    o => o.status === 'ready' && !acknowledgedOrders.has(o.orderId)
  )

  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Only run this logic if it's a cart model and there is a ready order
    if (branch?.type !== 'cart' || !readyOrder) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      return
    }

    if (!audioRef.current) {
      audioRef.current = new Audio('/sounds/alert.aac')
      audioRef.current.loop = true
    }

    // Start playing the alert loop
    audioRef.current.currentTime = 0
    
    // Add a slight delay to ensure the browser has registered recent user clicks
    const playTimeout = setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play().catch((err) => {
          console.warn('Autoplay blocked by browser. User needs to interact with the page first.', err)
        })
      }
    }, 100)

    return () => {
      clearTimeout(playTimeout)
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [readyOrder, branch?.type])

  const handleStopAlert = () => {
    if (readyOrder) {
      setAcknowledgedOrders(prev => {
        const newSet = new Set(prev)
        newSet.add(readyOrder.orderId)
        return newSet
      })
    }
    
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  return (
    <AnimatePresence>
      {readyOrder && branch?.type === 'cart' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl overflow-hidden relative"
          >
            {/* Pulsing background effect */}
            <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none" />
            
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
              <MdNotificationsActive className="w-10 h-10 text-red-600 animate-bounce" />
            </div>
            
            <h2 className="text-2xl font-black text-gray-900 mb-2 relative z-10">
              Order Ready!
            </h2>
            <p className="text-gray-600 mb-8 relative z-10 font-medium">
              Your order #{readyOrder.dailyOrderNumber} is ready for pickup at the counter.
            </p>
            
            <button
              onClick={handleStopAlert}
              className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-lg py-4 rounded-2xl transition-colors relative z-10 shadow-lg shadow-red-600/30"
            >
              STOP ALERT
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
