/**
 * Service Role Supabase Client
 * Bypasses RLS for server-side operations (webhooks, cron jobs)
 * USE WITH EXTREME CAUTION - Only for trusted server contexts
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase.generated'

export function createServiceRoleClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error(
            'Missing Supabase credentials. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
        )
    }

    return createClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
}

