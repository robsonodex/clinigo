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

        const { data: userData } = await supabase.from('users').select('clinic_id').eq('id', user.id).single()
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

        if (patientId) query = query.eq('patient_id', patientId)
        if (appointmentId) query = query.eq('appointment_id', appointmentId)

        const { data, error } = await query
        if (error) throw error

        return NextResponse.json({ data })
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

        const { data, error } = await supabase
            .from('session_evolutions')
            .insert({ ...cleanBody, clinic_id: userData.clinic_id })
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
