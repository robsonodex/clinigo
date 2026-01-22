/**
 * GET /api/clinics/[clinicId] - Get clinic by ID (SIMPLIFIED)
 */
import { type NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

interface RouteParams {
    params: Promise<{ clinicId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    console.log('[SIMPLIFIED GET] Starting...')

    try {
        const { clinicId } = await params
        console.log('[SIMPLIFIED GET] Clinic ID:', clinicId)

        // Always use Service Role Client - middleware handles auth
        const supabase = createServiceRoleClient()

        // Get clinic
        const { data: clinic, error } = await supabase
            .from('clinics')
            .select('*')
            .eq('id', clinicId)
            .single()

        console.log('[SIMPLIFIED GET] Result:', { found: !!clinic, error: error?.message })

        if (error || !clinic) {
            return NextResponse.json(
                { success: false, error: { message: 'Clínica não encontrada', code: 'NOT_FOUND', details: error } },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true, data: clinic })
    } catch (error) {
        console.error('[SIMPLIFIED GET] Error:', error)
        return NextResponse.json(
            { success: false, error: { message: 'Erro interno', code: 'INTERNAL_ERROR' } },
            { status: 500 }
        )
    }
}
