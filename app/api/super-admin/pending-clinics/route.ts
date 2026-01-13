import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { verifySuperAdmin } from '@/lib/super-admin-middleware'

export async function GET(request: NextRequest) {
    try {
        // Verify Super Admin access
        const authResult = await verifySuperAdmin(request)
        if (!authResult.authorized) {
            return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
        }

        const supabase = createServiceRoleClient()

        // Get pending clinics with their admin info
        const { data: clinics, error } = await supabase
            .from('clinics')
            .select(`
                id,
                name,
                slug,
                cnpj,
                email,
                phone,
                plan_type,
                responsible_name,
                responsible_phone,
                address,
                created_at,
                approval_status
            `)
            .eq('approval_status', 'pending_approval')
            .order('created_at', { ascending: true })

        if (error) {
            console.error('[PendingClinics] Query error:', error)
            return NextResponse.json({
                success: false,
                error: { message: 'Erro ao buscar clínicas' }
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            clinics: clinics || [],
            count: clinics?.length || 0
        })

    } catch (error) {
        console.error('[PendingClinics] Unexpected error:', error)
        return NextResponse.json({
            success: false,
            error: { message: 'Erro interno do servidor' }
        }, { status: 500 })
    }
}
