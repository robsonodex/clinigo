/**
 * POST /api/auth/logout
 * Logout and clear session
 */
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'

export async function POST(_request: NextRequest) {
    try {
        const supabase = await createClient()

        await supabase.auth.signOut()

        return successResponse({ message: 'Logout realizado com sucesso' })
    } catch (error) {
        return handleApiError(error)
    }
}
