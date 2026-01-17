/**
 * WhatsApp Share Helper
 * Gera URLs para compartilhamento manual via wa.me
 * Substitui APIs pagas por compartilhamento manual
 */

/**
 * Gera URL para compartilhar mensagem no WhatsApp
 * @param message - Texto da mensagem
 * @param phone - Número do destinatário (opcional, formato: 5511999999999)
 * @returns URL formatada para wa.me
 */
export function generateWhatsAppShareUrl(
    message: string,
    phone?: string
): string {
    const encodedMessage = encodeURIComponent(message);

    if (phone) {
        // Remove caracteres não numéricos
        const cleanPhone = phone.replace(/\D/g, '');
        return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    }

    // Sem número, abre seletor de contatos
    return `https://wa.me/?text=${encodedMessage}`;
}

/**
 * Formata número de telefone para padrão brasileiro
 */
export function formatPhoneForWhatsApp(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');

    // Se já tem 55, retorna limpo
    if (cleaned.startsWith('55') && cleaned.length >= 12) {
        return cleaned;
    }

    // Adiciona 55 se necessário
    if (cleaned.length === 10 || cleaned.length === 11) {
        return `55${cleaned}`;
    }

    return cleaned;
}

/**
 * Templates de mensagens padrão para compartilhamento
 */
export const whatsappTemplates = {
    appointmentConfirmation: (data: {
        patientName: string;
        doctorName: string;
        date: string;
        time: string;
        clinicName: string;
        portalUrl?: string;
    }) => `
Olá ${data.patientName}! ✅

Sua consulta foi confirmada:
👨‍⚕️ Médico: Dr(a). ${data.doctorName}
📅 Data: ${data.date}
🕐 Horário: ${data.time}
🏥 Clínica: ${data.clinicName}
${data.portalUrl ? `\nPara cancelar ou reagendar:\n${data.portalUrl}` : ''}
  `.trim(),

    appointmentReminder: (data: {
        patientName: string;
        doctorName: string;
        date: string;
        time: string;
        clinicName: string;
    }) => `
🔔 Lembrete de Consulta

Olá ${data.patientName}!

Sua consulta é AMANHÃ:
👨‍⚕️ Dr(a). ${data.doctorName}
📅 ${data.date}
🕐 ${data.time}
🏥 ${data.clinicName}

Não esqueça! Caso precise cancelar, avise com antecedência.
  `.trim(),

    appointmentCancellation: (data: {
        patientName: string;
        date: string;
        time: string;
        clinicName: string;
        reason?: string;
    }) => `
❌ Consulta Cancelada

Olá ${data.patientName},

Sua consulta agendada para:
📅 ${data.date} às ${data.time}
🏥 ${data.clinicName}

Foi cancelada${data.reason ? `: ${data.reason}` : '.'}

Entre em contato para reagendar.
  `.trim(),

    genericMessage: (message: string) => message.trim(),
};
