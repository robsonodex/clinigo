/**
 * CRM Pipeline API
 * GET /api/crm/pipeline - Returns patients grouped by funnel stage
 * PATCH /api/crm/pipeline - Execute stage action (mark appointment COMPLETED)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceClient() {
    return createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

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

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const userId = request.headers.get('x-user-id')
        const clinicId = request.headers.get('x-clinic-id')

        if (!userId || !clinicId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const doctorFilter = request.nextUrl.searchParams.get('doctor_id')

        // 1. Get all patients for this clinic
        const { data: patients, error: patientsError } = await supabase
            .from('patients')
            .select('id, full_name, phone, email, lead_source, created_at')
            .eq('clinic_id', clinicId)
            .order('full_name')

        if (patientsError) {
            return NextResponse.json({ error: patientsError.message }, { status: 500 })
        }

        if (!patients || patients.length === 0) {
            return NextResponse.json({
                pipeline: {
                    lead: [],
                    agendou: [],
                    compareceu: [],
                    retornou: [],
                    recorrente: [],
                },
                totals: { lead: 0, agendou: 0, compareceu: 0, retornou: 0, recorrente: 0 },
                total_patients: 0,
            })
        }

        // 2. Get appointment stats per patient
        let appointmentQuery = supabase
            .from('appointments')
            .select('patient_id, status, appointment_date, doctor:doctors(user:users(full_name))')
            .eq('clinic_id', clinicId)

        if (doctorFilter) {
            appointmentQuery = appointmentQuery.eq('doctor_id', doctorFilter)
        }

        const { data: appointments } = await appointmentQuery

        // 3. Get financial data per patient for LTV
        const { data: financials } = await supabase
            .from('financial_entries')
            .select('patient_id, amount')
            .eq('clinic_id', clinicId)
            .eq('type', 'INCOME')

        // 4. Build patient pipeline
        const patientMap = new Map<string, PipelinePatient>()

        for (const patient of patients) {
            const patientAppointments = appointments?.filter(a => a.patient_id === patient.id) || []
            const completedCount = patientAppointments.filter(a => a.status === 'COMPLETED').length
            const totalAppointments = patientAppointments.length

            const lastAppointment = patientAppointments
                .filter(a => a.status === 'COMPLETED')
                .sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())
                [0]

            const patientFinancials = financials?.filter(f => f.patient_id === patient.id) || []
            const ltv = patientFinancials.reduce((sum, f) => sum + (f.amount || 0), 0)

            const doctorName = lastAppointment?.doctor?.user?.full_name || 
                patientAppointments[0]?.doctor?.user?.full_name || null

            const stage = calculateStage(completedCount, totalAppointments)

            patientMap.set(patient.id, {
                id: patient.id,
                full_name: patient.full_name,
                phone: patient.phone,
                email: patient.email,
                lead_source: patient.lead_source,
                created_at: patient.created_at,
                completed_count: completedCount,
                total_appointments: totalAppointments,
                last_appointment: lastAppointment?.appointment_date || null,
                stage,
                doctor_name: doctorName as string | null,
                ltv,
            })
        }

        // 5. Group by stage
        const pipeline: Record<string, PipelinePatient[]> = {
            lead: [],
            agendou: [],
            compareceu: [],
            retornou: [],
            recorrente: [],
        }

        for (const patient of patientMap.values()) {
            if (pipeline[patient.stage]) {
                pipeline[patient.stage].push(patient)
            }
        }

        // Sort each stage by name
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
            total_patients: patients.length,
        })

    } catch (error: any) {
        console.error('CRM Pipeline error:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
}

/**
 * PATCH /api/crm/pipeline
 * Action when a card is dropped on a column.
 * Body: { patient_id, target_stage, clinic_id }
 *
 * target_stage actions:
 *   'lead'       → blocked (cannot undo completed appointments)
 *   'agendou'    → returns redirect URL to create appointment
 *   'compareceu' → marks most recent SCHEDULED/CONFIRMED appt as COMPLETED
 *   'retornou'   → same as compareceu
 *   'recorrente' → same as compareceu
 */
export async function PATCH(request: NextRequest) {
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

        const body = await request.json()
        const { patient_id, target_stage } = body

        if (!patient_id || !target_stage) {
            return NextResponse.json({ error: 'patient_id e target_stage são obrigatórios' }, { status: 400 })
        }

        const clinicId = userData.clinic_id
        const serviceClient = getServiceClient()

        // Verify patient belongs to clinic
        const { data: patient } = await serviceClient
            .from('patients')
            .select('id, full_name')
            .eq('id', patient_id)
            .eq('clinic_id', clinicId)
            .single()

        if (!patient) {
            return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
        }

        // LEAD: blocked
        if (target_stage === 'lead') {
            return NextResponse.json({
                success: false,
                action: 'blocked',
                message: 'Não é possível retornar ao estágio Lead. O estágio é calculado automaticamente com base nas consultas realizadas.',
            }, { status: 422 })
        }

        // AGENDOU: return redirect URL to create appointment
        if (target_stage === 'agendou') {
            return NextResponse.json({
                success: true,
                action: 'redirect',
                redirect_url: `/dashboard/agenda?patient_id=${patient_id}`,
                message: `Redirecionando para criar agendamento para ${patient.full_name}`,
            })
        }

        // COMPARECEU / RETORNOU / RECORRENTE: mark most recent pending appointment as COMPLETED
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

        // Mark as COMPLETED
        const { error: updateError } = await serviceClient
            .from('appointments')
            .update({ status: 'COMPLETED' })
            .eq('id', appt.id)

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        // Recalculate new stage
        const { data: allCompleted } = await serviceClient
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .eq('patient_id', patient_id)
            .eq('clinic_id', clinicId)
            .eq('status', 'COMPLETED')

        const newCompletedCount = (allCompleted as any)?.count ?? 1
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
        console.error('CRM Pipeline PATCH error:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
}
