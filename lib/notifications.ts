import { sendMail } from '@/lib/services/mail-service'; // Direct simple mail
import { sendReminderEmail } from '@/lib/services/email'; // React-email structured

export const NotificationChannels = {
    EMAIL: 'EMAIL',
    WHATSAPP: 'WHATSAPP', // Legacy - agora usa compartilhamento manual
    SMS: 'SMS' // Removido - usar compartilhamento manual
};

export interface ReminderContext {
    appointment: any; // Using any to be flexible with the join query result
    clinic: any;
    patient: any;
    doctor: any;
}

/**
 * WhatsApp - envio automático via microserviço Baileys
 */
export async function sendWhatsApp(
    to: string,
    context: ReminderContext,
    type: 'REMINDER_24H' | 'REMINDER_2H' | 'REMINDER_15MIN'
) {
    const serviceUrl = process.env.WHATSAPP_SERVICE_URL
    const serviceSecret = process.env.WHATSAPP_INTERNAL_SECRET

    if (!serviceUrl || !serviceSecret) {
        console.log(`[WhatsApp] Serviço não configurado`)
        return { success: false, reason: 'SERVICE_NOT_CONFIGURED', message: 'Microserviço WhatsApp não configurado.' }
    }

    if (!to) {
        return { success: false, reason: 'NO_PHONE', message: 'Paciente sem telefone.' }
    }

    try {
        const patientName = context.patient?.full_name || 'Paciente'
        const doctorName = context.doctor?.full_name || 'Médico'
        const apptDate = context.appointment?.scheduled_at
            ? new Date(context.appointment.scheduled_at).toLocaleDateString('pt-BR')
            : ''
        const apptTime = context.appointment?.scheduled_at
            ? new Date(context.appointment.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : ''

        const typeLabel = type === 'REMINDER_24H' ? '24 horas'
            : type === 'REMINDER_2H' ? '2 horas' : '15 minutos'

        const message =
            `🔔 Lembrete de Consulta (${typeLabel})\n\n` +
            `Olá ${patientName}!\n` +
            `Sua consulta com Dr(a). ${doctorName} é em ${apptDate} às ${apptTime}.\n` +
            (context.appointment?.video_link ? `🔗 Link da teleconsulta: ${context.appointment.video_link}\n` : '') +
            `\n${context.clinic?.name || ''}`

        const cleanPhone = to.replace(/\D/g, '')
        const phone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`

        const res = await fetch(`${serviceUrl}/message/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-secret': serviceSecret,
            },
            body: JSON.stringify({
                clinicId: context.clinic?.id || context.appointment?.clinic_id,
                to: phone,
                message,
                triggerContext: `notification_${type.toLowerCase()}`,
            }),
        })

        if (res.ok) {
            return { success: true, message: 'Enviado via Baileys' }
        } else {
            const errBody = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
            return { success: false, reason: 'SEND_FAILED', message: errBody.error }
        }
    } catch (error: any) {
        console.error('[WhatsApp] Erro ao enviar:', error)
        return { success: false, reason: 'ERROR', message: error.message }
    }
}

/**
 * Adapter for Email sending
 */
export async function sendEmail(to: string, subject: string, html: string, context?: ReminderContext) {
    // If we have full context, we can use the pretty React Email templates
    if (context) {
        // Construct the object expected by sendReminderEmail
        const appointmentObj = {
            id: context.appointment.id,
            appointment_date: new Date(context.appointment.scheduled_at).toISOString(),
            appointment_time: new Date(context.appointment.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            patient: {
                email: context.patient.email,
                full_name: context.patient.full_name,
                phone: context.patient.phone
            },
            doctor: {
                full_name: context.doctor.full_name,
                specialty: context.doctor.specialty || 'Clínica Geral'
            },
            video_link: context.appointment.video_link
        };

        // Calculate hours approximation for the email text
        const hours = Math.round((new Date(context.appointment.scheduled_at).getTime() - Date.now()) / (1000 * 60 * 60));

        return await sendReminderEmail(appointmentObj, hours > 0 ? hours : 0);
    }

    // Fallback to basic HTML email
    return await sendMail({
        to,
        subject,
        html
    });
}

export async function sendSMS(to: string, message: string) {
    // Placeholder: SMS service not yet implemented
    console.log(`[SMS Mock] To: ${to}, Message: ${message}`);
    return { success: true };
}
