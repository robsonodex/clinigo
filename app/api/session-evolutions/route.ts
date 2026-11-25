import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getVerifiedUser } from '@/lib/auth/verify-token'

// Campos UUID opcionais — string vazia '' deve virar null para não quebrar o PostgreSQL
const UUID_FIELDS = ['patient_id', 'doctor_id', 'appointment_id', 'plan_id']

// Campos válidos da tabela session_evolutions (evita enviar lixo do form)
const ALLOWED_FIELDS = [
    'patient_id', 'doctor_id', 'appointment_id', 'plan_id',
    'evolution_date', 'template_type',
    'subjective', 'objective', 'assessment', 'plan_notes',
    'body_functions', 'activities_participation', 'environmental_factors',
    'data_description', 'analysis', 'plan_action',
    'content', 'patient_response', 'techniques_used', 'next_session_goals',
    'mood_rating', 'engagement_rating',
]

function sanitizeBody(body: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {}
    for (const key of ALLOWED_FIELDS) {
        if (key in body) {
            const val = body[key]
            // UUID vazio → null
            if (UUID_FIELDS.includes(key) && (val === '' || val === undefined)) {
                sanitized[key] = null
            } else {
                sanitized[key] = val
            }
        }
    }
    return sanitized
}

export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient()
        const { user } = await getVerifiedUser(supabase, request)
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        let { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role, is_coordinator')
            .eq('id', user.id)
            .maybeSingle()

        if (!userData?.clinic_id) {
            const admin = createServiceRoleClient()
            const { data: fallbackUser } = await admin
                .from('users')
                .select('clinic_id, role, is_coordinator')
                .eq('id', user.id)
                .maybeSingle()
            userData = fallbackUser
        }

        if (!userData?.clinic_id) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })

        const { searchParams } = new URL(request.url)
        const patientId = searchParams.get('patient_id')
        const appointmentId = searchParams.get('appointment_id')
        const startDate = searchParams.get('start_date')
        const endDate = searchParams.get('end_date')

        let query = supabase
            .from('session_evolutions')
            .select(`
                *,
                patients(id, full_name),
                doctors(id, specialty, users(full_name)),
                appointments(id, appointment_date, appointment_time)
            `)
            .eq('clinic_id', userData.clinic_id)
            .order('evolution_date', { ascending: false })
            .limit(200)

        // SIGILO: Terapeutas não-coordenadoras veem apenas suas próprias evoluções
        if (userData.role === 'DOCTOR' && !userData.is_coordinator) {
            const { data: doctorData } = await supabase
                .from('doctors')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (doctorData?.id) {
                // ── HERANÇA DE AGENDA (Espaço Incluir) ──────────────────────
                // Isabella e Cintia herdaram a agenda da Cristiane e precisam ver suas evoluções
                const HERDOU_AGENDA_DE: Record<string, string> = {
                    '084b2ba1-f8ba-4eac-9b50-6cd69701ba19': '401e9601-4fb3-4b33-8e1b-0f27617c80ab', // Isabella -> Cristiane
                    '93944585-f17f-4813-85a8-c12fde2a7ce0': '401e9601-4fb3-4b33-8e1b-0f27617c80ab', // Cintia -> Cristiane
                }
                const predecessorDoctorId = HERDOU_AGENDA_DE[doctorData.id]

                // ── OVERRIDE TEMPORÁRIO (Espaço Incluir) ──────────────────────
                const EVOLUTION_ACCESS_OVERRIDES: Record<string, string[]> = {
                    '8d077aa2-c37a-4b7a-be53-3ccc5f7e8755': [
                        'a2afeeff-cccd-479c-ae9b-0cdd08bd2333',
                        '69182652-9a4f-4c98-bcd0-b3aaf0071b70',
                    ],
                    'd5a0ab1d-e943-4237-b70b-992038af4d69': [
                        'a2afeeff-cccd-479c-ae9b-0cdd08bd2333',
                        '69182652-9a4f-4c98-bcd0-b3aaf0071b70',
                    ],
                    '4cdae0e2-579c-4469-91be-2dd57017c5bb': [
                        'a2afeeff-cccd-479c-ae9b-0cdd08bd2333',
                        '69182652-9a4f-4c98-bcd0-b3aaf0071b70',
                    ],
                }
                const OVERRIDE_EXPIRES = new Date('2026-07-20T23:59:59-03:00')

                const overridePatients = EVOLUTION_ACCESS_OVERRIDES[doctorData.id]
                const overrideActive = overridePatients && new Date() < OVERRIDE_EXPIRES

                if (predecessorDoctorId) {
                    if (overrideActive) {
                        const patientFilter = overridePatients.map(pid => `patient_id.eq.${pid}`).join(',')
                        query = query.or(`doctor_id.eq.${doctorData.id},doctor_id.eq.${predecessorDoctorId},${patientFilter}`)
                    } else {
                        query = query.or(`doctor_id.eq.${doctorData.id},doctor_id.eq.${predecessorDoctorId}`)
                    }
                } else if (overrideActive) {
                    const patientFilter = overridePatients.map(pid => `patient_id.eq.${pid}`).join(',')
                    query = query.or(`doctor_id.eq.${doctorData.id},${patientFilter}`)
                } else {
                    query = query.eq('doctor_id', doctorData.id)
                }
                // ── FIM DOS OVERRIDES ─────────────────────────────────────────
            } else {
                return NextResponse.json({ data: [] })
            }
        }

        if (patientId) query = query.eq('patient_id', patientId)
        if (appointmentId) query = query.eq('appointment_id', appointmentId)
        if (startDate) query = query.gte('evolution_date', startDate)
        if (endDate) query = query.lte('evolution_date', endDate)

        const { data, error } = await query
        if (error) throw error

        const mappedData = (data || []).map((ev: any) => {
            if (ev.template_type === 'soap' && (ev.data_description || ev.content)) {
                return { ...ev, template_type: 'multidisciplinar' }
            }
            return ev
        })

        return NextResponse.json({ data: mappedData })
    } catch (error: any) {
        request.log.error('session-evolutions', { error: error instanceof Error ? error.message : String(error) })
        console.error('GET session-evolutions error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
})

