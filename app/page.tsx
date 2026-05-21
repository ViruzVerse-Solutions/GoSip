'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { MdLocalCafe } from 'react-icons/md'

export default function HomePage() {
  const [slug, setSlug] = useState('')
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = slug.trim().toLowerCase()
    if (!trimmed) return
    router.push(`/${trimmed}`)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center px-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 sm:p-10 border border-primary-100"
      >
        <div className="text-center">
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="flex justify-center mb-4"
          >
            <MdLocalCafe className="w-16 h-16 text-primary-600" />
          </motion.div>
          <h1 className="text-3xl font-bold text-primary-900 font-display">
            Welcome to CafeAura
          </h1>
          <p className="text-primary-700 mt-2">
            Enter your café code to view the menu
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. my-cafe"
            className="w-full bg-primary-50 rounded-2xl py-4 px-6 text-primary-900 placeholder-primary-400 outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full bg-primary-800 hover:bg-primary-900 text-white font-semibold py-4 rounded-2xl shadow-lg transition"
          >
            View Menu
          </motion.button>
        </form>

        <p className="text-center text-primary-500 text-xs mt-6">
          Don’t have a code? Ask your café staff for the QR code.
        </p>
      </motion.div>
    </main>
  )
}