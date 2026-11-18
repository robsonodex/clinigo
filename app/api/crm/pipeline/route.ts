import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
/**
 * CRM Pipeline API (Legado / Compatibilidade)
 * GET /api/crm/pipeline - Returns patients grouped by funnel stage via aggregated RPC
 * PATCH /api/crm/pipeline - Execute stage action (mark appointment COMPLETED)
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

interface PipelinePatient {
    id: string
    full_name: string
    phone: string | null
    email: string | null
    lead_source: string | null
    created_at: string
    completed_count: number
    total_appointments: number
    last_appointment: string | null
    stage: string
    doctor_name: string | null
    ltv: number
}

function calculateStage(completedCount: number, totalAppointments: number): string {
    if (completedCount === 0 && totalAppointments === 0) return 'lead'
    if (completedCount === 0 && totalAppointments > 0) return 'agendou'
    if (completedCount === 1) return 'compareceu'
    if (completedCount >= 2 && completedCount <= 4) return 'retornou'
    return 'recorrente'
}

export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let clinicId = request.headers.get('x-clinic-id')
        let userRole = request.headers.get('x-user-role')

        if (!clinicId || !userRole) {
            const { data: userData } = await supabase
                .from('users')
                .select('clinic_id, role')
                .eq('id', user.id)
                .single()

            clinicId = (userData as any)?.clinic_id
            userRole = (userData as any)?.role
        }

        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 })
        }

        if (userRole !== 'CLINIC_ADMIN' && userRole !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Acesso restrito ao administrador', code: 'FORBIDDEN' }, { status: 403 })
        }

        const doctorFilter = request.nextUrl.searchParams.get('doctor_id')
        const serviceClient = createServiceRoleClient()

        const { data: rows, error: rpcError } = await (serviceClient as any).rpc('get_crm_patient_metrics', {
            p_clinic_id: clinicId,
            p_doctor_id: doctorFilter || null,
        })

        if (rpcError) {
            return NextResponse.json({ error: rpcError.message }, { status: 500 })
        }

        const metrics = (rows || []) as any[]
        const pipeline: Record<string, PipelinePatient[]> = {
            lead: [],
            agendou: [],
            compareceu: [],
            retornou: [],
            recorrente: [],
        }

        for (const row of metrics) {
            const completedCount = Number(row.completed_count) || 0
            const totalAppointments = Number(row.total_appointments) || 0
            const stage = calculateStage(completedCount, totalAppointments)
            const item: PipelinePatient = {
                id: row.patient_id,
                full_name: row.full_name,
                phone: row.phone,
                email: row.email,
                lead_source: row.lead_source,
                created_at: row.created_at,
                completed_count: completedCount,
                total_appointments: totalAppointments,
                last_appointment: row.last_appointment || null,
                stage,
                doctor_name: row.doctor_name || null,
                ltv: Number(row.ltv) || 0,
            }
            if (pipeline[stage]) {
                pipeline[stage].push(item)
            }
        }

        for (const stage of Object.keys(pipeline)) {
            pipeline[stage].sort((a, b) => a.full_name.localeCompare(b.full_name))
        }

        const totals = {
            lead: pipeline.lead.length,
            agendou: pipeline.agendou.length,
            compareceu: pipeline.compareceu.length,
            retornou: pipeline.retornou.length,
            recorrente: pipeline.recorrente.length,
        }

        return NextResponse.json({
            pipeline,
            totals,
            total_patients: metrics.length,
        })

    } catch (error: any) {
        request.log.error('crm/pipeline', { error: error instanceof Error ? error.message : String(error) })
        console.error('CRM Pipeline error:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
})

export const PATCH = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!userData?.clinic_id) {
            return NextResponse.json({ error: 'Usuário sem clínica' }, { status: 401 })
        }

        if (userData.role !== 'CLINIC_ADMIN' && userData.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Acesso restrito ao administrador', code: 'FORBIDDEN' }, { status: 403 })
        }

        const body = await request.json()
        const { patient_id, target_stage } = body

        if (!patient_id || !target_stage) {
            return NextResponse.json({ error: 'patient_id e target_stage são obrigatórios' }, { status: 400 })
        }

        const clinicId = userData.clinic_id
        const serviceClient = createServiceRoleClient()

        const { data: patient } = await serviceClient
            .from('patients')
            .select('id, full_name')
            .eq('id', patient_id)
            .eq('clinic_id', clinicId)
            .single()

        if (!patient) {
            return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
        }

        if (target_stage === 'lead') {
            return NextResponse.json({
                success: false,
                action: 'blocked',
                message: 'Não é possível retornar ao estágio Lead. O estágio é calculado automaticamente com base nas consultas realizadas.',
            }, { status: 422 })
        }

        if (target_stage === 'agendou') {
            return NextResponse.json({
                success: true,
                action: 'redirect',
                redirect_url: `/dashboard/agenda?patient_id=${patient_id}`,
                message: `Redirecionando para criar agendamento para ${patient.full_name}`,
            })
        }

        const { data: appointments } = await serviceClient
            .from('appointments')
            .select('id, status, appointment_date, appointment_time')
            .eq('patient_id', patient_id)
            .eq('clinic_id', clinicId)
            .in('status', ['SCHEDULED', 'CONFIRMED', 'PENDING'])
            .order('appointment_date', { ascending: false })
            .order('appointment_time', { ascending: false })
            .limit(1)

        if (!appointments || appointments.length === 0) {
            return NextResponse.json({
                success: false,
                action: 'no_appointment',
                message: `${patient.full_name} não possui consultas pendentes para marcar como realizada. Crie um agendamento primeiro.`,
            }, { status: 422 })
        }

        const appt = appointments[0]

        const { error: updateError } = await serviceClient
            .from('appointments')
            .update({ status: 'COMPLETED' })
            .eq('id', appt.id)
            .eq('clinic_id', clinicId)

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        // Recalcular estágio de forma leve (basta saber até 5 consultas concluídas)
        const { data: completedRows } = await serviceClient
            .from('appointments')
            .select('id')
            .eq('patient_id', patient_id)
            .eq('clinic_id', clinicId)
            .eq('status', 'COMPLETED')
            .limit(6)

        const newCompletedCount = completedRows?.length ?? 1
        const newStage = newCompletedCount === 1 ? 'compareceu'
            : newCompletedCount <= 4 ? 'retornou'
            : 'recorrente'

        return NextResponse.json({
            success: true,
            action: 'completed',
            appointment_id: appt.id,
            patient_name: patient.full_name,
            new_stage: newStage,
            message: `Consulta de ${patient.full_name} marcada como realizada. Estágio atualizado para "${newStage}".`,
        })

    } catch (error: any) {
        request.log.error('crm/pipeline', { error: error instanceof Error ? error.message : String(error) })
        console.error('CRM Pipeline PATCH error:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
})
