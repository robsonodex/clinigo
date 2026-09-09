// app/api/device/checkin/start/route.ts
// Inicio do fluxo de captura no tablet (gera token efemero de 3 minutos)

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * POST /api/device/checkin/start
 * Body: { appointment_id: string }
 * Header: 'x-clinigo-device-token'
 * Gera token efemero de captura com validade estrita de 3 minutos (status pending)
 */
export async function POST(request: NextRequest) {
    try {
        const deviceToken = request.headers.get('x-clinigo-device-token')?.trim()

        if (!deviceToken) {
            return NextResponse.json({ error: 'Token de dispositivo ausente' }, { status: 401 })
        }

        const body = await request.json()
        const { appointment_id } = body

        if (!appointment_id) {
            return NextResponse.json({ error: 'appointment_id e obrigatorio' }, { status: 400 })
        }

        const adminDb = createServiceRoleClient()

        // 1. Validar dispositivo ativo
        const { data: device, error: devError } = await (adminDb as any)
            .from('clinic_devices')
            .select('id, clinic_id, room_label, status')
            .eq('device_token', deviceToken)
            .eq('status', 'active')
            .maybeSingle()

        if (devError || !device) {
            return NextResponse.json({ error: 'Dispositivo nao autorizado' }, { status: 401 })
        }

        // 2. Buscar e validar agendamento pertencente a mesma clinica
        const { data: appointment, error: apptError } = await (adminDb as any)
            .from('appointments')
            .select('id, clinic_id, patient_id, appointment_time, patient:patients(id, full_name)')
            .eq('id', appointment_id)
            .eq('clinic_id', device.clinic_id)
            .maybeSingle()

        if (apptError || !appointment) {
            return NextResponse.json({ error: 'Agendamento nao encontrado' }, { status: 404 })
        }

        const rawFullName = (appointment.patient?.full_name || 'Paciente').trim()
        const firstName = rawFullName.split(/\s+/)[0] || 'Paciente'

        // 3. Gerar token de captura efêmero (18 bytes url-safe base64)
        const captureToken = crypto.randomBytes(18).toString('base64url')
        const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString() // 3 minutos

        const { data: tokenRecord, error: tokenError } = await (adminDb as any)
            .from('checkin_capture_tokens')
            .insert({
                token: captureToken,
                clinic_id: device.clinic_id,
                device_id: device.id,
                appointment_id: appointment.id,
                patient_id: appointment.patient_id,
                created_by: null, // iniciado pelo tablet
                status: 'pending',
                expires_at: expiresAt,
            })
            .select('id, token, expires_at')
            .single()

        if (tokenError) {
            console.error('[Checkin Start] Erro ao criar token de captura:', tokenError)
            return NextResponse.json({ error: 'Erro ao inicializar captura biométrica' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            capture_token: tokenRecord.token,
            expires_at: tokenRecord.expires_at,
            patient_first_name: firstName,
            appointment_id: appointment.id,
            patient_id: appointment.patient_id,
        })
    } catch (error: any) {
        console.error('[Checkin Start] Erro interno:', error)
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
    }
}
