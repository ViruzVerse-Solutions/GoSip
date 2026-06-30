'use client'

import { motion } from 'framer-motion'
import { MdOutlineLocalCafe, MdOutlineLocalDining, MdOutlineRestaurantMenu } from 'react-icons/md'

interface LoadingScreenProps {
  message?: string
  error?: string | null
  onRetry?: () => void
}

export default function LoadingScreen({ message = 'Loading...', error = null, onRetry }: LoadingScreenProps) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-6 select-none overflow-hidden bg-[#F2EDE3]"
    >
      {/* Subtle Ambient Grid Background */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(#1A9E3F 1px, transparent 1px)', backgroundSize: '32px 32px' }}
      />
      
      {error ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="flex flex-col items-center w-full max-w-sm relative z-10 bg-white p-8 rounded-3xl shadow-2xl shadow-rose-900/5 border border-rose-100"
        >
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 border border-rose-100 shadow-inner">
            <span className="text-3xl text-rose-500 font-extrabold">!</span>
          </div>
          <p className="text-sm font-semibold text-gray-800 mb-2 text-center">{error}</p>
          <p className="text-xs text-gray-500 mb-8 text-center leading-relaxed">
            Please double check the code or contact the café staff.
          </p>
          {onRetry ? (
            <button
              onClick={onRetry}
              className="w-full py-4 bg-[#1A9E3F] hover:bg-[#158034] text-white rounded-xl transition duration-200 uppercase tracking-widest text-xs font-bold shadow-lg shadow-[#1A9E3F]/20 active:scale-95"
            >
              Try Again
            </button>
          ) : (
            <a
              href="/"
              className="w-full py-4 bg-[#1A9E3F] hover:bg-[#158034] text-white text-center rounded-xl transition duration-200 uppercase tracking-widest text-xs font-bold shadow-lg shadow-[#1A9E3F]/20 active:scale-95 block"
            >
              Go to Homepage
            </a>
          )}
        </motion.div>
      ) : (
        <div className="flex flex-col items-center w-full relative z-10">
          
          {/* Universal Restaurant & Cafe Wave Loader (Original Bold Cup + Premium Circular Badge) */}
          <div className="relative w-40 h-40 flex items-center justify-center mb-20 mt-6">
            
            {/* Ambient Glow */}
            <motion.div
              className="absolute inset-0 bg-[#1A9E3F] rounded-full blur-2xl opacity-20"
              animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Premium Circular Text Badge (Denoting Restaurant & Cafe) */}
            <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center">
              <motion.svg 
                viewBox="0 0 100 100" 
                className="absolute w-[185%] h-[185%] max-w-none overflow-visible"
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              >
                <path id="textPath" d="M 50, 50 m -38, 0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" fill="none" />
                <text className="text-[8px] font-bold fill-[#8A7D71] uppercase" style={{ fontFamily: 'var(--font-dm-mono)', letterSpacing: '0.25em' }}>
                  <textPath href="#textPath" startOffset="0%">
                    • GOSIP • SCAN • ORDER • ENJOY • GOSIP • SCAN • ORDER • ENJOY 
                  </textPath>
                </text>
              </motion.svg>
            </div>
            
            {/* The Original Bold Cup (The exact one the user praised) */}
            <div className="relative w-24 h-24 z-10">
              {/* The Cup Handle */}
              <div className="absolute top-4 -right-6 w-10 h-14 border-[5px] border-white/90 rounded-r-3xl border-l-0 shadow-sm bg-white/40 backdrop-blur-md" />
              
              {/* The Cup Body */}
              <div className="absolute inset-0 border-[5px] border-white/90 rounded-b-[2.5rem] rounded-t-xl overflow-hidden bg-white/40 shadow-2xl shadow-[#1A9E3F]/15 backdrop-blur-md z-10">
                 
                 {/* Liquid Fill Level */}
                 <motion.div
                   className="absolute bottom-0 left-0 right-0"
                   animate={{ height: ["20%", "85%", "20%"] }}
                   transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                 >
                    {/* Back Wave */}
                    <motion.div
                      className="absolute top-0 left-0 w-[200%] h-5 -mt-[18px] text-[#116629] opacity-40"
                      animate={{ x: ["0%", "-50%"] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                      <svg viewBox="0 0 200 20" preserveAspectRatio="none" className="w-full h-full fill-current">
                        <path d="M 0 10 Q 25 0, 50 10 T 100 10 T 150 10 T 200 10 V 30 H 0 Z" />
                      </svg>
                    </motion.div>
                    
                    {/* Front Wave */}
                    <motion.div
                      className="absolute top-0 left-0 w-[200%] h-5 -mt-[18px] text-[#1A9E3F]"
                      animate={{ x: ["-50%", "0%"] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <svg viewBox="0 0 200 20" preserveAspectRatio="none" className="w-full h-full fill-current">
                        <path d="M 0 10 Q 25 20, 50 10 T 100 10 T 150 10 T 200 10 V 30 H 0 Z" />
                      </svg>
                    </motion.div>

                    {/* Liquid Body */}
                    <div className="absolute top-0 left-0 right-0 bottom-0 bg-[#1A9E3F]" />
                 </motion.div>
              </div>
              
              {/* Floating Steam Particles */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-16 h-12">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute bottom-0 w-2 h-2 rounded-full bg-[#1A9E3F] blur-[1px]"
                    style={{ left: `${30 + i * 20}%` }}
                    animate={{ 
                      y: [0, -40],
                      x: [0, i % 2 === 0 ? 10 : -10, 0],
                      opacity: [0, 0.4, 0],
                      scale: [1, 2, 3]
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      delay: i * 0.8,
                      ease: "easeOut"
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <h1
            className="text-5xl font-bold tracking-tight mb-2 text-[#1A1410]"
            style={{ fontFamily: 'var(--font-cormorant)', letterSpacing: '-0.04em' }}
          >
            Go<em className="text-[#1A9E3F]" style={{ fontStyle: 'italic' }}>Sip</em>
          </h1>

          <motion.p
            key={message}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-bold tracking-[0.2em] uppercase text-[#3D3530]"
            style={{ fontFamily: 'var(--font-dm-mono)' }}
          >
            {message}
          </motion.p>
          
          <div className="flex items-center gap-1 mt-2">
            <span className="text-[9px] uppercase tracking-widest text-[#9A8E84]" style={{ fontFamily: 'var(--font-dm-mono)' }}>
              Preparing your experience
            </span>
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <motion.div 
                  key={`dot-${i}`}
                  className="w-1 h-1 rounded-full bg-[#1A9E3F]"
                  animate={{ y: [0, -4, 0], opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
