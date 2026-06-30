// lib/supabase/server.ts
// Server-only Supabase client — uses the service role key for privileged operations.
// NEVER import this in client components.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL    ?? ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY   ?? ''

// ── Environment guard ─────────────────────────────────────────────────────────
// Hard-fail in production if the service role key is missing.
// "typeof window === 'undefined'" ensures this check ONLY executes on the server backend.
// In the browser, secret keys are hidden by Next.js, so this check is skipped to prevent UI crashes.
if (
  typeof window === 'undefined' && 
  process.env.NODE_ENV === 'production' && 
  (!supabaseUrl || !serviceRoleKey)
) {
  throw new Error(
    '[GoSip] FATAL: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in production. ' +
    'Do NOT fall back to the anon key for server-side operations.'
  )
}

// Custom fetch logger for Server API routes
const loggedFetch = async (input: RequestInfo | URL, options?: RequestInit) => {
  const start = Date.now()
  const res = await fetch(input, {
    ...options,
    cache: 'no-store',
  })
  const duration = Date.now() - start

  if (process.env.NODE_ENV === 'development') {
    const urlString = input instanceof Request ? input.url : input.toString()
    const parsedUrl = new URL(urlString)
    const tableName = parsedUrl.pathname.split('/').pop()
    console.log(
      `🖥️  [Supabase Server] ${options?.method ?? 'GET'} /${tableName} | ` +
      `Latency: ${duration}ms | Params: ${parsedUrl.search}`
    )
  }
  return res
}

export const supabaseServer = (() => {
  if (!supabaseUrl || !serviceRoleKey) {
    // Graceful fallback for local development if the service role key is missing
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn("⚠️ [GoSip] SUPABASE_SERVICE_ROLE_KEY is missing in .env.local! Falling back to the anon key for server operations.");
      return createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { fetch: loggedFetch },
      });
    }

    // If evaluated on the client side or in production without keys, provide a safety proxy
    return new Proxy({} as ReturnType<typeof createClient>, {
      get() {
        throw new Error(
          '[GoSip] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
          'Ensure this client is only called within Server Components or API Routes, and keys are set.'
        )
      },
    })
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
    global: {
      fetch: loggedFetch,
    },
  })
})()