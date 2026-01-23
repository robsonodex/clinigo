/**
 * GET /api/debug-clinic/[id] - Duplicate of clinics/[id] for debugging
 */
import { type NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

interface RouteParams {
    params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        console.log('[GET /api/debug-clinic/[id]] HIT - Start of handler')

        const resolvedParams = await params
        const clinicId = resolvedParams.id

        console.log('[GET /api/debug-clinic/[id]] resolvedParams:', resolvedParams)
        console.log('[GET /api/debug-clinic/[id]] clinicId:', clinicId)

        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        // Require authentication
        if (!userId) {
            return NextResponse.json(
                { success: false, error: { message: 'Não autorizado', code: 'UNAUTHORIZED' } },
                { status: 401 }
            )
        }

        // SUPER_ADMIN and CLINIC_ADMIN use service role to bypass RLS
        const supabase = (userRole === 'SUPER_ADMIN' || userRole === 'CLINIC_ADMIN')
            ? createServiceRoleClient()
            : await createClient()

        // Get clinic
        const { data: clinic, error } = await supabase
            .from('clinics')
            .select('*')
            .eq('id', clinicId)
            .single()

        if (error || !clinic) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Clínica não encontrada',
                        code: 'NOT_FOUND',
                        debug: {
                            originalPath: 'debug-clinic',
                            dbError: error,
                            clinicId
                        }
                    }
                },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true, data: clinic })
    } catch (error) {
        console.error('[GET /api/debug-clinic/[id]] Error:', error)
        return NextResponse.json(
            { success: false, error: { message: 'Erro interno', code: 'INTERNAL_ERROR' } },
            { status: 500 }
        )
    }
}
