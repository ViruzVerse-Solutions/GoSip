// lib/supabase/server.ts
// Server-only Supabase client — uses the service role key for privileged operations.
// NEVER import this in client components.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL    ?? ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY   ?? ''

// ── Environment guard ─────────────────────────────────────────────────────────
// Hard-fail in production if the service role key is missing.
// Silently falling back to the anon key would allow privileged server operations
// to run with user-level permissions, bypassing RLS policies.
if (process.env.NODE_ENV === 'production' && (!supabaseUrl || !serviceRoleKey)) {
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
    return new Proxy({} as ReturnType<typeof createClient>, {
      get() {
        throw new Error(
          '[GoSip] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
          'Add these to your .env.local file.'
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
