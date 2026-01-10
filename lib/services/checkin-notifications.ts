/**
 * Serviço de Notificações para Check-in
 * Gerencia agendamento e envio de notificações de pré-check-in
 */

import { createClient } from '@/lib/supabase/client'
import { createServiceRoleClient } from '@/lib/supabase/server'

// Types
interface AppointmentData {
    id: string
    clinic_id: string
    patient_id?: string
    patient_name?: string
    patient_phone?: string
    patient_email?: string
    doctor_name?: string
    appointment_date: string
    appointment_time: string
}

interface NotificationResult {
    success: boolean
    notification_id?: string
    error?: string
}

// Constants
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://clinigo-saas.vercel.app'

/**
 * Generate unique check-in URL for a patient
 */
export function generateCheckinUrl(appointmentId: string, clinicId: string): string {
    return `${APP_URL}/public/checkin/${appointmentId}?clinic=${clinicId}`
}

/**
 * Schedule pre-check-in notification (24h before appointment)
 */
export async function schedulePreCheckinNotification(
    appointment: AppointmentData,
    hoursBeforeAppointment: number = 24
): Promise<NotificationResult> {
    try {
        const supabase = createClient()

        // Generate check-in URL
        const checkinUrl = generateCheckinUrl(appointment.id, appointment.clinic_id)

        // Calculate scheduled time
        const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
        const scheduledDate = new Date(appointmentDateTime)
        scheduledDate.setHours(scheduledDate.getHours() - hoursBeforeAppointment)

        // If scheduled time is in the past, schedule for now
        const now = new Date()
        if (scheduledDate < now) {
            scheduledDate.setTime(now.getTime() + 60000) // 1 minute from now
        }

        // Check if notification already exists
        const { data: existing } = await (supabase
            .from('notification_queue') as any)
            .select('id')
            .eq('appointment_id', appointment.id)
            .eq('type', 'PRE_CHECKIN_LINK')
            .eq('status', 'PENDING')
            .single()

        if (existing) {
            return {
                success: true,
                notification_id: existing.id,
                error: 'Notification already scheduled',
            }
        }

        // Insert notification
        const { data, error } = await (supabase
            .from('notification_queue') as any)
            .insert({
                appointment_id: appointment.id,
                clinic_id: appointment.clinic_id,
                patient_id: appointment.patient_id,
                type: 'PRE_CHECKIN_LINK',
                channel: 'whatsapp',
                scheduled_for: scheduledDate.toISOString(),
                recipient_phone: appointment.patient_phone,
                recipient_email: appointment.patient_email,
                recipient_name: appointment.patient_name,
                template_id: 'pre_checkin_link',
                template_data: {
                    patient_name: appointment.patient_name,
                    doctor_name: appointment.doctor_name,
                    appointment_date: appointment.appointment_date,
                    appointment_time: appointment.appointment_time,
                    checkin_url: checkinUrl,
                },
                priority: 3,
                metadata: {
                    checkin_url: checkinUrl,
                    hours_before: hoursBeforeAppointment,
                },
            })
            .select('id')
            .single()

        if (error) {
            console.error('[Checkin Notifications] Error scheduling:', error)
            return { success: false, error: error.message }
        }

        return { success: true, notification_id: data?.id }
    } catch (error: any) {
        console.error('[Checkin Notifications] Exception:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Schedule reminder notification (2h before appointment)
 */
export async function scheduleReminderNotification(
    appointment: AppointmentData
): Promise<NotificationResult> {
    try {
        const supabase = createClient()

        const checkinUrl = generateCheckinUrl(appointment.id, appointment.clinic_id)

        const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
        const scheduledDate = new Date(appointmentDateTime)
        scheduledDate.setHours(scheduledDate.getHours() - 2)

        const now = new Date()
        if (scheduledDate < now) {
            return { success: false, error: 'Appointment is too soon for reminder' }
        }

        const { data, error } = await (supabase
            .from('notification_queue') as any)
            .insert({
                appointment_id: appointment.id,
                clinic_id: appointment.clinic_id,
                patient_id: appointment.patient_id,
                type: 'REMINDER_2H',
                channel: 'whatsapp',
                scheduled_for: scheduledDate.toISOString(),
                recipient_phone: appointment.patient_phone,
                recipient_email: appointment.patient_email,
                recipient_name: appointment.patient_name,
                template_id: 'appointment_reminder',
                template_data: {
                    patient_name: appointment.patient_name,
                    doctor_name: appointment.doctor_name,
                    appointment_time: appointment.appointment_time,
                    checkin_url: checkinUrl,
                },
                priority: 2,
            })
            .select('id')
            .single()

        if (error) {
            return { success: false, error: error.message }
        }

        return { success: true, notification_id: data?.id }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * Schedule queue called notification (when patient is called)
 */
export async function sendQueueCalledNotification(
    appointment: AppointmentData,
    queuePosition: number
): Promise<NotificationResult> {
    try {
        const supabase = createClient()

        // This notification should be sent immediately
        const { data, error } = await (supabase
            .from('notification_queue') as any)
            .insert({
                appointment_id: appointment.id,
                clinic_id: appointment.clinic_id,
                patient_id: appointment.patient_id,
                type: 'QUEUE_CALLED',
                channel: 'whatsapp',
                scheduled_for: new Date().toISOString(), // Send now
                recipient_phone: appointment.patient_phone,
                recipient_name: appointment.patient_name,
                template_id: 'queue_called',
                template_data: {
                    patient_name: appointment.patient_name,
                    doctor_name: appointment.doctor_name,
                    queue_position: queuePosition,
                },
                priority: 1, // Highest priority
            })
            .select('id')
            .single()

        if (error) {
            return { success: false, error: error.message }
        }

        return { success: true, notification_id: data?.id }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * Cancel all pending notifications for an appointment
 */
export async function cancelAppointmentNotifications(
    appointmentId: string
): Promise<NotificationResult> {
    try {
        const supabase = createClient()

        const { error } = await (supabase
            .from('notification_queue') as any)
            .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
            .eq('appointment_id', appointmentId)
            .eq('status', 'PENDING')

        if (error) {
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * Process pending notifications (called by Cron job)
 * This function should be called by a Vercel Cron or similar
 */
export async function processPendingNotifications(limit: number = 50): Promise<{
    processed: number
    sent: number
    failed: number
    errors: string[]
}> {
    const result = { processed: 0, sent: 0, failed: 0, errors: [] as string[] }

    try {
        const supabase = createServiceRoleClient()

        // Get pending notifications using the database function
        const { data: notifications, error } = await supabase
            .rpc('get_pending_notifications', { p_limit: limit })

        if (error) {
            result.errors.push(`Failed to get notifications: ${error.message}`)
            return result
        }

        if (!notifications || notifications.length === 0) {
            return result
        }

        // Process each notification
        for (const notification of notifications) {
            result.processed++

            try {
                let sent = false

                // Send based on channel
                switch (notification.channel) {
                    case 'whatsapp':
                        // Use existing WhatsApp service
                        const { sendWhatsAppMessage } = await import('@/lib/services/whatsapp')
                        sent = await sendWhatsAppMessage(
                            notification.recipient_phone,
                            notification.template_id,
                            notification.template_data
                        )
                        break

                    case 'email':
                        // Use existing Email service
                        const { sendEmail } = await import('@/lib/services/email')
                        sent = await sendEmail({
                            to: notification.recipient_email,
                            template: notification.template_id,
                            data: notification.template_data,
                        })
                        break

                    default:
                        // Fallback: just log
                        console.log(`[Notification] Would send ${notification.type} to ${notification.recipient_phone || notification.recipient_email}`)
                        sent = true
                }

                if (sent) {
                    await supabase.rpc('mark_notification_sent', { p_notification_id: notification.id })
                    result.sent++
                } else {
                    await supabase.rpc('mark_notification_failed', {
                        p_notification_id: notification.id,
                        p_error_message: 'Send returned false',
                    })
                    result.failed++
                }
            } catch (err: any) {
                await supabase.rpc('mark_notification_failed', {
                    p_notification_id: notification.id,
                    p_error_message: err.message,
                })
                result.failed++
                result.errors.push(`Notification ${notification.id}: ${err.message}`)
            }
        }

        return result
    } catch (error: any) {
        result.errors.push(`Process error: ${error.message}`)
        return result
    }
}

/**
 * Get notification stats for a clinic
 */
export async function getNotificationStats(clinicId: string): Promise<{
    pending: number
    sent_today: number
    failed_today: number
}> {
    try {
        const supabase = createClient()
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const { data: pending } = await (supabase
            .from('notification_queue') as any)
            .select('id', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)
            .eq('status', 'PENDING')

        const { data: sentToday } = await (supabase
            .from('notification_queue') as any)
            .select('id', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)
            .eq('status', 'SENT')
            .gte('sent_at', today.toISOString())

        const { data: failedToday } = await (supabase
            .from('notification_queue') as any)
            .select('id', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)
            .eq('status', 'FAILED')
            .gte('updated_at', today.toISOString())

        return {
            pending: (pending as any)?.count || 0,
            sent_today: (sentToday as any)?.count || 0,
            failed_today: (failedToday as any)?.count || 0,
        }
    } catch (error) {
        return { pending: 0, sent_today: 0, failed_today: 0 }
    }
}

