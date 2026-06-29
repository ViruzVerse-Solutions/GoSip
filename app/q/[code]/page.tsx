import { notFound, redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'

interface PageProps {
  params: Promise<{
    code: string
  }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function QrRedirectPage({ params, searchParams }: PageProps) {
  const { code } = await params
  const sParams = await searchParams

  if (!code) notFound()

  // Call the SECURITY DEFINER RPC function to resolve the QR code
  const { data, error } = await supabaseServer.rpc('resolve_qr', {
    p_code: code,
  })

  if (error || !data || !data.found) {
    console.error('[QR Redirect] Error resolving code:', code, error, data)
    notFound()
  }

  // Preserve any search query parameters (such as table or UTM parameters) during redirect
  const queryParams = new URLSearchParams()
  Object.entries(sParams).forEach(([key, value]) => {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach((v) => queryParams.append(key, v))
      } else {
        queryParams.append(key, value)
      }
    }
  })

  const queryString = queryParams.toString()
  const destination = queryString ? `/${data.outlet_slug}?${queryString}` : `/${data.outlet_slug}`

  // Redirect to the resolved outlet slug (e.g. /my-cafe)
  redirect(destination)
}
