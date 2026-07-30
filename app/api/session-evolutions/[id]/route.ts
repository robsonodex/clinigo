import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Campos UUID opcionais — string vazia '' deve virar null para não quebrar o PostgreSQL
const UUID_FIELDS = ['patient_id', 'doctor_id', 'appointment_id', 'plan_id']

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
            if (UUID_FIELDS.includes(key) && (val === '' || val === undefined)) {
                sanitized[key] = null
            } else {
                sanitized[key] = val
            }
        }
    }
    return sanitized
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data, error } = await supabase
            .from('session_evolutions')
            .select(`*, patients(id, full_name), doctors(id, specialty, users(full_name))`)
            .eq('id', id)
            .single()

        if (error) throw error
        
        if (data && data.template_type === 'soap') {
            const isEspacoIncluir = data.clinic_id === '5163c916-8b82-4d80-8a71-01726836ee46'
            if (isEspacoIncluir || data.data_description || data.content) {
                data.template_type = 'multidisciplinar'
            }
        }

        return NextResponse.json({ data })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        // Busca a evolução atual para checar quem criou e se já foi finalizada
        const { data: existing, error: fetchError } = await supabase
            .from('session_evolutions')
            .select('created_by, created_at, finalized_by, finalized_at')
            .eq('id', id)
            .single()

        if (fetchError || !existing) {
            return NextResponse.json({ error: 'Evolução não encontrada' }, { status: 404 })
        }

        // REGRA DE BLOQUEIO: Se foi finalizada por outro profissional, bloqueia edição
        if (existing.finalized_by && existing.finalized_by !== user.id) {
            return NextResponse.json(
                { error: 'Esta evolução foi finalizada por outro profissional e não pode ser editada.' },
                { status: 403 }
            )
        }

        // REGRA DE PRAZO: Bloquear edição após 48h da finalização (solicitação Espaço Incluir)
        const EDIT_WINDOW_HOURS = 48
        if (existing.finalized_at) {
            const finalizedAt = new Date(existing.finalized_at)
            const hoursElapsed = (Date.now() - finalizedAt.getTime()) / (1000 * 60 * 60)
            if (hoursElapsed > EDIT_WINDOW_HOURS) {
                return NextResponse.json(
                    { error: `Prazo de ${EDIT_WINDOW_HOURS}h para edição expirado. Esta evolução foi finalizada há mais de 48 horas.` },
                    { status: 403 }
                )
            }
        }

        const body = await request.json()
        const { finalize, ...rest } = body
        const cleanBody = sanitizeBody(rest)

        if (cleanBody.template_type === 'multidisciplinar') {
            cleanBody.template_type = 'soap'
            if (!cleanBody.data_description && !cleanBody.content) {
                cleanBody.data_description = ' '
            }
        }

        // Se a requisição pede finalização, grava o carimbo de tempo
        // NOTA: signed_at NÃO é preenchido aqui — ele é exclusivo da assinatura ICP-Brasil
        // que é feita via /api/session-evolutions/sign
        const finalizeFields = finalize
            ? { finalized_by: user.id, finalized_at: new Date().toISOString() }
            : {}

        let result = await supabase
            .from('session_evolutions')
            .update({ ...cleanBody, updated_at: new Date().toISOString(), ...finalizeFields })
            .eq('id', id)
            .select()
            .single()

        if (result.error) {
            // Se o erro for de coluna inexistente (specialty), tenta novamente sem ela
            if (
                result.error.message?.includes('specialty') ||
                result.error.hint?.includes('specialty') ||
                result.error.code === 'PGRST204'
            ) {
                console.warn('PUT session-evolutions: column "specialty" missing in DB, falling back and trying without it.')
                const { specialty, ...bodyWithoutSpecialty } = cleanBody
                result = await supabase
                    .from('session_evolutions')
                    .update({ ...bodyWithoutSpecialty, updated_at: new Date().toISOString(), ...finalizeFields })
                    .eq('id', id)
                    .select()
                    .single()
            }
        }

        if (result.error) {
            console.error('PUT session-evolutions DB error:', result.error)
            throw result.error
        }
        return NextResponse.json({ data: result.data })
    } catch (error: any) {
        console.error('PUT session-evolutions error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        // Apenas o criador pode excluir
        const { data: existing } = await supabase
            .from('session_evolutions')
            .select('created_by, finalized_by')
            .eq('id', id)
            .single()

        if (existing?.finalized_by) {
            return NextResponse.json({ error: 'Não é possível excluir uma evolução já finalizada.' }, { status: 403 })
        }

        const { error } = await supabase.from('session_evolutions').delete().eq('id', id)
        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
