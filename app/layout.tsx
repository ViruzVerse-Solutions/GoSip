// app/layout.tsx
// ── Root Layout ───────────────────────────────────────────────────────────────

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { CartProvider }     from '@/lib/context/cart-context'
import { SessionProvider }  from '@/lib/context/session-context'
import { LanguageProvider } from '@/lib/context/language-context'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'GoSip — Fresh Menu',
  description: 'Order fresh, pick up fast',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} data-scroll-behavior="smooth">
      <body className="bg-gray-50 font-sans antialiased" suppressHydrationWarning>
        <LanguageProvider>
          <SessionProvider>
            <CartProvider>
              {children}
            </CartProvider>
          </SessionProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}