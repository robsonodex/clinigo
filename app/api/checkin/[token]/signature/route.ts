// app/api/checkin/[token]/signature/route.ts
// Fallback (c): Confirmacao por Assinatura Touch no Tablet

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendRealtimeBroadcast } from '@/lib/realtime/broadcast'

export const dynamic = 'force-dynamic'

/**
 * POST /api/checkin/:token/signature
 * Body: { signature_data_url: string }
 * Salva a rubrica, confirma o check-in e emite broadcast
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
            .select('id, token, clinic_id, device_id, appointment_id, patient_id, status, expires_at')
            .eq('token', captureToken)
            .maybeSingle()

        if (tokenError || !tokenRecord) {
            return NextResponse.json({ success: false, error: 'Token invalido' }, { status: 404 })
        }

        if (tokenRecord.status !== 'pending') {
            return NextResponse.json({
                success: false,
                error: `Token ja finalizado (status: ${tokenRecord.status})`
            }, { status: 409 })
        }

        const now = new Date()
        if (now > new Date(tokenRecord.expires_at)) {
            await (adminDb as any)
                .from('checkin_capture_tokens')
                .update({ status: 'expired' })
                .eq('id', tokenRecord.id)

            return NextResponse.json({ success: false, error: 'Token expirado' }, { status: 410 })
        }

        const body = await request.json()
        const { signature_data_url } = body

        if (!signature_data_url || typeof signature_data_url !== 'string') {
            return NextResponse.json({ success: false, error: 'Assinatura digital e obrigatoria' }, { status: 400 })
        }

        const confirmedAt = new Date().toISOString()
        let storedSignatureUrl = signature_data_url

        // Opcional: Upload para Supabase Storage se bucket 'signatures' existir
        try {
            if (signature_data_url.startsWith('data:image')) {
                const base64Data = signature_data_url.split(',')[1]
                if (base64Data) {
                    const buffer = Buffer.from(base64Data, 'base64')
                    const fileName = `${tokenRecord.clinic_id}/${tokenRecord.appointment_id}_${Date.now()}.png`
                    const { data: uploadData, error: uploadErr } = await adminDb.storage
                        .from('signatures')
                        .upload(fileName, buffer, {
                            contentType: 'image/png',
                            upsert: true
                        })

                    if (!uploadErr && uploadData?.path) {
                        const { data: publicUrlData } = adminDb.storage
                            .from('signatures')
                            .getPublicUrl(uploadData.path)
                        if (publicUrlData?.publicUrl) {
                            storedSignatureUrl = publicUrlData.publicUrl
                        }
                    }
                }
            }
        } catch (storageErr) {
            console.warn('[Checkin Signature] Armazenando data_url diretamente devido a:', storageErr)
        }

        // 2. Atualizar token efemero
        await (adminDb as any)
            .from('checkin_capture_tokens')
            .update({
                status: 'signature',
                confirmation_method: 'signature',
                confirmed_at: confirmedAt,
            })
            .eq('id', tokenRecord.id)

        // 3. Gravar auditoria LGPD
        await (adminDb as any)
            .from('patient_checkin_events')
            .insert({
                clinic_id: tokenRecord.clinic_id,
                appointment_id: tokenRecord.appointment_id,
                patient_id: tokenRecord.patient_id,
                device_id: tokenRecord.device_id,
                method: 'signature',
                signature_url: storedSignatureUrl,
                created_at: confirmedAt,
            })

        // 4. Atualizar agendamento
        await (adminDb as any)
            .from('appointments')
            .update({
                checkin_confirmed_at: confirmedAt,
                checkin_method: 'signature',
                status: 'WAITING',
                session_status: 'Presente',
            })
            .eq('id', tokenRecord.appointment_id)

        // 5. Broadcast em appointment:{appointment_id}
        await sendRealtimeBroadcast(
            `appointment:${tokenRecord.appointment_id}`,
            'checkin_confirmed',
            {
                type: 'checkin_confirmed',
                method: 'signature',
                confirmed_at: confirmedAt,
            }
        )

        return NextResponse.json({
            success: true,
            confirmed_at: confirmedAt,
            method: 'signature',
            message: 'Presenca confirmada via assinatura touch com sucesso.'
        })
    } catch (error: any) {
        console.error('[Checkin Signature] Erro interno:', error)
        return NextResponse.json({ success: false, error: 'Erro interno no processamento da assinatura' }, { status: 500 })
    }
}
