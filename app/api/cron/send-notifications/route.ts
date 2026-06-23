/**
 * Cron Job: Process Pending Notifications
 * 
 * This route should be called periodically (e.g., every 5-15 minutes)
 * by Vercel Cron, GitHub Actions, or any external scheduler.
 * 
 * Vercel Cron config in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/send-notifications",
 *     "schedule": "0/15 * * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage, checkInstanceStatus } from '@/lib/whatsapp/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds max for cron

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET

interface NotificationItem {
    id: string
    type: string
    channel: string
    recipient_phone: string | null
    recipient_email: string | null
    recipient_name: string | null
    template_id: string | null
    template_data: Record<string, string | undefined>
    message_content: string | null
    appointment_id: string | null
    clinic_id: string
    metadata?: Record<string, string | undefined>
    appointment?: {
        id: string
        doctor?: {
            id: string
            user_id: string
        } | null
    } | null
}

export async function GET(request: NextRequest) {
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const startTime = Date.now()
    const results = {
        processed: 0,
        sent: 0,
        failed: 0,
        errors: [] as string[],
        duration_ms: 0,
    }

    try {
        const supabase = createServiceRoleClient()
        const now = new Date().toISOString()

        // 1. Fetch pending notifications
        const { data: pending, error: fetchError } = await supabase
            .from('notification_queue')
            .select(`
                *,
                appointment:appointments (
                    id,
                    doctor:doctors (
                        id,
                        user_id
                    )
                )
            `)
            .eq('status', 'PENDING')
            .lte('scheduled_for', now)
            .order('priority', { ascending: true })
            .order('scheduled_for', { ascending: true })
            .limit(50)

        if (fetchError) {
            console.error('[Cron] Error fetching notifications:', fetchError)
            return NextResponse.json({
                error: 'Failed to fetch notifications',
                details: fetchError.message,
            }, { status: 500 })
        }

        if (!pending || pending.length === 0) {
            return NextResponse.json({
                message: 'No pending notifications',
                ...results,
                duration_ms: Date.now() - startTime,
            })
        }

        console.log(`[Cron] Processing ${pending.length} notifications`)

        // 2. Process each notification
        for (const item of pending as NotificationItem[]) {
            results.processed++

            // Mark as processing
            await supabase
                .from('notification_queue')
                .update({ status: 'PROCESSING', updated_at: new Date().toISOString() })
                .eq('id', item.id)

            try {
                let sent = false
                const checkinUrl = item.metadata?.checkin_url || item.template_data?.checkin_url

                // 3. Send based on channel
                switch (item.channel) {
                    case 'whatsapp':
                        if (item.recipient_phone) {
                            sent = await sendWhatsAppNotification(item, checkinUrl)
                        }
                        break

                    case 'email':
                        if (item.recipient_email) {
                            sent = await sendEmailNotification(item, checkinUrl)
                        }
                        break

                    case 'sms':
                        if (item.recipient_phone) {
                            sent = await sendSmsNotification(item, checkinUrl)
                        }
                        break

                    default:
                        console.log(`[Cron] Unknown channel: ${item.channel}`)
                        sent = false
                }

                // 4. Update status
                if (sent) {
                    await supabase
                        .from('notification_queue')
                        .update({
                            status: 'SENT',
                            sent_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', item.id)
                    results.sent++
                } else {
                    await handleFailure(supabase, item.id, 'Send returned false')
                    results.failed++
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                console.error(`[Cron] Error sending notification ${item.id}:`, error)
                await handleFailure(supabase, item.id, errorMessage)
                results.failed++
                results.errors.push(`${item.id}: ${errorMessage}`)
            }
        }

        results.duration_ms = Date.now() - startTime
        console.log(`[Cron] Complete:`, results)

        return NextResponse.json({
            message: 'Notifications processed',
            ...results,
        })
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[Cron] Fatal error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: errorMessage,
            ...results,
            duration_ms: Date.now() - startTime,
        }, { status: 500 })
    }
}

// Helper: Handle notification failure with retry logic
async function handleFailure(supabase: ReturnType<typeof createServiceRoleClient>, notificationId: string, errorMessage: string) {
    const { data: notification } = await supabase
        .from('notification_queue')
        .select('retry_count, max_retries')
        .eq('id', notificationId)
        .single()

    const retryCount = (notification?.retry_count || 0) + 1
    const maxRetries = notification?.max_retries || 3

    if (retryCount >= maxRetries) {
        // Max retries reached, mark as failed
        await supabase
            .from('notification_queue')
            .update({
                status: 'FAILED',
                error_message: errorMessage,
                retry_count: retryCount,
                updated_at: new Date().toISOString(),
            })
            .eq('id', notificationId)
    } else {
        // Schedule for retry with exponential backoff
        const retryDelay = Math.pow(2, retryCount) * 5 * 60 * 1000 // 5min, 10min, 20min...
        const nextRetry = new Date(Date.now() + retryDelay)

        await supabase
            .from('notification_queue')
            .update({
                status: 'PENDING',
                error_message: errorMessage,
                retry_count: retryCount,
                scheduled_for: nextRetry.toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', notificationId)
    }
}

// Send WhatsApp notification via Evolution API service
async function sendWhatsAppNotification(item: NotificationItem, checkinUrl?: string): Promise<boolean> {
    const message = buildMessage(item, checkinUrl)

    if (!item.recipient_phone) {
        console.log(`[WhatsApp] Sem telefone para notificação ${item.id}`)
        return false
    }

    let sectorToSend = ''
    const doctorUserId = item.appointment?.doctor?.user_id
    if (doctorUserId) {
        try {
            const status = await checkInstanceStatus(item.clinic_id, doctorUserId)
            if (status.connected) {
                sectorToSend = doctorUserId
            }
        } catch (err) {
            console.error(`[WhatsApp Routing Cron] Erro para terapeuta ${doctorUserId}:`, err)
        }
    }

    if (!sectorToSend) {
        console.log(`[WhatsApp Routing Cron] Cancelando envio de notificação: terapeuta ${doctorUserId} não conectado.`)
        return false
    }

    try {
        await sendWhatsAppMessage(
            item.clinic_id,
            item.recipient_phone,
            message,
            `cron_${item.type}`,
            sectorToSend
        )
        console.log(`[WhatsApp] ✅ Enviado para ${item.recipient_phone} (${item.type}) via canal ${sectorToSend}`)
        return true
    } catch (error: any) {
        // Se não está conectado, não é erro fatal — é modo manual
        if (error.message?.includes('não conectado')) {
            console.log(`[WhatsApp] 📎 Sem conexão — modo manual para ${item.recipient_phone}`)
            return false
        }
        console.error(`[WhatsApp] ❌ Falha:`, error.message)
        return false
    }
}

// Send Email notification
async function sendEmailNotification(item: NotificationItem, checkinUrl?: string): Promise<boolean> {
    try {
        // TODO: Implement generic email sending
        // For now, just log the notification
        console.log(`[Email] Would send to ${item.recipient_email}:`, {
            subject: getEmailSubject(item.type),
            type: item.type,
            template_data: item.template_data,
            checkin_url: checkinUrl,
        })

        // Simulate success - TODO: implement actual email sending
        return true
    } catch (error) {
        console.error('[Email] Error:', error)
        return false
    }
}

// Send SMS notification - REMOVIDO
// SMS nunca foi implementado, era apenas mock
async function sendSmsNotification(item: NotificationItem, checkinUrl?: string): Promise<boolean> {
    console.log(`[SMS] Funcionalidade removida - era apenas mock`)
    console.log(`[SMS] Destinatário: ${item.recipient_phone}`)
    console.log(`[SMS] Use e-mail ou compartilhamento manual via WhatsApp`)
    return false
}

// Build message based on notification type
function buildMessage(item: NotificationItem, checkinUrl?: string): string {
    const patientName = item.recipient_name || item.template_data?.patient_name || 'Paciente'
    const doctorName = item.template_data?.doctor_name || 'seu médico'
    const appointmentDate = item.template_data?.appointment_date || ''
    const appointmentTime = item.template_data?.appointment_time || ''

    switch (item.type) {
        case 'PRE_CHECKIN_LINK':
            return `Olá ${patientName}! 👋\n\n` +
                `Sua consulta com ${doctorName} está chegando.\n\n` +
                `📅 Data: ${appointmentDate}\n` +
                `⏰ Horário: ${appointmentTime}\n\n` +
                `Agilize seu atendimento fazendo o pré-check-in:\n` +
                `👉 ${checkinUrl}\n\n` +
                `CliniGo - Cuidando de você! 💚`

        case 'REMINDER_24H':
            return `Lembrete: Sua consulta é amanhã às ${appointmentTime}! 📅\n\n` +
                `Médico(a): ${doctorName}\n\n` +
                `Já fez o pré-check-in?\n${checkinUrl}`

        case 'REMINDER_2H':
            return `⏰ Sua consulta é em 2 horas!\n\n` +
                `Médico(a): ${doctorName}\n` +
                `Horário: ${appointmentTime}\n\n` +
                `Não esqueça de fazer o check-in na recepção.`

        case 'QUEUE_CALLED':
            return `🔔 ${patientName}, você foi chamado(a)!\n\n` +
                `Por favor, dirija-se ao consultório de ${doctorName}.`

        case 'CONFIRMATION':
            return `✅ Agendamento confirmado!\n\n` +
                `Médico(a): ${doctorName}\n` +
                `Data: ${appointmentDate}\n` +
                `Horário: ${appointmentTime}\n\n` +
                `Enviaremos o link de pré-check-in antes da consulta.`

        default:
            return item.message_content || `Notificação do CliniGo: ${item.type}`
    }
}

// Get email subject based on type
function getEmailSubject(type: string): string {
    switch (type) {
        case 'PRE_CHECKIN_LINK':
            return '📋 Faça seu Pré-Check-in - CliniGo'
        case 'REMINDER_24H':
            return '⏰ Lembrete: Sua consulta é amanhã!'
        case 'REMINDER_2H':
            return '🔔 Sua consulta é em 2 horas!'
        case 'QUEUE_CALLED':
            return '📣 Você foi chamado(a)!'
        case 'CONFIRMATION':
            return '✅ Agendamento Confirmado - CliniGo'
        default:
            return 'Notificação - CliniGo'
    }
}

