'use client'

import { useEffect, useState, use, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'
import LoadingScreen from '@/components/ui/LoadingScreen'

interface PageProps {
  params: Promise<{
    code: string
  }>
}

function QrRedirectContent({ code }: { code: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [message, setMessage] = useState('Verifying table QR...')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!code) return

    let isMounted = true

    async function resolveQrCode() {
      try {
        const { data, error } = await supabaseBrowser.rpc('resolve_qr', {
          p_code: code,
        })

        if (!isMounted) return

        if (error || !data || !data.found) {
          console.error('[QR Redirect] Error resolving code:', code, error, data)
          setErrorMsg('This QR code is invalid or has expired.')
          return
        }

        setMessage('Connecting to table menu...')

        // Preserve any search parameters (e.g. UTM parameters, table overrides)
        const queryParams = new URLSearchParams()
        searchParams.forEach((val, key) => {
          queryParams.append(key, val)
        })

        const queryString = queryParams.toString()
        const destination = queryString ? `/${data.outlet_slug}?${queryString}` : `/${data.outlet_slug}`

        // Execute client-side redirection
        router.replace(destination)
      } catch (err) {
        console.error('QR Resolution error:', err)
        if (isMounted) {
          setErrorMsg('Failed to connect. Please check your internet connection.')
        }
      }
    }

    resolveQrCode()

    return () => {
      isMounted = false
    }
  }, [code, router, searchParams])

  return (
    <LoadingScreen
      message={message}
      error={errorMsg}
      onRetry={() => {
        setErrorMsg(null)
        setMessage('Retrying table verification...')
        window.location.reload()
      }}
    />
  )
}

export default function QrRedirectPage({ params }: PageProps) {
  const { code } = use(params)

  return (
    <Suspense fallback={<LoadingScreen message="Initializing..." />}>
      <QrRedirectContent code={code} />
    </Suspense>
  )
}
