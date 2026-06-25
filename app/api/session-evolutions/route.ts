import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

                if (overrideActive) {
                    // Mostra evoluções próprias + evoluções dos pacientes liberados
                    const patientFilter = overridePatients.map(pid => `patient_id.eq.${pid}`).join(',')
                    query = query.or(`doctor_id.eq.${doctorData.id},${patientFilter}`)
                } else {
                    query = query.eq('doctor_id', doctorData.id)
                }
                // ── FIM DO OVERRIDE TEMPORÁRIO ────────────────────────────────
            } else {
                // Terapeuta sem registro de doctor — retorna vazio por segurança
                return NextResponse.json({ data: [] })
            }
        }

        if (patientId) query = query.eq('patient_id', patientId)
        if (appointmentId) query = query.eq('appointment_id', appointmentId)

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
        }

        const { data, error } = await supabase
            .from('session_evolutions')
            .insert({ ...cleanBody, clinic_id: userData.clinic_id, created_by: user.id })
            .select()
            .single()

        if (error) {
            console.error('POST session-evolutions DB error:', error)
            throw error
        }
        return NextResponse.json({ data }, { status: 201 })
    } catch (error: any) {
        console.error('POST session-evolutions error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
