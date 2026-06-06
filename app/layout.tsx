//app/layout.tsx

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/lib/context/cart-context'
import { SessionProvider } from '@/lib/context/session-context'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'GoSip — Fresh Menu',
  description: 'Order fresh, pick up fast',
}

import { headers } from 'next/headers'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading headers automatically opts the entire application into dynamic rendering.
  // This is strictly required when using a nonce-based CSP, because nonces must be 
  // freshly generated on the server for every single request.
  const headersList = await headers()
  const nonce = headersList.get('x-nonce') || undefined

  return (
    <html lang="en" className={inter.variable} data-scroll-behavior="smooth">
      <body className="bg-gray-50 font-sans antialiased">
        <SessionProvider>
          <CartProvider>
            {children}                        
          </CartProvider>
        </SessionProvider>
      </body>
    </html>
  )
}