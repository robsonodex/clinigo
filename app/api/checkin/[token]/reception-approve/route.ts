// app/api/checkin/[token]/reception-approve/route.ts
// Aprovacao do Check-in pela Equipe de Recepcao

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { sendRealtimeBroadcast } from '@/lib/realtime/broadcast'

export const dynamic = 'force-dynamic'

/**
 * POST /api/checkin/:token/reception-approve
 * Confirmacao administrativa pela recepcao
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
            return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
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

        const confirmedAt = new Date().toISOString()

        // 2. Atualizar token
        await (adminDb as any)
            .from('checkin_capture_tokens')
            .update({
                status: 'confirmed',
                confirmation_method: 'reception',
                confirmed_by_user_id: user.id,
                confirmed_at: confirmedAt,
            })
            .eq('id', tokenRecord.id)

        // 3. Auditoria LGPD
        await (adminDb as any)
            .from('patient_checkin_events')
            .insert({
                clinic_id: tokenRecord.clinic_id,
                appointment_id: tokenRecord.appointment_id,
                patient_id: tokenRecord.patient_id,
                device_id: tokenRecord.device_id,
                method: 'reception',
                confirmed_by_user_id: user.id,
                created_at: confirmedAt,
            })

        // 4. Atualizar agendamento
        await (adminDb as any)
            .from('appointments')
            .update({
                checkin_confirmed_at: confirmedAt,
                checkin_method: 'reception',
                session_status: 'Presente',
            })
            .eq('id', tokenRecord.appointment_id)

        // 5. Broadcast
        await sendRealtimeBroadcast(
            `appointment:${tokenRecord.appointment_id}`,
            'checkin_confirmed',
            {
                type: 'checkin_confirmed',
                method: 'reception',
                confirmed_at: confirmedAt,
            }
        )

        return NextResponse.json({
            success: true,
            confirmed_at: confirmedAt,
            method: 'reception',
            message: 'Check-in aprovado pela recepcao.'
        })
    } catch (error: any) {
        console.error('[Reception Approve] Erro interno:', error)
        return NextResponse.json({ success: false, error: 'Erro interno ao aprovar check-in' }, { status: 500 })
    }
}
