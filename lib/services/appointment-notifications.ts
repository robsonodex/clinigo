/**
 * Helper compartilhado para gravar e atualizar notificações de agendamento em `public.notification_queue`.
 * Evita gravações inválidas em `public.notifications` (tabela exclusiva do sino in-app de usuários).
 */

export type AppointmentQueueEventType = 'CANCELLATION' | 'CONFIRMATION'

export interface PatientQueueNotificationParams {
    clinicId: string
    appointmentId: string
    patientId?: string | null
    patientName?: string | null
    patientEmail?: string | null
    patientPhone?: string | null
    eventType: AppointmentQueueEventType
    subject: string
    templateId: string
    emailInitialStatus?: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED'
    metadata?: Record<string, unknown>
}

interface SupabaseLikeClient {
    from: (table: string) => any
}

export async function recordAppointmentPatientQueue(
    supabase: SupabaseLikeClient,
    params: PatientQueueNotificationParams
): Promise<{ emailQueueId: string | null }> {
    const nowIso = new Date().toISOString()
    const rows: Record<string, unknown>[] = []

    if (params.patientEmail) {
        rows.push({
            clinic_id: params.clinicId,
            appointment_id: params.appointmentId,
            patient_id: params.patientId ?? null,
            type: params.eventType,
            channel: 'email',
            scheduled_for: nowIso,
            recipient_email: params.patientEmail,
            recipient_name: params.patientName ?? null,
            template_id: params.templateId,
            template_data: {
                subject: params.subject,
                patient_name: params.patientName ?? undefined,
            },
            status: params.emailInitialStatus ?? 'PENDING',
            metadata: params.metadata ?? {},
        })
    }

    if (params.patientPhone) {
        rows.push({
            clinic_id: params.clinicId,
            appointment_id: params.appointmentId,
            patient_id: params.patientId ?? null,
            type: params.eventType,
            channel: 'whatsapp',
            scheduled_for: nowIso,
            recipient_phone: params.patientPhone,
            recipient_name: params.patientName ?? null,
            template_id: params.templateId,
            template_data: {
                patient_name: params.patientName ?? undefined,
            },
            // WhatsApp automático desativado: registrar como CANCELLED com flag manual_share para não disparar cron
            status: 'CANCELLED',
            error_message: 'Compartilhamento manual requerido',
            metadata: {
                ...(params.metadata ?? {}),
                manual_share: true,
            },
        })
    }

    if (rows.length === 0) {
        return { emailQueueId: null }
    }

    const { data, error } = await supabase
        .from('notification_queue')
        .insert(rows)
        .select('id, channel')

    if (error) {
        console.error('[NotificationQueue] Falha ao registrar notificações de agendamento:', error)
        return { emailQueueId: null }
    }

    const insertedList = Array.isArray(data) ? data : data ? [data] : []
    const emailRow = insertedList.find((row: { id?: string; channel?: string }) => row?.channel === 'email')
    return { emailQueueId: emailRow?.id ?? null }
}

export async function updateQueueEmailDeliveryStatus(
    supabase: SupabaseLikeClient,
    queueId: string | null | undefined,
    sent: boolean,
    errorMessage?: string
): Promise<void> {
    if (!queueId) return

    const nowIso = new Date().toISOString()
    const payload = sent
        ? { status: 'SENT', sent_at: nowIso, updated_at: nowIso }
        : { status: 'FAILED', error_message: errorMessage || 'Email send failed', updated_at: nowIso }

    const { error } = await supabase
        .from('notification_queue')
        .update(payload)
        .eq('id', queueId)

    if (error) {
        console.error('[NotificationQueue] Falha ao atualizar status de e-mail:', error)
    }
}

