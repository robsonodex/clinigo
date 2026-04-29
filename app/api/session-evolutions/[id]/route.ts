import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Campos UUID opcionais — string vazia '' deve virar null para não quebrar o PostgreSQL
const UUID_FIELDS = ['patient_id', 'doctor_id', 'appointment_id', 'plan_id']

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

        const body = await request.json()
        const cleanBody = sanitizeBody(body)

        const { data, error } = await supabase
            .from('session_evolutions')
            .update({ ...cleanBody, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('PUT session-evolutions DB error:', error)
            throw error
        }
        return NextResponse.json({ data })
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

        const { error } = await supabase.from('session_evolutions').delete().eq('id', id)
        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

