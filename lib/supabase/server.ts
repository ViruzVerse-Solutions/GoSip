import { createClient } from '@supabase/supabase-js'

const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL    ?? ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY   ?? ''

// Custom fetch logger for Server API routes
const loggedFetch = async (input: RequestInfo | URL, options?: RequestInit) => {
  const start = Date.now()
  const res = await fetch(input, options)
  const duration = Date.now() - start

  const urlString = input instanceof Request ? input.url : input.toString()
  const parsedUrl = new URL(urlString)
  const tableName = parsedUrl.pathname.split('/').pop()

  console.log(
    `🖥️  [Supabase Server] ${options?.method ?? 'GET'} /${tableName} | ` +
    `Latency: ${duration}ms | Params: ${parsedUrl.search}`
  )
  return res
}

export const supabaseServer = (() => {
  if (!supabaseUrl || !serviceRoleKey) {
    return new Proxy({} as ReturnType<typeof createClient>, {
      get() {
        throw new Error('[GoSip] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
      },
    })
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
    global: {
      fetch: loggedFetch, // <-- Inject custom fetch
    }
  })
})()
