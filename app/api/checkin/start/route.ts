// app/api/checkin/start/route.ts
// Centralizador de criacao de capture_tokens efemeros por superficie (staff_webcam, kiosk, patient_mobile)

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import { sendWhatsApp } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

/**
 * POST /api/checkin/start
 * Body: { appointment_id: string, surface?: 'staff_webcam' | 'kiosk' | 'patient_mobile', phone_override?: string }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { appointment_id, surface = 'staff_webcam', phone_override } = body

        if (!appointment_id) {
            return NextResponse.json({ success: false, error: 'appointment_id e obrigatorio' }, { status: 400 })
        }

        const adminDb = createServiceRoleClient()

        // =========================================================================
        // 1. SUPERFÍCIE: KIOSK (Tablet - autenticado por header de dispositivo)
        // =========================================================================
        if (surface === 'kiosk') {
            const deviceToken = request.headers.get('x-clinigo-device-token')?.trim()
            if (!deviceToken) {
                return NextResponse.json({ success: false, error: 'Token de dispositivo ausente' }, { status: 401 })
            }

            const { data: device, error: devError } = await (adminDb as any)
                .from('clinic_devices')
                .select('id, clinic_id, room_label, status')
                .eq('device_token', deviceToken)
                .eq('status', 'active')
                .maybeSingle()

            if (devError || !device) {
                return NextResponse.json({ success: false, error: 'Dispositivo nao autorizado' }, { status: 401 })
            }

            const { data: appointment, error: apptError } = await (adminDb as any)
                .from('appointments')
                .select('id, clinic_id, patient_id, appointment_time, patient:patients(id, full_name)')
                .eq('id', appointment_id)
                .eq('clinic_id', device.clinic_id)
                .maybeSingle()

            if (apptError || !appointment) {
                return NextResponse.json({ success: false, error: 'Agendamento nao encontrado' }, { status: 404 })
            }

            const rawFullName = (appointment.patient?.full_name || 'Paciente').trim()
            const firstName = rawFullName.split(/\s+/)[0] || 'Paciente'
            const captureToken = crypto.randomBytes(18).toString('base64url')
            const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString()

            const { data: tokenRecord, error: tokenError } = await (adminDb as any)
                .from('checkin_capture_tokens')
                .insert({
                    token: captureToken,
                    clinic_id: device.clinic_id,
                    device_id: device.id,
                    appointment_id: appointment.id,
                    patient_id: appointment.patient_id,
                    created_by: null,
                    surface: 'kiosk',
                    status: 'pending',
                    expires_at: expiresAt,
                })
                .select('id, token, expires_at')
                .single()

            if (tokenError) {
                console.error('[Checkin Start - Kiosk] Erro ao gravar token:', tokenError)
                return NextResponse.json({ success: false, error: 'Erro ao inicializar captura no tablet' }, { status: 500 })
            }

            return NextResponse.json({
                success: true,
                surface: 'kiosk',
                capture_token: tokenRecord.token,
                expires_at: tokenRecord.expires_at,
                patient_first_name: firstName,
                appointment_id: appointment.id,
                patient_id: appointment.patient_id,
            })
        }

        // =========================================================================
        // 2. SUPERFÍCIES AUTH (staff_webcam e patient_mobile)
        // Autenticado pela sessão do usuário logado (terapeuta / médico / admin)
        // =========================================================================
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
        }

        const { data: currentUser, error: userError } = await (adminDb as any)
            .from('users')
            .select('id, clinic_id, role')
            .eq('id', user.id)
            .single()

        if (userError || !currentUser?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Usuário ou clínica não identificados' }, { status: 403 })
        }

        // Buscar agendamento e verificar regras de acesso
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
            return NextResponse.json({ success: false, error: 'Agendamento não encontrado para esta clínica' }, { status: 404 })
        }

        const isAdminOrCoord = currentUser.role === 'CLINIC_ADMIN' || currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'COORDINATOR'
        const isAppointmentOwner = appointment.doctor?.user_id === user.id

        if (!isAdminOrCoord && !isAppointmentOwner) {
            return NextResponse.json({ success: false, error: 'Você só pode gerar check-in para seus próprios atendimentos' }, { status: 403 })
        }

        // Obter configurações da clínica
        const { data: clinicData } = await (adminDb as any)
            .from('clinics')
            .select('id, name, checkin_settings')
            .eq('id', currentUser.clinic_id)
            .single()

        const checkinSettings = clinicData?.checkin_settings || {}
        const enabledSurfaces: string[] = Array.isArray(checkinSettings.enabled_surfaces)
            ? checkinSettings.enabled_surfaces
            : ['staff_webcam', 'kiosk']

        if (!enabledSurfaces.includes(surface)) {
            return NextResponse.json({
                success: false,
                error: `A superfície de check-in "${surface}" está desativada nas configurações desta clínica.`
            }, { status: 403 })
        }

        const rawFullName = (appointment.patient?.full_name || 'Paciente').trim()
        const firstName = rawFullName.split(/\s+/)[0] || 'Paciente'
        const captureToken = crypto.randomBytes(18).toString('base64url')
        const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString() // 3 minutos

        // -------------------------------------------------------------------------
        // 2.1 SUPERFÍCIE: STAFF_WEBCAM (Webcam da própria terapeuta)
        // -------------------------------------------------------------------------
        if (surface === 'staff_webcam') {
            const { data: tokenRecord, error: tokenError } = await (adminDb as any)
                .from('checkin_capture_tokens')
                .insert({
                    token: captureToken,
                    clinic_id: currentUser.clinic_id,
                    device_id: null,
                    appointment_id: appointment.id,
                    patient_id: appointment.patient_id,
                    created_by: user.id,
                    surface: 'staff_webcam',
                    status: 'pending',
                    expires_at: expiresAt,
                })
                .select('id, token, expires_at')
                .single()

            if (tokenError) {
                console.error('[Checkin Start - StaffWebcam] Erro ao criar token:', tokenError)
                return NextResponse.json({ success: false, error: 'Erro ao inicializar captura na webcam' }, { status: 500 })
            }

            return NextResponse.json({
                success: true,
                surface: 'staff_webcam',
                capture_token: tokenRecord.token,
                expires_at: tokenRecord.expires_at,
                patient_first_name: firstName,
                appointment_id: appointment.id,
                patient_id: appointment.patient_id,
            })
        }

        // -------------------------------------------------------------------------
        // 2.2 SUPERFÍCIE: PATIENT_MOBILE (Link por WhatsApp/SMS de 3 minutos)
        // -------------------------------------------------------------------------
        if (surface === 'patient_mobile') {
            if (!checkinSettings.patient_mobile_checkin_enabled) {
                return NextResponse.json({
                    success: false,
                    error: 'O check-in por celular do paciente não está habilitado para esta clínica.'
                }, { status: 403 })
            }

            const targetPhone = (phone_override || appointment.patient?.mobile || appointment.patient?.phone || '').replace(/\D/g, '')
            if (!targetPhone || targetPhone.length < 10) {
                return NextResponse.json({
                    success: false,
                    error: 'Número de telefone do paciente inválido ou ausente para envio de link.'
                }, { status: 400 })
            }

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
                .select('id, token, expires_at')
                .single()

            if (tokenError) {
                console.error('[Checkin Start - PatientMobile] Erro ao criar token:', tokenError)
                return NextResponse.json({ success: false, error: 'Erro ao gerar link de check-in' }, { status: 500 })
            }

            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clinigo.app'
            const checkinUrl = `${baseUrl.replace(/\/$/, '')}/c/${captureToken}`

            // Disparo de mensagem via WhatsApp (sem expor token ao front da terapeuta)
            try {
                const messageText = `Olá ${firstName}! Acesse o link seguro a seguir para confirmar sua presença na clínica (válido por 3 minutos):\n\n${checkinUrl}\n\nAbra no navegador do celular para validar seu rosto de frente para a câmera.`
                const { sendWhatsAppMessage } = await import('@/lib/whatsapp/service')
                await sendWhatsAppMessage(currentUser.clinic_id, targetPhone, messageText, 'CHECKIN_MOBILE')
            } catch (notifyErr) {
                console.warn('[Checkin Start - PatientMobile] Falha ao enviar notificação WhatsApp:', notifyErr)
            }

            return NextResponse.json({
                success: true,
                surface: 'patient_mobile',
                message: `Link de presença enviado via WhatsApp para o telefone final ${targetPhone.slice(-4)}. O link expira em 3 minutos.`,
                expires_at: tokenRecord.expires_at,
            })
        }

        return NextResponse.json({ success: false, error: 'Superfície não suportada' }, { status: 400 })

    } catch (error: any) {
        console.error('[Checkin Start] Erro inesperado:', error)
        return NextResponse.json({ success: false, error: 'Erro interno no servidor' }, { status: 500 })
    }
}
