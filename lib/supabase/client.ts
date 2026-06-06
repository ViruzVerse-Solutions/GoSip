import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? ''
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Custom fetch logger to track latency and queries
const loggedFetch = async (input: RequestInfo | URL, options?: RequestInit) => {
  const start = Date.now()
  const res = await fetch(input, options)
  const duration = Date.now() - start

  const urlString = input instanceof Request ? input.url : input.toString()
  const parsedUrl = new URL(urlString)
  const tableName = parsedUrl.pathname.split('/').pop() // Gets table name like 'menu_items'
  
  console.log(
    `⚡ [Supabase Client] ${options?.method ?? 'GET'} /${tableName} | ` +
    `Latency: ${duration}ms | Params: ${parsedUrl.search}`
  )
  return res
}

export const supabaseBrowser = (() => {
  if (!supabaseUrl || !supabaseAnon) {
    return new Proxy({} as ReturnType<typeof createClient>, {
      get() {
        throw new Error('[GoSip] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.')
      },
    })
  }
  return createClient(supabaseUrl, supabaseAnon, {
    global: {
      fetch: loggedFetch, // <-- Inject custom fetch
    }
  })
})()
