/**
 * GET /api/permissions/current
 * Returns all effective feature permissions (defaults + custom overrides) for the current clinic
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClinicPermissions } from '@/lib/services/permissions-service'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json(
                { error: 'Não autenticado' },
                { status: 401 }
            )
        }

        // Handle impersonation for SUPER_ADMIN
        const cookieStore = request.cookies
        const isImpersonating = cookieStore.get('impersonation_active')?.value === 'true'
        const impersonationClinicId = cookieStore.get('impersonation_clinic_id')?.value

        let targetClinicId: string | null = null

        if (isImpersonating && impersonationClinicId) {
            targetClinicId = impersonationClinicId
        } else {
            const { data: userData } = await supabase
                .from('users')
                .select('clinic_id, role')
                .eq('id', user.id)
                .single()

            targetClinicId = userData?.clinic_id || null
        }

        if (!targetClinicId) {
            return NextResponse.json(
                { permissions: {}, clinicId: null },
                { status: 200 }
            )
        }

        const permissions = await getClinicPermissions(targetClinicId)

        return NextResponse.json({
            success: true,
            clinicId: targetClinicId,
            permissions,
        })
    } catch (error: any) {
        console.error('[PermissionsCurrent] Erro ao carregar permissões:', error)
        return NextResponse.json(
            { error: error?.message || 'Erro interno ao consultar permissões' },
            { status: 500 }
        )
    }
}
