/**
 * POST /api/teleconsulta/consent - Salva consentimento de teleconsulta
 */
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const body = await request.json()

        const {
            appointment_id,
            patient_id,
            clinic_id,
            consent_topics,
            responsible_name,
            patient_name,
        } = body

        if (!appointment_id || !patient_id) {
            return NextResponse.json({ error: 'Dados obrigatórios faltando' }, { status: 400 })
        }

        const consentText = [
            'Teleatendimento: Paciente ciente de atendimento online',
            'Uso de imagem, voz e dados para fins assistenciais',
            'Proteção de dados conforme LGPD',
        ].join('; ')

        const { data, error } = await (supabase as any)
            .from('teleconsulta_consents')
            .insert({
                appointment_id,
                patient_id,
                clinic_id,
                consent_text: consentText,
                consent_version: '1.0',
                consent_topics,
                responsible_name,
                patient_name,
                accepted_at: new Date().toISOString(),
                ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
                user_agent: request.headers.get('user-agent') || 'unknown',
            })
            .select()
            .single()

        if (error) {
            console.error('Consent save error:', error)
            return NextResponse.json({ error: 'Erro ao salvar consentimento' }, { status: 500 })
        }

        return NextResponse.json({ consent: data })
    } catch (error) {
        console.error('Consent error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
