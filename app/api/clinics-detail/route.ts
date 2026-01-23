/**
 * GET /api/clinics-detail - Get clinic by ID (Query Param)
 * PATCH /api/clinics-detail - Update clinic (Query Param)
 * DELETE /api/clinics-detail - Soft delete clinic (Query Param)
 * 
 * WORKAROUND: Dynamic routes [id] are failing in production (404).
 * This route uses ?id=... query param instead.
 */
import { type NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const clinicId = searchParams.get('id')

        if (!clinicId) return NextResponse.json({ success: false, error: { message: 'ID obrigatório', code: 'BAD_REQUEST' } }, { status: 400 })

        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId) return NextResponse.json({ success: false, error: { message: 'Não autorizado', code: 'UNAUTHORIZED' } }, { status: 401 })

        const supabase = (userRole === 'SUPER_ADMIN' || userRole === 'CLINIC_ADMIN')
            ? createServiceRoleClient()
            : await createClient()

        const { data: clinic, error } = await supabase
            .from('clinics')
            .select('*')
            .eq('id', clinicId)
            .single()

        if (error || !clinic) {
            return NextResponse.json({ success: false, error: { message: 'Clínica não encontrada', code: 'NOT_FOUND' } }, { status: 404 })
        }

        if (userRole !== 'SUPER_ADMIN') {
            const { data: userProfile } = await supabase.from('users').select('clinic_id').eq('id', userId).single()
            if ((userProfile as any)?.clinic_id !== clinicId) {
                return NextResponse.json({ success: false, error: { message: 'Acesso negado', code: 'FORBIDDEN' } }, { status: 403 })
            }
            delete (clinic as any).mercadopago_access_token
        }

        return NextResponse.json({ success: true, data: clinic })
    } catch (error) {
        return NextResponse.json({ success: false, error: { message: 'Erro interno', code: 'INTERNAL_ERROR' } }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const clinicId = searchParams.get('id')

        if (!clinicId) return NextResponse.json({ success: false, error: { message: 'ID obrigatório', code: 'BAD_REQUEST' } }, { status: 400 })

        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId) return NextResponse.json({ success: false, error: { message: 'Não autorizado', code: 'UNAUTHORIZED' } }, { status: 401 })

        const body = await request.json()
        const supabase = (userRole === 'SUPER_ADMIN') ? createServiceRoleClient() : await createClient()

        if (userRole !== 'SUPER_ADMIN') {
            const { data: user } = await supabase.from('users').select('clinic_id').eq('id', userId).single()
            if ((user as any)?.clinic_id !== clinicId) {
                return NextResponse.json({ success: false, error: { message: 'Acesso negado', code: 'FORBIDDEN' } }, { status: 403 })
            }
            delete body.plan_type
            delete body.plan_limits
            delete body.is_active
            delete body.addons
        }

        const { data: clinic, error } = await (supabase.from('clinics') as any)
            .update({ ...body, updated_at: new Date().toISOString() })
            .eq('id', clinicId)
            .select()
            .single()

        if (error) {
            if (error.code === 'PGRST116') return NextResponse.json({ success: false, error: { message: 'Clínica não encontrada', code: 'NOT_FOUND' } }, { status: 404 })
            throw error
        }

        return NextResponse.json({ success: true, data: clinic })
    } catch (error) {
        return NextResponse.json({ success: false, error: { message: 'Erro interno', code: 'INTERNAL_ERROR' } }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const clinicId = searchParams.get('id')
        const hardDelete = searchParams.get('hard') === 'true'
        const userRole = request.headers.get('x-user-role')

        if (!clinicId) return NextResponse.json({ success: false, error: { message: 'ID obrigatório', code: 'BAD_REQUEST' } }, { status: 400 })

        if (userRole !== 'SUPER_ADMIN') {
            return NextResponse.json({ success: false, error: { message: 'Apenas super administradores podem excluir clínicas', code: 'FORBIDDEN' } }, { status: 403 })
        }

        const supabase = createServiceRoleClient()

        if (hardDelete) {
            await supabase.from('medical_records').delete().eq('clinic_id', clinicId)
            await supabase.from('payments').delete().eq('clinic_id', clinicId)
            await supabase.from('appointments').delete().eq('clinic_id', clinicId)
            await supabase.from('doctors').delete().eq('clinic_id', clinicId)
            await supabase.from('patients').delete().eq('clinic_id', clinicId)
            await supabase.from('users').delete().eq('clinic_id', clinicId)

            const { error } = await (supabase as any).from('clinics').delete().eq('id', clinicId)
            if (error) throw error

            return NextResponse.json({ success: true, message: 'Clínica excluída permanentemente' })
        } else {
            const { error } = await (supabase as any)
                .from('clinics')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('id', clinicId)

            if (error) throw error
            return NextResponse.json({ success: true, message: 'Clínica desativada' })
        }
    } catch (error) {
        return NextResponse.json({ success: false, error: { message: 'Erro interno', code: 'INTERNAL_ERROR' } }, { status: 500 })
    }
}
