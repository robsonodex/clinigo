/**
 * Supabase Browser Client
 * Use this client in React components (Client Components)
 */
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

let client: ReturnType<typeof createBrowserClient<Database>> | undefined

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase Environment Variables")
  }

  if (typeof window === 'undefined') {
    return createBrowserClient<Database>(
      supabaseUrl,
      supabaseKey
    )
  }

  if (!client) {
    client = createBrowserClient<Database>(
      supabaseUrl,
      supabaseKey
    )
  }

  return client
}

