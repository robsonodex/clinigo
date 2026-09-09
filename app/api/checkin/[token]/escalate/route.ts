// app/api/checkin/[token]/escalate/route.ts
// Fallback (d): Escalonamento e Saida de Emergencia para a Recepcao

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendRealtimeBroadcast } from '@/lib/realtime/broadcast'

export const dynamic = 'force-dynamic'

/**
 * POST /api/checkin/:token/escalate
 * Aciona aviso de apoio na recepcao via canal reception:{clinic_id}
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token: captureToken } = await params
        const adminDb = createServiceRoleClient()

        // 1. Validar token
        const { data: tokenRecord, error: tokenError } = await (adminDb as any)
            .from('checkin_capture_tokens')
            .select(`
                id,
                token,
                clinic_id,
                device_id,
                appointment_id,
                patient_id,
                status,
                device:clinic_devices(room_label)
            `)
            .eq('token', captureToken)
            .maybeSingle()

        if (tokenError || !tokenRecord) {
            return NextResponse.json({ success: false, error: 'Token invalido' }, { status: 404 })
        }

        const roomLabel = tokenRecord.device?.room_label || 'Sala de Atendimento'

        // 2. Atualizar status do token
        await (adminDb as any)
            .from('checkin_capture_tokens')
            .update({ status: 'escalated' })
            .eq('id', tokenRecord.id)

        // 3. Emitir broadcast no canal reception:{clinic_id}
        await sendRealtimeBroadcast(
            `reception:${tokenRecord.clinic_id}`,
            'escalation_requested',
            {
                type: 'escalation_requested',
                appointment_id: tokenRecord.appointment_id,
                device_id: tokenRecord.device_id,
                room_label: roomLabel,
                patient_id: tokenRecord.patient_id,
                requested_at: new Date().toISOString(),
            }
        )

        return NextResponse.json({
            success: true,
            message: 'Apoio da recepcao solicitado com sucesso. Aguarde um instante.'
        })
    } catch (error: any) {
        console.error('[Checkin Escalate] Erro interno:', error)
        return NextResponse.json({ success: false, error: 'Erro ao acionar recepcao' }, { status: 500 })
    }
}
