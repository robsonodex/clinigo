// app/api/appointments/[id]/push-checkin/route.ts
// Push Remoto: O computador da terapeuta aciona diretamente o tablet da sala

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { sendRealtimeBroadcast } from '@/lib/realtime/broadcast'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * POST /api/appointments/:id/push-checkin
 * Body: { device_id: string }
 * Cria capture_token associado ao agendamento e dispara broadcast para o tablet
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: appointmentId } = await params
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
        }

        const { data: currentUser } = await (supabase as any)
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        if (!currentUser?.clinic_id) {
            return NextResponse.json({ error: 'Clinica nao vinculada' }, { status: 403 })
        }

        const body = await request.json()
        const { device_id } = body

        if (!device_id) {
            return NextResponse.json({ error: 'device_id e obrigatorio' }, { status: 400 })
        }

        const adminDb = createServiceRoleClient()

        // 1. Validar agendamento
        const { data: appointment, error: apptError } = await (adminDb as any)
            .from('appointments')
            .select('id, clinic_id, patient_id, appointment_time, patient:patients(id, full_name)')
            .eq('id', appointmentId)
            .eq('clinic_id', currentUser.clinic_id)
            .single()

        if (apptError || !appointment) {
            return NextResponse.json({ error: 'Agendamento nao encontrado' }, { status: 404 })
        }

        // 2. Validar dispositivo na mesma clinica
        const { data: device, error: devError } = await (adminDb as any)
            .from('clinic_devices')
            .select('id, room_label, status')
            .eq('id', device_id)
            .eq('clinic_id', currentUser.clinic_id)
            .eq('status', 'active')
            .single()

        if (devError || !device) {
            return NextResponse.json({ error: 'Dispositivo nao ativo ou nao pertence a esta clinica' }, { status: 404 })
        }

        // 3. Gerar token de captura efemero (3 minutos)
        const captureToken = crypto.randomBytes(18).toString('base64url')
        const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString()
        const rawFullName = (appointment.patient?.full_name || 'Paciente').trim()
        const patientFirstName = rawFullName.split(/\s+/)[0] || 'Paciente'

        const { data: tokenRecord, error: tokenError } = await (adminDb as any)
            .from('checkin_capture_tokens')
            .insert({
                token: captureToken,
                clinic_id: currentUser.clinic_id,
                device_id: device.id,
                appointment_id: appointment.id,
                patient_id: appointment.patient_id,
                created_by: user.id, // iniciado pela terapeuta autenticada
                status: 'pending',
                expires_at: expiresAt,
            })
            .select('id, token, expires_at')
            .single()

        if (tokenError) {
            console.error('[Push Checkin] Erro ao criar token:', tokenError)
            return NextResponse.json({ error: 'Erro ao registrar token de captura' }, { status: 500 })
        }

        // 4. Publicar broadcast no canal device:{device_id}
        await sendRealtimeBroadcast(
            `device:${device.id}`,
            'start_checkin',
            {
                type: 'start_checkin',
                capture_token: tokenRecord.token,
                appointment_id: appointment.id,
                patient_first_name: patientFirstName,
                expires_at: tokenRecord.expires_at,
            }
        )

        return NextResponse.json({
            success: true,
            capture_token: tokenRecord.token,
            expires_at: tokenRecord.expires_at,
            room_label: device.room_label,
            message: `Check-in enviado para o tablet da ${device.room_label}`,
        })
    } catch (error: any) {
        console.error('[Push Checkin] Erro interno:', error)
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
    }
}
