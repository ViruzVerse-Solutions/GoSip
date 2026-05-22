import Link from 'next/link'
import { Cormorant_Garamond, DM_Mono } from 'next/font/google'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400'],
  variable: '--font-dm-mono',
})

export default function NotFound() {
  return (
    <main
      className={`${cormorant.variable} ${dmMono.variable} min-h-screen flex items-center justify-center px-6`}
      style={{ backgroundColor: '#F2EDE3' }}
    >
      <style>{`
        .back-btn {
          display: inline-block;
          margin-top: 2rem;
          background: #1A1410;
          color: #F2EDE3;
          padding: 14px 28px;
          font-family: var(--font-dm-mono);
          font-size: 0.6rem;
          font-weight: 400;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          text-decoration: none;
          border-radius: 0;
          transition: background 0.2s;
        }
        .back-btn:hover { background: #1A9E3F; }
      `}</style>

      <div className="w-full max-w-sm">

        {/* Top rule */}
        <div className="w-8 h-px mb-8" style={{ backgroundColor: '#3D3530' }} />

        {/* 404 numeral */}
        <h1
          style={{
            fontFamily: 'var(--font-cormorant)',
            fontSize: '6rem',
            fontWeight: 300,
            color: '#1A9E3F',
            lineHeight: 1,
            letterSpacing: '-0.04em',
          }}
        >
          4<em style={{ fontStyle: 'italic' }}>0</em>4
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-dm-mono)',
            fontSize: '0.6rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#9A8E84',
            fontWeight: 300,
            marginTop: '1rem',
          }}
        >
          Page not found
        </p>

        {/* Divider */}
        <div className="w-full h-px my-8" style={{ backgroundColor: '#DDD8CF' }} />

        {/* Message */}
        <p
          style={{
            fontFamily: 'var(--font-dm-mono)',
            fontSize: '13px',
            color: '#D0021B',
            fontWeight: 300,
            lineHeight: 1.7,
            marginBottom: '0.5rem',
          }}
        >
          This menu page doesn't exist.
        </p>

        <p
          style={{
            fontFamily: 'var(--font-dm-mono)',
            fontSize: '11px',
            color: '#1A9E3F',
            fontWeight: 300,
            lineHeight: 1.7,
          }}
        >
          The QR code may be incorrect,
          <br />
          or the link is broken.
        </p>

        {/* CTA */}
        <Link href="/" className="back-btn">
          Back to Home
        </Link>

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
          <span style={{ color: '#1A9E3F' }}>Viruzverse</span>
        </p>

      </div>
    </main>
  )
}