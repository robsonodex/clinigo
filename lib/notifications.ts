import { sendMail } from '@/lib/services/mail-service'; // Direct simple mail
import { sendReminderEmail } from '@/lib/services/email'; // React-email structured
import { sendWhatsAppMessage } from '@/lib/whatsapp/service';

export const NotificationChannels = {
    EMAIL: 'EMAIL',
    WHATSAPP: 'WHATSAPP',
    SMS: 'SMS'
};

export interface ReminderContext {
    appointment: any; // Using any to be flexible with the join query result
    clinic: any;
    patient: any;
    doctor: any;
}

/**
 * Envia mensagem WhatsApp via serviço centralizado multi-provedor.
 * Se a clínica não tiver provedor configurado, retorna fallback para wa.me.
 * 
 * @see lib/services/whatsapp-provider.ts
 */
export async function sendWhatsApp(
    to: string,
    context: ReminderContext,
    type: 'REMINDER_24H' | 'REMINDER_2H' | 'REMINDER_15MIN'
) {
    const clinicId = context.clinic?.id;
    if (!clinicId) {
        console.log(`[WhatsApp] Sem clinic_id — modo manual para: ${to}`);
        return { success: false, reason: 'NO_CLINIC_ID', message: 'Clínica não identificada' };
    }

    const patientName = context.patient?.full_name || 'Paciente';
    const doctorName = context.doctor?.full_name || 'seu médico';
    const appointmentDate = context.appointment?.scheduled_at
        ? new Date(context.appointment.scheduled_at).toLocaleDateString('pt-BR')
        : '';
    const appointmentTime = context.appointment?.scheduled_at
        ? new Date(context.appointment.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : '';

    let message = '';
    switch (type) {
        case 'REMINDER_24H':
            message = `🔔 *Lembrete de Consulta*\n\nOlá ${patientName}!\n\nSua consulta é AMANHÃ:\n📅 ${appointmentDate}\n🕐 ${appointmentTime}\n👨‍⚕️ Dr(a). ${doctorName}\n\nConfirme sua presença respondendo esta mensagem.`;
            break;
        case 'REMINDER_2H':
            message = `⏰ *Consulta em 2 horas!*\n\n${patientName}, sua consulta é daqui a pouco:\n🕐 ${appointmentTime}\n👨‍⚕️ Dr(a). ${doctorName}\n\nNão esqueça seus documentos!`;
            break;
        case 'REMINDER_15MIN':
            message = `🔔 *Consulta em 15 minutos!*\n\n${patientName}, sua consulta começa em breve:\n🕐 ${appointmentTime}\n\nPor favor, dirija-se à recepção.`;
            break;
    }

    try {
        await sendWhatsAppMessage(clinicId, to, message, `notification_${type}`);
        return { success: true, reason: 'SENT', message: 'Enviado com sucesso' };
    } catch (error: any) {
        if (error.message?.includes('não conectado')) {
            return { success: false, reason: 'MANUAL_SHARING_REQUIRED', message: error.message };
        }
        return { success: false, reason: 'SEND_FAILED', message: error.message || 'Falha no envio' };
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