export const POST = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient()
        const { user } = await getVerifiedUser(supabase, request)
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        let { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .maybeSingle()

        if (!userData?.clinic_id) {
            const admin = createServiceRoleClient()
            const { data: fallbackUser } = await admin
                .from('users')
                .select('clinic_id')
                .eq('id', user.id)
                .maybeSingle()
            userData = fallbackUser
        }

        if (!userData?.clinic_id) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })

        const body = await request.json()
        const { finalize, ...rest } = body
        const cleanBody = sanitizeBody(rest)

        if (cleanBody.template_type === 'multidisciplinar') {
            cleanBody.template_type = 'soap'
        }

        // Prevenção de duplicatas: verificar se já existe evolução para o mesmo paciente + profissional + data
        if (cleanBody.patient_id && cleanBody.doctor_id && cleanBody.evolution_date) {
            const { data: existing } = await supabase
                .from('session_evolutions')
                .select('id')
                .eq('clinic_id', userData.clinic_id)
                .eq('patient_id', cleanBody.patient_id)
                .eq('doctor_id', cleanBody.doctor_id)
                .eq('evolution_date', cleanBody.evolution_date)
                .limit(1)

            if (existing && existing.length > 0) {
                return NextResponse.json(
                    { error: 'Já existe uma evolução registrada para este paciente, com este profissional, nesta data. Edite a evolução existente ou exclua-a antes de criar uma nova.' },
                    { status: 409 }
                )
            }
        }

        // Respeita finalização direta no POST (Assinatura Simples) — antes era ignorado no POST
        const finalizeFields = finalize
            ? { finalized_by: user.id, finalized_at: new Date().toISOString() }
            : {}

        const { data, error } = await supabase
            .from('session_evolutions')
            .insert({ ...cleanBody, ...finalizeFields, clinic_id: userData.clinic_id, created_by: user.id })
            .select()
            .single()

        if (error) {
            console.error('POST session-evolutions DB error:', error)
            throw error
        }
        return NextResponse.json({ data }, { status: 201 })
    } catch (error: any) {
        request.log.error('session-evolutions', { error: error instanceof Error ? error.message : String(error) })
        console.error('POST session-evolutions error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
})
