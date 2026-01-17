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
 * WhatsApp - API removida, usar compartilhamento manual via wa.me
 * @deprecated Use WhatsAppShareButton component for manual sharing
 * @see lib/utils/whatsapp-share.ts for URL generation
 */
export async function sendWhatsApp(
    to: string,
    context: ReminderContext,
    type: 'REMINDER_24H' | 'REMINDER_2H' | 'REMINDER_15MIN'
) {
    // API WhatsApp removida - clínicas devem usar compartilhamento manual
    console.log(`[WhatsApp] API removida - compartilhamento manual necessário para: ${to}, tipo: ${type}`);
    console.log(`[WhatsApp] Paciente: ${context.patient?.full_name}, Consulta: ${context.appointment?.scheduled_at}`);

    // Retorna sucesso para não quebrar fluxos existentes
    // mas indica que compartilhamento manual é necessário
    return {
        success: false,
        reason: 'MANUAL_SHARING_REQUIRED',
        message: 'WhatsApp API removida. Use o botão de compartilhamento manual.'
    };
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
