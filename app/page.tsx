//app/page.tsx

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

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
    <main
      className={`min-h-screen flex items-center justify-center px-6`}
      style={{ backgroundColor: '#F2EDE3' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        {/* Top rule */}
        <div className="w-8 h-px mb-8" style={{ backgroundColor: '#3D3530' }} />

        {/* Brand */}
        <h1
          className="leading-none tracking-tight"
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
          className="mt-4"
          style={{
            fontFamily: 'var(--font-dm-mono)',
            fontSize: '0.6rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#000000',
            fontWeight: 300,
          }}
        >
          Restro &amp; Menu Platform Partner
        </p>

        {/* Divider */}
        <div className="w-full h-px my-10" style={{ backgroundColor: '#DDD8CF' }} />

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <label
            htmlFor="cafe-code"
            style={{
              display: 'block',
              fontFamily: 'var(--font-dm-mono)',
              fontSize: '0.55rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#000000',
              marginBottom: '0.75rem',
              fontWeight: 400,
            }}
          >
            Café Code
          </label>

          <input
            id="cafe-code"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="your-cafe"
            autoComplete="off"
            style={{
              width: '100%',
              background: 'transparent',
              border: '1px solid #C8C0B5',
              borderRadius: 0,
              padding: '14px 16px',
              fontSize: '13px',
              color: '#1A1410',
              fontFamily: 'var(--font-dm-mono)',
              fontWeight: 300,
              letterSpacing: '0.05em',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#1A1410')}
            onBlur={(e) => (e.target.style.borderColor = '#C8C0B5')}
          />

          <motion.button
            whileTap={{ scale: 0.99 }}
            whileHover={{ backgroundColor: '#1A9E3F' }}
            type="submit"
            style={{
              width: '100%',
              background: '#1A9E3F',
              color: '#F2EDE3',
              border: 'none',
              borderRadius: 0,
              padding: '16px',
              marginTop: '1.25rem',
              fontFamily: 'var(--font-dm-mono)',
              fontSize: '0.6rem',
              fontWeight: 400,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            View Menu
          </motion.button>
        </form>

        {/* Hint */}
        <p
          style={{
            fontFamily: 'var(--font-dm-mono)',
            fontSize: '11px',
            color: '#9A8E84',
            fontWeight: 300,
            marginTop: '1.75rem',
            lineHeight: 1.7,
          }}
        >
          No code? Scan the QR at your café counter.
        </p>

        {/* Bottom rule */}
        <div className="w-8 h-px mt-10" style={{ backgroundColor: '#C8C0B5' }} />
 
        {/* Viruzverse stamp */}
        <p
          style={{
            fontFamily: 'var(--font-dm-mono)',
            fontSize: '0.55rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#BEB5A9',
            fontWeight: 300,
            marginTop: '1.25rem',
          }}
        >
          Product of{' '}
          <span style={{ color: '#9A8E84' }}>Viruzverse</span>
        </p>
      </motion.div>
    </main>
  )
}