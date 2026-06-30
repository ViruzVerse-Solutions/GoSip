'use client'

import { motion } from 'framer-motion'
import { MdOutlineLocalCafe } from 'react-icons/md'

interface LoadingScreenProps {
  message?: string
  error?: string | null
  onRetry?: () => void
}

export default function LoadingScreen({ message = 'Loading...', error = null, onRetry }: LoadingScreenProps) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-6 select-none"
      style={{ backgroundColor: '#F2EDE3' }}
    >
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        {/* Top rule */}
        <div className="w-8 h-px mb-8" style={{ backgroundColor: '#3D3530' }} />

        {/* Brand */}
        <h1
          className="leading-none tracking-tight mb-2 select-none"
          style={{
            fontFamily: 'var(--font-cormorant)',
            fontSize: '3.5rem',
            fontWeight: 300,
            color: '#1A9E3F',
            letterSpacing: '-0.03em',
          }}
        >
          Go<em style={{ fontStyle: 'italic' }}>Sip</em>
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-dm-mono)',
            fontSize: '0.6rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#3D3530',
            fontWeight: 300,
          }}
        >
          Restro &amp; Menu Platform
        </p>

        {/* Divider */}
        <div className="w-full h-px my-10" style={{ backgroundColor: '#DDD8CF' }} />

        {error ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center w-full"
          >
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-6 border border-rose-100 shadow-inner">
              <span className="text-2xl text-rose-500 font-extrabold">!</span>
            </div>
            <p className="text-sm font-semibold text-gray-800 mb-2 leading-relaxed px-4">{error}</p>
            <p className="text-xs text-gray-400 mb-8 max-w-xs leading-relaxed">
              Please double check the code or contact the café staff.
            </p>
            {onRetry ? (
              <button
                onClick={onRetry}
                className="w-full py-4 bg-[#1A9E3F] hover:bg-[#158034] text-[#F2EDE3] transition duration-200 uppercase tracking-widest text-xs font-semibold cursor-pointer border-0"
                style={{ fontFamily: 'var(--font-dm-mono)', borderRadius: 0 }}
              >
                Try Again
              </button>
            ) : (
              <a
                href="/"
                className="w-full py-4 bg-[#1A9E3F] hover:bg-[#158034] text-[#F2EDE3] text-center transition duration-200 uppercase tracking-widest text-xs font-semibold cursor-pointer block border-0 decoration-none"
                style={{ fontFamily: 'var(--font-dm-mono)', borderRadius: 0 }}
              >
                Go to Homepage
              </a>
            )}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center w-full">
            {/* Spinning & Pulsing Animation Ring */}
            <div className="relative w-24 h-24 flex items-center justify-center mb-8">
              {/* Outer Spin Ring */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-transparent"
                style={{
                  borderTopColor: '#1A9E3F',
                  borderRightColor: '#1A9E3F',
                }}
                animate={{ rotate: 360 }}
                transition={{
                  repeat: Infinity,
                  duration: 1.2,
                  ease: "linear"
                }}
              />
              {/* Inner Pulsing Ring */}
              <motion.div
                className="absolute w-20 h-20 rounded-full border border-[#DDD8CF]"
                animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.7, 0.3] }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: "easeInOut"
                }}
              />
              {/* Core Icon */}
              <motion.div
                animate={{ scale: [0.95, 1.05, 0.95] }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: "easeInOut"
                }}
                className="text-[#1A9E3F]"
              >
                <MdOutlineLocalCafe className="w-8 h-8" />
              </motion.div>
            </div>

            {/* Status Message */}
            <motion.p
              key={message}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs font-medium tracking-widest uppercase mb-2 min-h-[16px] px-2 leading-relaxed"
              style={{
                fontFamily: 'var(--font-dm-mono)',
                color: '#1A1410'
              }}
            >
              {message}
            </motion.p>

            <span className="text-[10px] uppercase tracking-wider text-[#9A8E84]" style={{ fontFamily: 'var(--font-dm-mono)' }}>
              Preparing your experience
            </span>
          </div>
        )}

        {/* Bottom rule */}
        <div className="w-8 h-px mt-12" style={{ backgroundColor: '#C8C0B5' }} />

        {/* Footer */}
        <p
          className="mt-6 font-light"
          style={{
            fontFamily: 'var(--font-dm-mono)',
            fontSize: '0.55rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#BEB5A9',
          }}
        >
          Product of{' '}
          <span style={{ color: '#9A8E84' }}>Viruzverse</span>
        </p>
      </div>
    </div>
  )
}
