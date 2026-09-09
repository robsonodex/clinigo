// app/api/checkin/[token]/manual-confirm/route.ts
// Fallback (b): Confirmacao Manual pelo Terapeuta no Computador (com justificativa obrigatoria)

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { sendRealtimeBroadcast } from '@/lib/realtime/broadcast'

export const dynamic = 'force-dynamic'

/**
 * POST /api/checkin/:token/manual-confirm
 * Body: { reason: string }
 * Exclusivo para sessao autenticada do terapeuta/medico
 * Motivo 'reason' e estritamente obrigatorio (400 se vazio)
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token: captureToken } = await params
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Nao autorizado. A confirmacao manual deve ser realizada no computador autenticado.' }, { status: 401 })
        }

        const body = await request.json()
        const reason = (body.reason || '').trim()

        if (!reason || reason.length < 3) {
            return NextResponse.json({
                success: false,
                error: 'A justificativa do motivo de confirmacao sem biometria e estritamente obrigatoria (minimo 3 caracteres).'
            }, { status: 400 })
        }

        const adminDb = createServiceRoleClient()

        // 1. Validar token
        const { data: tokenRecord, error: tokenError } = await (adminDb as any)
            .from('checkin_capture_tokens')
            .select('id, token, clinic_id, device_id, appointment_id, patient_id, status')
            .eq('token', captureToken)
            .maybeSingle()

        if (tokenError || !tokenRecord) {
            return NextResponse.json({ success: false, error: 'Token invalido' }, { status: 404 })
        }

        if (tokenRecord.status !== 'pending' && tokenRecord.status !== 'escalated') {
            return NextResponse.json({
                success: false,
                error: `Token ja finalizado anteriormente (status: ${tokenRecord.status})`
            }, { status: 409 })
        }

        const confirmedAt = new Date().toISOString()

        // 2. Atualizar token efemero
        await (adminDb as any)
            .from('checkin_capture_tokens')
            .update({
                status: 'manual',
                confirmation_method: 'manual',
                confirmed_by_user_id: user.id,
                reason,
                confirmed_at: confirmedAt,
            })
            .eq('id', tokenRecord.id)

        // 3. Gravar log imutavel de auditoria LGPD
        await (adminDb as any)
            .from('patient_checkin_events')
            .insert({
                clinic_id: tokenRecord.clinic_id,
                appointment_id: tokenRecord.appointment_id,
                patient_id: tokenRecord.patient_id,
                device_id: tokenRecord.device_id,
                method: 'manual',
                confirmed_by_user_id: user.id,
                reason,
                created_at: confirmedAt,
            })

        // 4. Atualizar agendamento
        await (adminDb as any)
            .from('appointments')
            .update({
                checkin_confirmed_at: confirmedAt,
                checkin_method: 'manual',
                doctor_checked_in_at: confirmedAt,
                session_status: 'Presente',
                verification_level: 'DOCTOR_ONLY',
            })
            .eq('id', tokenRecord.appointment_id)

        // 5. Broadcast em appointment:{appointment_id}
        await sendRealtimeBroadcast(
            `appointment:${tokenRecord.appointment_id}`,
            'checkin_confirmed',
            {
                type: 'checkin_confirmed',
                method: 'manual',
                confirmed_at: confirmedAt,
                reason,
            }
        )

        return NextResponse.json({
            success: true,
            confirmed_at: confirmedAt,
            method: 'manual',
            message: 'Presenca confirmada manualmente com justificativa registrada.'
        })
    } catch (error: any) {
        console.error('[Checkin Manual Confirm] Erro interno:', error)
        return NextResponse.json({ success: false, error: 'Erro interno ao processar confirmacao manual' }, { status: 500 })
    }
}
