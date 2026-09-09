// app/api/checkin/[token]/confirm/route.ts
// Confirmacao Biometrica Facial via capture_token efemero

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { decryptFaceDescriptor, calculateFaceDistance } from '@/lib/utils/face-encryption'
import { sendRealtimeBroadcast } from '@/lib/realtime/broadcast'

export const dynamic = 'force-dynamic'

/**
 * POST /api/checkin/:token/confirm
 * Body: { descriptor: number[] }
 * Valida o descritor facial 1:1 contra patient_face_biometrics
 * Se aprovado, conclui o token de uso unico, audita em patient_checkin_events,
 * atualiza o agendamento e emite broadcast em appointment:{appointment_id}.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token: captureToken } = await params
        const adminDb = createServiceRoleClient()

        // 1. Buscar e validar token efemero
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
                expires_at
            `)
            .eq('token', captureToken)
            .maybeSingle()

        if (tokenError || !tokenRecord) {
            return NextResponse.json({ success: false, error: 'Token de captura invalido' }, { status: 404 })
        }

        // Validar se o token ja foi consumido
        if (tokenRecord.status !== 'pending') {
            return NextResponse.json({
                success: false,
                error: `Este check-in ja foi finalizado ou cancelado (status: ${tokenRecord.status})`
            }, { status: 409 })
        }

        // Validar expiracao estrita de 3 minutos
        const now = new Date()
        const expiresAt = new Date(tokenRecord.expires_at)
        if (now > expiresAt) {
            await (adminDb as any)
                .from('checkin_capture_tokens')
                .update({ status: 'expired' })
                .eq('id', tokenRecord.id)

            return NextResponse.json({
                success: false,
                error: 'Token expirado. A janela de 3 minutos encerrou.'
            }, { status: 410 })
        }

        const body = await request.json()
        const { descriptor } = body

        if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
            return NextResponse.json({
                success: false,
                error: 'Descritor facial invalido. Deve conter 128 dimensoes numericas.'
            }, { status: 400 })
        }

        const liveDescriptor = new Float32Array(descriptor)

        // 2. Buscar registros biometricos cadastrados do paciente e responsaveis
        const { data: records, error: fetchError } = await (adminDb as any)
            .from('patient_face_biometrics')
            .select('id, patient_id, clinic_id, person_type, person_name, face_descriptor_encrypted')
            .eq('patient_id', tokenRecord.patient_id)
            .eq('clinic_id', tokenRecord.clinic_id)

        if (fetchError) {
            console.error('[Checkin Confirm] Erro ao consultar biometria:', fetchError)
            return NextResponse.json({ success: false, error: 'Erro ao consultar cadastro biometrico' }, { status: 500 })
        }

        if (!records || records.length === 0) {
            return NextResponse.json({
                success: true,
                hasBiometrics: false,
                match: false,
                message: 'Paciente nao possui biometria facial cadastrada no sistema.'
            })
        }

        // 3. Comparacao por distancia euclidiana (Limiar 0.58 padrao de seguranca)
        const THRESHOLD = 0.58
        let bestMatch: {
            id: string
            person_type: string
            person_name: string | null
            distance: number
            confidence: number
        } | null = null

        for (const record of records) {
            if (!record.face_descriptor_encrypted) continue

            try {
                let storedDescriptor: Float32Array | null = null

                try {
                    storedDescriptor = decryptFaceDescriptor(record.face_descriptor_encrypted)
                } catch {
                    // Fallback para caso base64 json simples
                    const rawJson = Buffer.from(record.face_descriptor_encrypted, 'base64').toString('utf-8')
                    const parsed = JSON.parse(rawJson)
                    if (Array.isArray(parsed) && parsed.length === 128) {
                        storedDescriptor = new Float32Array(parsed)
                    }
                }

                if (!storedDescriptor || storedDescriptor.length !== 128) continue

                const distance = calculateFaceDistance(liveDescriptor, storedDescriptor)

                if (distance < THRESHOLD) {
                    const confidence = Math.max(50, Math.min(99, Math.round((1 - (distance / THRESHOLD)) * 50 + 50)))

                    if (!bestMatch || distance < bestMatch.distance) {
                        bestMatch = {
                            id: record.id,
                            person_type: record.person_type || 'patient',
                            person_name: record.person_name || null,
                            distance,
                            confidence
                        }
                    }
                }
            } catch (decErr) {
                console.warn('[Checkin Confirm] Falha ao decriptar registro:', record.id, decErr)
            }
        }

        // Se nao reconheceu: retorna match false mantendo o token pendente (permite retry dentro de 3min)
        if (!bestMatch) {
            return NextResponse.json({
                success: true,
                hasBiometrics: true,
                match: false,
                message: 'Rosto posicionado nao confere com os cadastros do paciente ou responsaveis.'
            })
        }

        const confirmedAt = new Date().toISOString()

        // 4. Se aprovado: atualizar token de captura de uso unico
        await (adminDb as any)
            .from('checkin_capture_tokens')
            .update({
                status: 'confirmed',
                confirmation_method: 'facial',
                confirmed_at: confirmedAt,
            })
            .eq('id', tokenRecord.id)

        // 5. Gravar registro imutavel de auditoria LGPD
        await (adminDb as any)
            .from('patient_checkin_events')
            .insert({
                clinic_id: tokenRecord.clinic_id,
                appointment_id: tokenRecord.appointment_id,
                patient_id: tokenRecord.patient_id,
                device_id: tokenRecord.device_id,
                method: 'facial',
                created_at: confirmedAt,
            })

        // 6. Atualizar agendamento
        await (adminDb as any)
            .from('appointments')
            .update({
                checkin_confirmed_at: confirmedAt,
                checkin_method: 'facial',
                status: 'WAITING',
                session_status: 'Presente',
                verification_level: 'FACIAL_DOCTOR',
            })
            .eq('id', tokenRecord.appointment_id)

        // 7. Disparar Realtime Broadcast no canal appointment:{appointment_id}
        await sendRealtimeBroadcast(
            `appointment:${tokenRecord.appointment_id}`,
            'checkin_confirmed',
            {
                type: 'checkin_confirmed',
                method: 'facial',
                confirmed_at: confirmedAt,
                person_name: bestMatch.person_name,
                person_type: bestMatch.person_type,
            }
        )

        return NextResponse.json({
            success: true,
            hasBiometrics: true,
            match: true,
            person_name: bestMatch.person_name,
            person_type: bestMatch.person_type,
            confidence: bestMatch.confidence,
            confirmed_at: confirmedAt,
            message: 'Identificacao facial confirmada com sucesso.'
        })
    } catch (error: any) {
        console.error('[Checkin Confirm] Erro interno:', error)
        return NextResponse.json({ success: false, error: 'Erro interno ao processar biometria' }, { status: 500 })
    }
}
