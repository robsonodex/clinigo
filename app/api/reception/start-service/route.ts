import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/reception/start-service
 * Body: { appointmentId: string }
 * Changes appointment status from WAITING/CONFIRMED/CHECKED_IN → IN_PROGRESS (Idempotent)
 */
export const POST = withAxiom(async (request: AxiomRequest) => {
    try {
        const body = await request.json()
        const { appointmentId } = body

        if (!appointmentId) {
            return NextResponse.json({ error: 'appointmentId is required' }, { status: 400 })
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: currentUser } = await (supabase as any)
            .from('users').select('clinic_id').eq('id', user.id).single()
        if (!currentUser?.clinic_id) return NextResponse.json({ error: 'Clinic not found' }, { status: 403 })

        const adminDb = createServiceRoleClient()

        // 1. Tenta atualizar para IN_PROGRESS
        const { data: updatedAppointments, error: updateError } = await adminDb
            .from('appointments')
            .update({
                status: 'IN_PROGRESS',
                started_at: new Date().toISOString(),
            })
            .eq('id', appointmentId)
            .eq('clinic_id', currentUser.clinic_id)
            .in('status', ['WAITING', 'CONFIRMED', 'CHECKED_IN'])
            .select(`id, status, patient:patients(full_name)`)

        if (updateError) {
            console.error('[Start Service] Update error:', updateError)
            return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        if (updatedAppointments && updatedAppointments.length > 0) {
            const appointment = updatedAppointments[0]
            return NextResponse.json({
                success: true,
                appointment,
                message: `Atendimento de ${appointment?.patient?.full_name || ''} iniciado`,
            })
        }

        // 2. Idempotência: checa se já estava IN_PROGRESS
        const { data: existingAppt } = await adminDb
            .from('appointments')
            .select('id, status, patient:patients(full_name)')
            .eq('id', appointmentId)
            .eq('clinic_id', currentUser.clinic_id)
            .maybeSingle()

        if (existingAppt?.status === 'IN_PROGRESS') {
            return NextResponse.json({
                success: true,
                appointment: existingAppt,
                message: `Atendimento de ${existingAppt?.patient?.full_name || ''} já em andamento`,
            })
        }

        if (existingAppt) {
            return NextResponse.json({
                error: `Não é possível iniciar atendimento com status ${existingAppt.status}`,
            }, { status: 400 })
        }

        return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
    } catch (error) {
        request.log.error('reception/start-service', { error: error instanceof Error ? error.message : String(error) })
        console.error('[Start Service] Internal error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
})
