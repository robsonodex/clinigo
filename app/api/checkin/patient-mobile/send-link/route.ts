// app/api/checkin/patient-mobile/send-link/route.ts
// Envio do link efêmero de check-in para o celular do paciente (3 minutos)
// SEM QR CODE — link direto via WhatsApp/SMS

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * POST /api/checkin/patient-mobile/send-link
 * Body: { appointment_id: string, phone_override?: string }
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
        }

        const adminDb = createServiceRoleClient()
        const { data: currentUser, error: userError } = await (adminDb as any)
            .from('users')
            .select('id, clinic_id, role')
            .eq('id', user.id)
            .single()

        if (userError || !currentUser?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Usuário ou clínica não identificados' }, { status: 403 })
        }

        const body = await request.json()
        const { appointment_id, phone_override } = body

        if (!appointment_id) {
            return NextResponse.json({ success: false, error: 'appointment_id é obrigatório' }, { status: 400 })
        }

        // 1. Validar flag da clínica
        const { data: clinicData } = await (adminDb as any)
            .from('clinics')
            .select('id, name, checkin_settings')
            .eq('id', currentUser.clinic_id)
            .single()

        const checkinSettings = clinicData?.checkin_settings || {}
        if (!checkinSettings.patient_mobile_checkin_enabled) {
            return NextResponse.json({
                success: false,
                error: 'O check-in por celular do paciente está desabilitado para esta clínica.'
            }, { status: 403 })
        }

        // 2. Buscar agendamento e paciente
        const { data: appointment, error: apptError } = await (adminDb as any)
            .from('appointments')
            .select(`
                id, clinic_id, patient_id, doctor_id,
                doctor:doctors!appointments_doctor_id_fkey(id, user_id),
                patient:patients(id, full_name, phone, mobile)
            `)
            .eq('id', appointment_id)
            .eq('clinic_id', currentUser.clinic_id)
            .single()

        if (apptError || !appointment) {
            return NextResponse.json({ success: false, error: 'Agendamento não encontrado' }, { status: 404 })
        }

        const targetPhone = (phone_override || appointment.patient?.mobile || appointment.patient?.phone || '').replace(/\D/g, '')
        if (!targetPhone || targetPhone.length < 10) {
            return NextResponse.json({
                success: false,
                error: 'Paciente não possui número de telefone válido cadastrado.'
            }, { status: 400 })
        }

        const rawFullName = (appointment.patient?.full_name || 'Paciente').trim()
        const firstName = rawFullName.split(/\s+/)[0] || 'Paciente'
        const captureToken = crypto.randomBytes(18).toString('base64url')
        const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString() // 3 minutos

        // 3. Gravar token com surface='patient_mobile'
        const { data: tokenRecord, error: tokenError } = await (adminDb as any)
            .from('checkin_capture_tokens')
            .insert({
                token: captureToken,
                clinic_id: currentUser.clinic_id,
                device_id: null,
                appointment_id: appointment.id,
                patient_id: appointment.patient_id,
                created_by: user.id,
                surface: 'patient_mobile',
                patient_phone_snapshot: targetPhone,
                status: 'pending',
                expires_at: expiresAt,
            })
            .select('id, expires_at')
            .single()

        if (tokenError) {
            console.error('[Patient Mobile Send] Erro ao criar token:', tokenError)
            return NextResponse.json({ success: false, error: 'Erro ao gerar link de presença' }, { status: 500 })
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clinigo.app'
        const checkinUrl = `${baseUrl.replace(/\/$/, '')}/c/${captureToken}`

        // 4. Disparar notificação por WhatsApp
        try {
            const messageText = `Olá ${firstName}! Confirme sua presença na clínica através do link rápido a seguir (válido por 3 minutos):\n\n${checkinUrl}\n\nToque no link para validar seu rosto de frente para a câmera.`
            const { sendWhatsAppMessage } = await import('@/lib/whatsapp/service')
            await sendWhatsAppMessage(currentUser.clinic_id, targetPhone, messageText, 'CHECKIN_MOBILE')
        } catch (notifyErr) {
            console.warn('[Patient Mobile Send] Falha ao enviar WhatsApp:', notifyErr)
        }

        // NÃO retorna o captureToken no payload (segurança contra interceptação)
        return NextResponse.json({
            success: true,
            message: `Link de presença enviado com sucesso para o WhatsApp final ${targetPhone.slice(-4)}. O link é válido por 3 minutos.`,
            expires_at: tokenRecord.expires_at,
        })

    } catch (error: any) {
        console.error('[Patient Mobile Send] Erro inesperado:', error)
        return NextResponse.json({ success: false, error: 'Erro interno ao disparar link' }, { status: 500 })
    }
}
