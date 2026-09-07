import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError } from '@/lib/utils/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: currentUser } = await supabase
            .from('users')
            .select('id, role, clinic_id')
            .eq('id', user.id)
            .single()

        if (!currentUser) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 })
        }

        const headerClinicId = request.headers.get('x-clinic-id')
        const effectiveClinicId = headerClinicId || currentUser.clinic_id

        if (!effectiveClinicId && currentUser.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Clínica não identificada' }, { status: 400 })
        }

        const body = await request.json()
        const { appointmentIds } = body

        if (!Array.isArray(appointmentIds) || appointmentIds.length === 0) {
            return NextResponse.json({ error: 'Nenhum agendamento fornecido' }, { status: 400 })
        }

        const adminDb = createServiceRoleClient() as any

        // Limpar dependências
        await adminDb.from('appointment_qr_codes').delete().in('appointment_id', appointmentIds)
        await adminDb.from('video_rooms').delete().in('appointment_id', appointmentIds)

        // Excluir agendamentos cancelados respeitando o isolamento por clínica
        let query = adminDb
            .from('appointments')
            .delete()
            .in('id', appointmentIds)
            .eq('status', 'CANCELLED')

        if (currentUser.role !== 'SUPER_ADMIN') {
            query = query.eq('clinic_id', effectiveClinicId)
        }

        const { data, error } = await query.select('id')

        if (error) {
            console.error('[BATCH_DELETE_CANCELLED] Error:', error)
            return NextResponse.json({ error: 'Erro ao excluir agendamentos: ' + error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            deletedCount: data?.length || 0,
            message: `${data?.length || 0} agendamento(s) cancelado(s) removido(s) com sucesso`
        })
    } catch (error) {
        return handleApiError(error)
    }
}
