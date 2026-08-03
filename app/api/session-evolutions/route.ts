import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Campos UUID opcionais — string vazia '' deve virar null para não quebrar o PostgreSQL
const UUID_FIELDS = ['patient_id', 'doctor_id', 'appointment_id', 'plan_id']

// Campos válidos da tabela session_evolutions (evita enviar lixo do form)
const ALLOWED_FIELDS = [
    'patient_id', 'doctor_id', 'appointment_id', 'plan_id',
    'evolution_date', 'template_type', 'specialty',
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

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: userData } = await supabase.from('users').select('clinic_id, role, is_coordinator').eq('id', user.id).single()
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
                // Solicitação: Jeferson (25/06/2026)
                // Motivo: Avaliação inicial — acesso ao histórico de evoluções
                // Pacientes: Leandro e Lilian Depieri Vieira
                // Terapeutas: Denise Farias, Beatriz Viveiros, Joyce Elaine
                // Expira: 20/07/2026 (25 dias)
                // TODO: Remover este bloco após 20/07/2026
                const EVOLUTION_ACCESS_OVERRIDES: Record<string, string[]> = {
                    // doctor_id → [patient_ids com acesso liberado]
                    '8d077aa2-c37a-4b7a-be53-3ccc5f7e8755': [ // Denise Farias (TO)
                        'a2afeeff-cccd-479c-ae9b-0cdd08bd2333', // Leandro Depieri Vieira
                        '69182652-9a4f-4c98-bcd0-b3aaf0071b70', // Lilian Depieri Vieira
                    ],
                    'd5a0ab1d-e943-4237-b70b-992038af4d69': [ // Beatriz Viveiros (Psicomotricista)
                        'a2afeeff-cccd-479c-ae9b-0cdd08bd2333',
                        '69182652-9a4f-4c98-bcd0-b3aaf0071b70',
                    ],
                    '4cdae0e2-579c-4469-91be-2dd57017c5bb': [ // Joyce Elaine (Musicoterapia)
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
                    // Mostra evoluções próprias + evoluções dos pacientes liberados
                    const patientFilter = overridePatients.map(pid => `patient_id.eq.${pid}`).join(',')
                    query = query.or(`doctor_id.eq.${doctorData.id},${patientFilter}`)
                } else {
                    query = query.eq('doctor_id', doctorData.id)
                }
                // ── FIM DOS OVERRIDES ─────────────────────────────────────────
            } else {
                // Terapeuta sem registro de doctor — retorna vazio por segurança
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
            const isEspacoIncluir = userData?.clinic_id === '5163c916-8b82-4d80-8a71-01726836ee46'
            if (ev.template_type === 'soap' && (isEspacoIncluir || ev.data_description || ev.content)) {
                return { ...ev, template_type: 'multidisciplinar' }
            }
            return ev
        })

        return NextResponse.json({ data: mappedData })
    } catch (error: any) {
        console.error('GET session-evolutions error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: userData } = await supabase.from('users').select('clinic_id').eq('id', user.id).single()
        if (!userData?.clinic_id) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })

        const body = await request.json()
        const cleanBody = sanitizeBody(body)

        if (cleanBody.template_type === 'multidisciplinar') {
            cleanBody.template_type = 'soap'
            if (!cleanBody.data_description && !cleanBody.content) {
                cleanBody.data_description = ' '
            }
        }

        // Prevenção de duplicatas inteligente:
        // Se houver appointment_id, verifica duplicata por agendamento específico.
        // Se não houver, verifica por paciente + profissional + data + especialidade.
        if (cleanBody.patient_id && cleanBody.doctor_id) {
            let dupQuery = supabase
                .from('session_evolutions')
                .select('id')
                .eq('clinic_id', userData.clinic_id)
                .eq('patient_id', cleanBody.patient_id)
                .eq('doctor_id', cleanBody.doctor_id)

            if (cleanBody.appointment_id) {
                dupQuery = dupQuery.eq('appointment_id', cleanBody.appointment_id)
            } else if (cleanBody.evolution_date) {
                dupQuery = dupQuery.eq('evolution_date', cleanBody.evolution_date)
                if (cleanBody.specialty) {
                    dupQuery = dupQuery.eq('specialty', cleanBody.specialty)
                }
            }

            const { data: existing } = await dupQuery.limit(1)

            if (existing && existing.length > 0) {
                return NextResponse.json(
                    { error: 'Já existe uma evolução registrada para este atendimento. Edite a evolução existente se desejar alterá-la.' },
                    { status: 409 }
                )
            }
        }

        let result = await supabase
            .from('session_evolutions')
            .insert({ ...cleanBody, clinic_id: userData.clinic_id, created_by: user.id })
            .select()
            .single()

        if (result.error) {
            // Se o erro for de coluna inexistente (specialty), tenta novamente sem ela
            if (
                result.error.message?.includes('specialty') ||
                result.error.hint?.includes('specialty') ||
                result.error.code === 'PGRST204'
            ) {
                console.warn('POST session-evolutions: column "specialty" missing in DB, falling back and trying without it.')
                const { specialty, ...bodyWithoutSpecialty } = cleanBody
                result = await supabase
                    .from('session_evolutions')
                    .insert({ ...bodyWithoutSpecialty, clinic_id: userData.clinic_id, created_by: user.id })
                    .select()
                    .single()
            }
        }

        if (result.error) {
            console.error('POST session-evolutions DB error:', result.error)
            throw result.error
        }
        return NextResponse.json({ data: result.data }, { status: 201 })
    } catch (error: any) {
        console.error('POST session-evolutions error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
