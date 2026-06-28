// app/layout.tsx
// ── Root Layout ───────────────────────────────────────────────────────────────

import type { Metadata, Viewport } from 'next'
import { Inter, Pacifico, Cormorant_Garamond, DM_Mono } from 'next/font/google'
import './globals.css'
import { CartProvider }     from '@/lib/context/cart-context'
import { SessionProvider }  from '@/lib/context/session-context'
import { LanguageProvider } from '@/lib/context/language-context'
import ZoomBlocker          from '@/components/ui/ZoomBlocker'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const pacifico = Pacifico({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pacifico',
  display: 'swap',
})

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400'],
  variable: '--font-dm-mono',
})

export const metadata: Metadata = {
  title: 'GoSip — Fresh Menu',
  description: 'Order fresh, pick up fast',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

import { headers } from 'next/headers'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading headers automatically opts the entire application into dynamic rendering.
  // This is strictly required when using a nonce-based CSP, because nonces must be 
  // freshly generated on the server for every single request.
  const headersList = await headers()
  const nonce = headersList.get('x-nonce') || undefined

  return (
    <html lang="en" className={`${inter.variable} ${pacifico.variable} ${cormorant.variable} ${dmMono.variable}`} data-scroll-behavior="smooth">
      <body className="bg-gray-50 font-sans antialiased" suppressHydrationWarning>
        <ZoomBlocker />
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